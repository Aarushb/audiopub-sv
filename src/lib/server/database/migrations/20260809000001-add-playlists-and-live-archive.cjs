'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create Playlists table
    await queryInterface.createTable('Playlists', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Create PlaylistAudios junction table
    await queryInterface.createTable('PlaylistAudios', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      playlistId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Playlists',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      audioId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Audios',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add isLiveArchive column to Audios table
    await queryInterface.addColumn('Audios', 'isLiveArchive', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    // Add unique constraint for PlaylistAudios
    await queryInterface.addConstraint('PlaylistAudios', {
      fields: ['playlistId', 'audioId'],
      type: 'unique',
      name: 'uniq_playlist_audio_playlist_audio'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Audios', 'isLiveArchive');
    await queryInterface.dropTable('PlaylistAudios');
    await queryInterface.dropTable('Playlists');
  }
};
