'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn("Users", "bio", {
      type: Sequelize.TEXT,
      allowNull: false,
      defaultValue: ""
    })
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn("Users", "bio");
  }
};
