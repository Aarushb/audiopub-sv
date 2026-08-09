"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn("Users", "notificationKey", {
            type: Sequelize.UUID,
            allowNull: true,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn("Users", "notificationKey");
    },
};
