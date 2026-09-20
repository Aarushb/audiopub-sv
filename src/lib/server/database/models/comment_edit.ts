/*
 * This file is part of the audiopub project.
 *
 * Copyright (C) 2026 the-byte-bender
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
import {
    AllowNull,
    BelongsTo,
    Column,
    DataType,
    Default,
    ForeignKey,
    Model,
    PrimaryKey,
    Table,
} from "sequelize-typescript";
import Comment from "./comment";
import User from "./user";

@Table
export default class CommentEdit extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id: string;

    @ForeignKey(() => Comment)
    @AllowNull(false)
    @Column(DataType.UUID)
    declare commentId: string;

    @BelongsTo(() => Comment)
    declare comment?: Comment;

    @ForeignKey(() => User)
    @AllowNull(true)
    @Column(DataType.UUID)
    declare editorId: string | null;

    @BelongsTo(() => User)
    declare editor?: User;

    @AllowNull(false)
    @Column(DataType.TEXT)
    declare previousContent: string;

    @AllowNull(false)
    @Column(DataType.TEXT)
    declare newContent: string;

    @AllowNull(false)
    @Default(false)
    @Column(DataType.BOOLEAN)
    declare isAdminEdit: boolean;
}
