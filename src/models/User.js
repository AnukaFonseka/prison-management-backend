const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    employee_full_name: {
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
    gender: {
      type: DataTypes.ENUM('Male', 'Female', 'Other'),
      allowNull: false
    },
    birthday: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'role_id'
      }
    },
    prison_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'prisons',
        key: 'prison_id'
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password_hash) {
          user.password_hash = await bcrypt.hash(user.password_hash, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password_hash')) {
          user.password_hash = await bcrypt.hash(user.password_hash, 10);
        }
      }
    }
  });

  User.associate = (models) => {
    User.belongsTo(models.Role, {
      foreignKey: 'role_id',
      as: 'role'
    });

    User.belongsTo(models.Prison, {
      foreignKey: 'prison_id',
      as: 'prison'
    });

    User.hasMany(models.PrisonerWorkRecord, {
      foreignKey: 'recorded_by',
      as: 'workRecords'
    });

    User.hasMany(models.PrisonerBehaviourRecord, {
      foreignKey: 'recorded_by',
      as: 'behaviourRecords'
    });

    User.hasMany(models.Visit, {
      foreignKey: 'approved_by',
      as: 'approvedVisits'
    });

    User.hasMany(models.AuditLog, {
      foreignKey: 'user_id',
      as: 'auditLogs'
    });
  };

  // Instance method to compare password
  User.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password_hash);
  };

  return User;
};