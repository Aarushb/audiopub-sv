/*
 * This file is part of the audiopub project.
 *
 * Copyright (C) 2026 the-byte-bender
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
import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AllowNull,
    Default,
    ForeignKey,
    BelongsTo,
    CreatedAt,
    UpdatedAt,
} from "sequelize-typescript";
import User from "./user";
import Stream from "./stream";
import type { ClientsideStreamChat } from "$lib/types";

@Table
export default class StreamChat extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id: string;

    @ForeignKey(() => Stream)
    @Column(DataType.UUID)
    declare streamId: string;

    @BelongsTo(() => Stream)
    declare stream?: Stream;

    @ForeignKey(() => User)
    @Column(DataType.UUID)
    declare userId: string;

    @BelongsTo(() => User)
    declare user?: User;

    @AllowNull(false)
    @Column(DataType.TEXT)
    declare content: string;

    @CreatedAt
    declare createdAt: Date;

    @UpdatedAt
    declare updatedAt: Date;

    toClientside(includeStream: boolean = false): ClientsideStreamChat {
        return {
            id: this.id,
            content: this.content,
            createdAt: this.createdAt.getTime(),
            user: this.user!.toClientside(),
            stream: includeStream
                ? this.stream?.toClientside(false)
                : undefined,
        };
    }
}
