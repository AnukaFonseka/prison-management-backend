const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PrisonerPhoto = sequelize.define('PrisonerPhoto', {
    photo_id: {
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
    photo_url: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    photo_type: {
      type: DataTypes.ENUM('Profile', 'Full Body', 'Other'),
      allowNull: false,
      defaultValue: 'Profile'
    },
    upload_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'prisoner_photos',
    timestamps: true,
    updatedAt: false
  });

  PrisonerPhoto.associate = (models) => {
    PrisonerPhoto.belongsTo(models.Prisoner, {
      foreignKey: 'prisoner_id',
      as: 'prisoner'
    });
  };

  return PrisonerPhoto;
};