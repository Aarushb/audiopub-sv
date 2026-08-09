/*
 * This file is part of the audiopub project.
 *
 * Copyright (C) 2025 the-byte-bender
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
    BelongsToMany,
    CreatedAt,
    UpdatedAt,
} from "sequelize-typescript";
import User from "./user";
import Audio from "./audio";
import PlaylistAudio from "./playlist_audio";
import type { ClientsidePlaylist } from "$lib/types";

@Table
export default class Playlist extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    declare name: string;

    @ForeignKey(() => User)
    @AllowNull(false)
    @Column(DataType.UUID)
    declare userId: string;

    @BelongsTo(() => User, { foreignKey: "userId", onDelete: "CASCADE" })
    declare user?: User;

    @BelongsToMany(() => Audio, () => PlaylistAudio)
    declare audios?: Audio[];

    @CreatedAt
    declare createdAt: Date;

    @UpdatedAt
    declare updatedAt: Date;

    toClientside(includeUser: boolean = true, includeAudios: boolean = false): ClientsidePlaylist {
        return {
            id: this.id,
            name: this.name,
            createdAt: this.createdAt ? this.createdAt.getTime() : Date.now(),
            user: includeUser && this.user ? this.user.toClientside() : undefined,
            audios: includeAudios && this.audios ? this.audios.map((a) => a.toClientside(includeUser)) : undefined,
            trackCount: this.audios ? this.audios.length : undefined,
        };
    }
}
