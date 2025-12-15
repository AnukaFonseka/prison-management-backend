const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Prisoner = sequelize.define('Prisoner', {
    prisoner_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    full_name: {
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
    case_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    gender: {
      type: DataTypes.ENUM('Male', 'Female', 'Other'),
      allowNull: false
    },
    birthday: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    nationality: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'Sri Lankan'
    },
    admission_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    expected_release_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    actual_release_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Active', 'Released', 'Transferred', 'Deceased'),
      allowNull: false,
      defaultValue: 'Active'
    },
    prison_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'prisons',
        key: 'prison_id'
      }
    },
    cell_number: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    social_status: {
      type: DataTypes.STRING(100),
      allowNull: true
    }
  }, {
    tableName: 'prisoners',
    timestamps: true
  });

  Prisoner.associate = (models) => {
    Prisoner.belongsTo(models.Prison, {
      foreignKey: 'prison_id',
      as: 'prison'
    });

    Prisoner.hasMany(models.PrisonerFamilyDetail, {
      foreignKey: 'prisoner_id',
      as: 'familyDetails'
    });

    Prisoner.hasMany(models.PrisonerPhoto, {
      foreignKey: 'prisoner_id',
      as: 'photos'
    });

    Prisoner.hasMany(models.PrisonerBodyMark, {
      foreignKey: 'prisoner_id',
      as: 'bodyMarks'
    });

    Prisoner.hasMany(models.PrisonerWorkRecord, {
      foreignKey: 'prisoner_id',
      as: 'workRecords'
    });

    Prisoner.hasMany(models.PrisonerBehaviourRecord, {
      foreignKey: 'prisoner_id',
      as: 'behaviourRecords'
    });

    Prisoner.hasMany(models.Visit, {
      foreignKey: 'prisoner_id',
      as: 'visits'
    });
  };

  return Prisoner;
};