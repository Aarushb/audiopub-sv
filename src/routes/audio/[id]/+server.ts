/*
 * This file is part of the audiopub project.
 *
 * Copyright (C) 2024 the-byte-bender
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */
import fs from "fs/promises";
import { dev } from "$app/environment";
import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import Mime from "mime-types";
import { Audio } from "$lib/server/database";

// WARNING! WARNING! WARNING!
// This endpoint should never ever ever ever ever be modified to let it be used in production.
// Not in a million years. Not if you're the last developer on Earth. Not even if aliens threaten to destroy the planet unless you do.
// Instead, PLEASE just configure your reverse proxy to host your audio directory under /audio.
// This endpoint exists SOLELY for local dev runs where a reverse proxy is not practical.
// If you modify this to make it run in production instead of a reverse proxy, you're practically begging for a disaster.
// The ghost of Alan Turing will haunt your dreams, whispering "Why? Why did you do this?" for all eternity.
// So please, I'm begging you, with tears in my eyes and trembling fingers on the keyboard: DO NOT USE THIS IN PRODUCTION.
export const GET: RequestHandler = async (event) => {
  if (!dev) {
    return error(403, "forbidden");
  }
  let id = event.params.id;
  // serve ./audio/{id} if exists, as octet stream.
  if (id.startsWith(".") || id.includes("/")) {
    return error(400, "Invalid id");
  }
  const path = `./audio/${id}`;
  try {
    const file = await fs.readFile(path);

    // The transcoded copy carries its own extension (e.g. ".aac"), but the
    // original upload is stored under its bare id with no extension at all,
    // so its type has to come from the database record instead. Browsers
    // won't play media served as application/octet-stream, which this
    // endpoint used to always send.
    let contentType = Mime.lookup(id) || undefined;
    if (!contentType) {
      const audio = await Audio.findByPk(id);
      contentType = (audio && Mime.lookup(audio.extension)) || "application/octet-stream";
    }

    // <audio>/<video> elements probe with a Range request before they'll
    // start loading; a plain 200 to that probe leaves Chrome's media
    // pipeline stuck at readyState 0 indefinitely instead of erroring out.
    const range = event.request.headers.get("range");
    if (range) {
      const match = range.match(/^bytes=(\d*)-(\d*)$/);
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? parseInt(match[2], 10) : file.byteLength - 1;
        if (start < file.byteLength && end < file.byteLength && start <= end) {
          const chunk = file.subarray(start, end + 1);
          return new Response(new Uint8Array(chunk), {
            status: 206,
            headers: {
              "Content-Type": contentType,
              "Content-Length": chunk.byteLength.toString(),
              "Content-Range": `bytes ${start}-${end}/${file.byteLength}`,
              "Accept-Ranges": "bytes",
            },
          });
        }
      }
    }

    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": file.byteLength.toString(),
        "Accept-Ranges": "bytes",
      },
    });
  } catch (e) {
    return error(404, "Not found");
  }
};
