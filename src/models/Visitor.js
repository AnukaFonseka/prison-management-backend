const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Visitor = sequelize.define('Visitor', {
    visitor_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    visitor_name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    nic: {
      type: DataTypes.STRING(12),
      allowNull: false,
      unique: true,
      validate: {
        is: /^([0-9]{9}[xXvV]|[0-9]{12})$/
      }
    },
    mobile_number: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'visitors',
    timestamps: true
  });

  Visitor.associate = (models) => {
    Visitor.hasMany(models.Visit, {
      foreignKey: 'visitor_id',
      as: 'visits'
    });
  };

  return Visitor;
};