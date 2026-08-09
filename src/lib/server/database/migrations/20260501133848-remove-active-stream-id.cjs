"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        try {
            await queryInterface.sequelize.query(
                `ALTER TABLE Users DROP FOREIGN KEY IF EXISTS Users_activeStreamId_foreign_idx`,
            );
        } catch (e) {}
        try {
            await queryInterface.sequelize.query(
                `ALTER TABLE Users DROP INDEX Users_activeStreamId_foreign_idx`,
            );
        } catch (e) {}
        try {
            await queryInterface.sequelize.query(
                `ALTER TABLE Users DROP COLUMN IF EXISTS activeStreamId`,
            );
        } catch (e) {}
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.sequelize.query(`
      ALTER TABLE Users ADD COLUMN activeStreamId CHAR(36) NULL
    `);
        await queryInterface.sequelize.query(`
      ALTER TABLE Users
      ADD CONSTRAINT fk_users_activeStream
      FOREIGN KEY (activeStreamId) REFERENCES Streams(id)
      ON DELETE SET NULL ON UPDATE CASCADE
    `);
    },
};
