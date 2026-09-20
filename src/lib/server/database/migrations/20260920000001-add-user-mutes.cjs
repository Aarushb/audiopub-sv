"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("UserMutes", {
            id: {
                allowNull: false,
                primaryKey: true,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
            },

            muterId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: "Users",
                    key: "id",
                },
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            },

            mutedId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: "Users",
                    key: "id",
                },
                onDelete: "CASCADE",
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

        await queryInterface.addIndex("UserMutes", ["muterId"], {
            name: "user_mutes_muter_id_idx",
        });

        await queryInterface.addIndex("UserMutes", ["mutedId"], {
            name: "user_mutes_muted_id_idx",
        });

        await queryInterface.addConstraint("UserMutes", {
            fields: ["muterId", "mutedId"],
            type: "unique",
            name: "unique_muter_mutes_muted_user",
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable("UserMutes");
    },
};
