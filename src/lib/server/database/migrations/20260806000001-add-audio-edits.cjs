"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("AudioEdits", {
            id: {
                allowNull: false,
                primaryKey: true,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
            },
            audioId: {
                allowNull: false,
                type: Sequelize.UUID,
                references: { model: "Audios", key: "id" },
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            },
            editorId: {
                allowNull: true,
                type: Sequelize.UUID,
                references: { model: "Users", key: "id" },
                onDelete: "SET NULL",
                onUpdate: "CASCADE",
            },
            previousTitle: {
                allowNull: false,
                type: Sequelize.TEXT,
            },
            previousDescription: {
                allowNull: false,
                type: Sequelize.TEXT,
            },
            newTitle: {
                allowNull: false,
                type: Sequelize.TEXT,
            },
            newDescription: {
                allowNull: false,
                type: Sequelize.TEXT,
            },
            isAdminEdit: {
                allowNull: false,
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },
            restoredEditId: {
                allowNull: true,
                type: Sequelize.UUID,
                references: { model: "AudioEdits", key: "id" },
                onDelete: "SET NULL",
                onUpdate: "CASCADE",
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

        await queryInterface.addIndex("AudioEdits", ["audioId", "createdAt"]);
        await queryInterface.addIndex("AudioEdits", ["createdAt"]);
    },

    async down(queryInterface) {
        await queryInterface.dropTable("AudioEdits");
    },
};
