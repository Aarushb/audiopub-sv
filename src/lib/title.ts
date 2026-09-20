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
import { getContext, setContext } from "svelte";
import { writable, type Writable } from "svelte/store";

const TITLE_CONTEXT_KEY = "title";

// A module-level store here would be a single instance shared by every
// request the server handles, since Node keeps this module loaded across
// requests — one user's page title would leak into another's SSR output.
// The root layout creates a fresh store per render via createTitleStore()
// and puts it in Svelte context, which is correctly scoped per request;
// every other component reads it back with getTitle().
export function createTitleStore(): Writable<string> {
    const title = writable("audiopub");
    setContext(TITLE_CONTEXT_KEY, title);
    return title;
}

export function getTitle(): Writable<string> {
    return getContext(TITLE_CONTEXT_KEY);
}
