const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PrisonerFamilyDetail = sequelize.define('PrisonerFamilyDetail', {
    family_id: {
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
    family_member_name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    relationship: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    contact_number: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    nic: {
      type: DataTypes.STRING(12),
      allowNull: true,
      validate: {
        is: /^([0-9]{9}[xXvV]|[0-9]{12})$/
      }
    },
    emergency_contact: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'prisoner_family_details',
    timestamps: true
  });

  PrisonerFamilyDetail.associate = (models) => {
    PrisonerFamilyDetail.belongsTo(models.Prisoner, {
      foreignKey: 'prisoner_id',
      as: 'prisoner'
    });
  };

  return PrisonerFamilyDetail;
};