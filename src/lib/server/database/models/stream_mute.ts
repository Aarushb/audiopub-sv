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

@Table
export default class StreamMute extends Model {
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

    // null means the mute never expires (permanent ban from the stream)
    @AllowNull(true)
    @Column(DataType.DATE)
    declare expiresAt: Date | null;

    @AllowNull(true)
    @Column(DataType.STRING)
    declare reason: string | null;

    @AllowNull(false)
    @Column(DataType.UUID)
    declare createdBy: string;

    @CreatedAt
    declare createdAt: Date;

    @UpdatedAt
    declare updatedAt: Date;

    get isActive(): boolean {
        return this.expiresAt === null || this.expiresAt.getTime() > Date.now();
    }
}
