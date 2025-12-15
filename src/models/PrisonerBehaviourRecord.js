const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PrisonerBehaviourRecord = sequelize.define('PrisonerBehaviourRecord', {
    behaviour_id: {
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
    behaviour_type: {
      type: DataTypes.ENUM('Positive', 'Negative'),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    incident_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    severity_level: {
      type: DataTypes.ENUM('Minor', 'Moderate', 'Severe'),
      allowNull: true
    },
    action_taken: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    sentence_adjustment_days: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Positive value extends sentence, negative value reduces it'
    },
    adjustment_status: {
      type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
      allowNull: false,
      defaultValue: 'Pending'
    },
    adjustment_approved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    adjustment_approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
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
    tableName: 'prisoner_behaviour_records',
    timestamps: true
  });

  PrisonerBehaviourRecord.associate = (models) => {
    PrisonerBehaviourRecord.belongsTo(models.Prisoner, {
      foreignKey: 'prisoner_id',
      as: 'prisoner'
    });

    PrisonerBehaviourRecord.belongsTo(models.User, {
      foreignKey: 'recorded_by',
      as: 'recorder'
    });

    PrisonerBehaviourRecord.belongsTo(models.User, {
      foreignKey: 'adjustment_approved_by',
      as: 'approver'
    });
  };

  return PrisonerBehaviourRecord;
};