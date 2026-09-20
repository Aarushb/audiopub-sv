"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("CommentEdits", {
            id: {
                allowNull: false,
                primaryKey: true,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
            },
            commentId: {
                allowNull: false,
                type: Sequelize.UUID,
                references: { model: "Comments", key: "id" },
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
            previousContent: {
                allowNull: false,
                type: Sequelize.TEXT,
            },
            newContent: {
                allowNull: false,
                type: Sequelize.TEXT,
            },
            isAdminEdit: {
                allowNull: false,
                type: Sequelize.BOOLEAN,
                defaultValue: false,
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

        await queryInterface.addIndex("CommentEdits", ["commentId", "createdAt"]);
    },

    async down(queryInterface) {
        await queryInterface.dropTable("CommentEdits");
    },
};
