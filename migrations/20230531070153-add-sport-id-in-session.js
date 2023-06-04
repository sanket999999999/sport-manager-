module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Sessions', 'sportId', {
      type: Sequelize.DataTypes.INTEGER
    })
    await queryInterface.addConstraint('Sessions', {
      fields: ['sportId'],
      type: 'foreign key',
      references: {
        table: 'Sports',
        field: 'id'
      },
      onDelete: 'cascade',
      onUpdate: 'cascade'
    })
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Sessions', 'SportId');
  }
};