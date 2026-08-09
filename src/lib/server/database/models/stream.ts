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
    HasMany,
    CreatedAt,
    UpdatedAt,
} from "sequelize-typescript";
import User from "./user";
import StreamChat from "./stream_chat";
import type { StreamState, ClientsideStream, StreamFormat } from "$lib/types";

@Table
export default class Stream extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id: string;

    @AllowNull(false)
    @Column(DataType.TEXT)
    declare title: string;

    @AllowNull(false)
    @Default("")
    @Column(DataType.TEXT)
    declare description: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    declare state: StreamState;

    @ForeignKey(() => User)
    @Column(DataType.UUID)
    declare userId: string;

    @BelongsTo(() => User)
    declare user?: User;

    @HasMany(() => StreamChat)
    declare streamChats?: StreamChat[];

    @CreatedAt
    declare createdAt: Date;

    @UpdatedAt
    declare updatedAt: Date;

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    declare peekListeners: number;

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    declare activeListeners: number;

    @AllowNull(false)
    @Default(false)
    @Column(DataType.BOOLEAN)
    declare shouldArchive: boolean;

    // Seconds a user must wait between chat messages. 0 means disabled.
    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    declare slowModeSeconds: number;

    @AllowNull(true)
    @Column(DataType.DATE)
    declare disconnectedAt: Date | null;

    @AllowNull(true)
    @Column(DataType.STRING)
    declare format: StreamFormat | null;

    get stateFiltered(): string | null {
        return this.state === "finished" ? null : this.state;
    }

    toClientside(includeUser: boolean = true): ClientsideStream {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            state: this.state,
            peekListeners: this.peekListeners,
            activeListeners: this.activeListeners,
            createdAt: this.createdAt.getTime(),
            user: includeUser ? this.user?.toClientside() : undefined,
            isStream: true as const,
        };
    }
}
