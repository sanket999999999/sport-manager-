'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Sessions', 'userId', {
      type: Sequelize.DataTypes.INTEGER
    })
    await queryInterface.addConstraint('Sessions', {
      fields: ['userId'],
      type: 'foreign key',
      references: {
        table: 'Users',
        field: 'id'
      },
      onDelete: 'cascade',
      onUpdate: 'cascade'
    })
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Sessions', 'userId');
  }
};