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
    Unique,
    CreatedAt,
    UpdatedAt,
} from "sequelize-typescript";
import Playlist from "./playlist";
import Audio from "./audio";

@Table
export default class PlaylistAudio extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id: string;

    @AllowNull(false)
    @Unique("uniq_playlist_audio_playlist_audio")
    @ForeignKey(() => Playlist)
    @Column(DataType.UUID)
    declare playlistId: string;

    @BelongsTo(() => Playlist, { foreignKey: "playlistId", onDelete: "CASCADE" })
    declare playlist?: Playlist;

    @AllowNull(false)
    @Unique("uniq_playlist_audio_playlist_audio")
    @ForeignKey(() => Audio)
    @Column(DataType.UUID)
    declare audioId: string;

    @BelongsTo(() => Audio, { foreignKey: "audioId", onDelete: "CASCADE" })
    declare audio?: Audio;

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    declare order: number;

    @CreatedAt
    declare createdAt: Date;

    @UpdatedAt
    declare updatedAt: Date;
}
