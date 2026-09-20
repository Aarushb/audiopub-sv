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
    AllowNull,
    BelongsTo,
    Column,
    DataType,
    Default,
    ForeignKey,
    Index,
    Model,
    PrimaryKey,
    Table,
    Unique,
} from "sequelize-typescript";
import User from "./user";

@Table
export default class UserMute extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id: string;

    @AllowNull(false)
    @Unique("unique_muter_mutes_muted_user")
    @ForeignKey(() => User)
    @Index
    @Column(DataType.UUID)
    declare muterId: string;

    @BelongsTo(() => User, { foreignKey: "muterId", onDelete: "CASCADE" })
    declare muter?: User;

    @AllowNull(false)
    @Unique("unique_muter_mutes_muted_user")
    @ForeignKey(() => User)
    @Index
    @Column(DataType.UUID)
    declare mutedId: string;

    @BelongsTo(() => User, { foreignKey: "mutedId", onDelete: "CASCADE" })
    declare muted?: User;
}
