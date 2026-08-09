"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("Streams", {
            id: {
                type: Sequelize.UUID,
                allowNull: false,
                primaryKey: true,
                defaultValue: Sequelize.UUIDV4,
            },
            title: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: false,
                defaultValue: "",
            },
            state: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            userId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: "Users",
                    key: "id",
                },
                onDelete: "CASCADE",
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

        await queryInterface.createTable("StreamChats", {
            id: {
                type: Sequelize.UUID,
                allowNull: false,
                primaryKey: true,
                defaultValue: Sequelize.UUIDV4,
            },
            streamId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: "Streams",
                    key: "id",
                },
                onDelete: "CASCADE",
            },
            userId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: "Users",
                    key: "id",
                },
                onDelete: "CASCADE",
            },
            content: {
                type: Sequelize.TEXT,
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

        await queryInterface.addColumn("Users", "streamKey", {
            type: Sequelize.STRING,
            allowNull: true,
        });

        await queryInterface.addColumn("Users", "activeStreamId", {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
                model: "Streams",
                key: "id",
            },
        });

        await queryInterface.addIndex("Streams", ["userId"]);
        await queryInterface.addIndex("Streams", ["createdAt"]);
        await queryInterface.addIndex("StreamChats", ["streamId"]);
        await queryInterface.addIndex("StreamChats", ["userId"]);

        // Unique constraint: only one non-finished stream per user
        // stateFiltered is a generated column: NULL when finished, state value otherwise
        // The unique index on [userId, stateFiltered] then allows at most one non-finished
        // stream per user (since only one row per user can have the same non-NULL value).
        await queryInterface.addColumn("Streams", "stateFiltered", {
            type: Sequelize.STRING,
            allowNull: true,
            field: "stateFiltered",
        });

        await queryInterface.sequelize.query(`
      ALTER TABLE Streams
      MODIFY COLUMN stateFiltered
      VARCHAR(20)
      GENERATED ALWAYS AS (
        CASE WHEN state = 'finished' THEN NULL ELSE state END
      ) STORED
    `);

        await queryInterface.addConstraint("Streams", {
            fields: ["userId", "stateFiltered"],
            type: "unique",
            name: "uniq_stream_user_nonfinished",
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeConstraint(
            "Streams",
            "uniq_stream_user_nonfinished",
        );
        await queryInterface.removeColumn("Streams", "stateFiltered");
        await queryInterface.removeColumn("Users", "activeStreamId");
        await queryInterface.removeColumn("Users", "streamKey");
        await queryInterface.dropTable("StreamChats");
        await queryInterface.dropTable("Streams");
    },
};
