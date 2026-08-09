"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn("Streams", "slowModeSeconds", {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
        });

        await queryInterface.createTable("StreamMutes", {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                allowNull: false,
                primaryKey: true,
            },
            streamId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: "Streams", key: "id" },
                onDelete: "CASCADE",
            },
            userId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: "Users", key: "id" },
                onDelete: "CASCADE",
            },
            expiresAt: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            reason: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            createdBy: {
                type: Sequelize.UUID,
                allowNull: false,
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
            },
        });

        await queryInterface.addIndex("StreamMutes", ["streamId", "userId"]);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable("StreamMutes");
        await queryInterface.removeColumn("Streams", "slowModeSeconds");
    },
};
