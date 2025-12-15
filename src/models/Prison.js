const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Prison = sequelize.define('Prison', {
    prison_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    prison_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: true
    },
    location: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    superintendent_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    contact_number: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    established_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'prisons',
    timestamps: true
  });

  Prison.associate = (models) => {
    Prison.hasMany(models.User, {
      foreignKey: 'prison_id',
      as: 'users'
    });

    Prison.hasMany(models.Prisoner, {
      foreignKey: 'prison_id',
      as: 'prisoners'
    });
  };

  return Prison;
};