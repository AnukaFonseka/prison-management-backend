const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PrisonerWorkRecord = sequelize.define('PrisonerWorkRecord', {
    work_record_id: {
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
    task_description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    work_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    hours_worked: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    payment_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    payment_status: {
      type: DataTypes.ENUM('Pending', 'Paid'),
      allowNull: false,
      defaultValue: 'Pending'
    },
    payment_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    recorded_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    }
  }, {
    tableName: 'prisoner_work_records',
    timestamps: true
  });

  PrisonerWorkRecord.associate = (models) => {
    PrisonerWorkRecord.belongsTo(models.Prisoner, {
      foreignKey: 'prisoner_id',
      as: 'prisoner'
    });

    PrisonerWorkRecord.belongsTo(models.User, {
      foreignKey: 'recorded_by',
      as: 'recorder'
    });
  };

  return PrisonerWorkRecord;
};