"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("PlaybackPositions", {
            id: {
                allowNull: false,
                primaryKey: true,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
            },
            userId: {
                allowNull: false,
                type: Sequelize.UUID,
                references: { model: "Users", key: "id" },
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            },
            audioId: {
                allowNull: false,
                type: Sequelize.UUID,
                references: { model: "Audios", key: "id" },
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            },
            position: {
                allowNull: false,
                type: Sequelize.FLOAT,
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
            },
        });

        await queryInterface.addIndex("PlaybackPositions", ["userId"]);
        await queryInterface.addIndex("PlaybackPositions", ["audioId"]);
        await queryInterface.addConstraint("PlaybackPositions", {
            fields: ["userId", "audioId"],
            type: "unique",
            name: "uniq_playback_position_user_audio",
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable("PlaybackPositions");
    },
};
