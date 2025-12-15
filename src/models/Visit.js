const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Visit = sequelize.define('Visit', {
    visit_id: {
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
    visitor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'visitors',
        key: 'visitor_id'
      }
    },
    relationship: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    visit_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    visit_time_start: {
      type: DataTypes.TIME,
      allowNull: false
    },
    visit_time_end: {
      type: DataTypes.TIME,
      allowNull: true
    },
    purpose: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Scheduled', 'Completed', 'Cancelled'),
      allowNull: false,
      defaultValue: 'Scheduled'
    },
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'visits',
    timestamps: true
  });

  Visit.associate = (models) => {
    Visit.belongsTo(models.Prisoner, {
      foreignKey: 'prisoner_id',
      as: 'prisoner'
    });

    Visit.belongsTo(models.Visitor, {
      foreignKey: 'visitor_id',
      as: 'visitor'
    });

    Visit.belongsTo(models.User, {
      foreignKey: 'approved_by',
      as: 'approver'
    });
  };

  return Visit;
};