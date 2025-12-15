const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PrisonerBodyMark = sequelize.define('PrisonerBodyMark', {
    mark_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    prisoner_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'prisoners',
        key: 'prisoner_id'
      }
    },
    mark_description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    mark_location: {
      type: DataTypes.STRING(100),
      allowNull: false
    }
  }, {
    tableName: 'prisoner_body_marks',
    timestamps: true
  });

  PrisonerBodyMark.associate = (models) => {
    PrisonerBodyMark.belongsTo(models.Prisoner, {
      foreignKey: 'prisoner_id',
      as: 'prisoner'
    });
  };

  return PrisonerBodyMark;
};