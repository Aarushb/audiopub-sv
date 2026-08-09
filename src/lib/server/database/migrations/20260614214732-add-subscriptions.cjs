"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("Subscriptions", {
            id: {
                allowNull: false,
                primaryKey: true,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
            },

            subscriberId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: "Users",
                    key: "id",
                },
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            },

            subscribedToId: {
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

        await queryInterface.addIndex("Subscriptions", ["subscriberId"], {
            name: "subscriptions_subscriber_id_idx",
        });

        await queryInterface.addIndex("Subscriptions", ["subscribedToId"], {
            name: "subscriptions_subscribed_to_id_idx",
        });

        await queryInterface.addConstraint("Subscriptions", {
            fields: ["subscriberId", "subscribedToId"],
            type: "unique",
            name: "unique_subscriber_follows_subscribed_to_user",
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable("Subscriptions");
    },
};
