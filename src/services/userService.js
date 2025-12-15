const bcrypt = require('bcryptjs');
const db = require('../models');
const { USER_ROLES } = require('../config/constants');
const { Op } = require('sequelize');

/**
 * Get all users with filtering and pagination
 */
const getAllUsers = async (filters = {}, page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit;
    
    // Build where clause
    const whereClause = {};
    
    if (filters.prisonId) {
      whereClause.prison_id = filters.prisonId;
    }
    
    if (filters.roleId) {
      whereClause.role_id = filters.roleId;
    }
    
    if (filters.isActive !== undefined) {
      whereClause.is_active = filters.isActive;
    }
    
    if (filters.search) {
      whereClause[Op.or] = [
        { employee_full_name: { [Op.like]: `%${filters.search}%` } },
        { username: { [Op.like]: `%${filters.search}%` } },
        { email: { [Op.like]: `%${filters.search}%` } },
        { nic: { [Op.like]: `%${filters.search}%` } }
      ];
    }

    // Get users with pagination
    const { count, rows: users } = await db.User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password_hash'] },
      include: [
        {
          model: db.Role,
          as: 'role',
          attributes: ['role_id', 'role_name', 'description']
        },
        {
          model: db.Prison,
          as: 'prison',
          attributes: ['prison_id', 'prison_name', 'location']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    return {
      users: users.map(user => ({
        userId: user.user_id,
        fullName: user.employee_full_name,
        username: user.username,
        email: user.email,
        nic: user.nic,
        gender: user.gender,
        birthday: user.birthday,
        address: user.address,
        role: user.role,
        prison: user.prison,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      })),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get user by ID
 */
const getUserById = async (userId) => {
  try {
    const user = await db.User.findByPk(userId, {
      attributes: { exclude: ['password_hash'] },
      include: [
        {
          model: db.Role,
          as: 'role',
          include: [
            {
              model: db.Permission,
              as: 'permissions',
              through: { attributes: [] }
            }
          ]
        },
        {
          model: db.Prison,
          as: 'prison'
        }
      ]
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      userId: user.user_id,
      fullName: user.employee_full_name,
      username: user.username,
      email: user.email,
      nic: user.nic,
      gender: user.gender,
      birthday: user.birthday,
      address: user.address,
      role: {
        roleId: user.role.role_id,
        roleName: user.role.role_name,
        description: user.role.description,
        permissions: user.role.permissions.map(p => p.permission_name)
      },
      prison: user.prison ? {
        prisonId: user.prison.prison_id,
        prisonName: user.prison.prison_name,
        location: user.prison.location,
        address: user.prison.address,
        contactNumber: user.prison.contact_number
      } : null,
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Create new user
 */
const createUser = async (userData, creatorRole, creatorPrisonId) => {
  try {
    // Validate permissions based on creator's role
    if (creatorRole !== USER_ROLES.SUPER_ADMIN) {
      // Prison Admin can only create users for their prison
      if (!userData.prison_id || userData.prison_id !== creatorPrisonId) {
        throw new Error('You can only create users for your assigned prison');
      }
      
      // Prison Admin cannot create Super Admin or Prison Admin
      const targetRole = await db.Role.findByPk(userData.role_id);
      if (!targetRole) {
        throw new Error('Invalid role');
      }
      
      if (targetRole.role_name === USER_ROLES.SUPER_ADMIN || 
          targetRole.role_name === USER_ROLES.PRISON_ADMIN) {
        throw new Error('You do not have permission to create this role');
      }
    }

    // Check if username already exists
    const existingUser = await db.User.findOne({
      where: {
        [Op.or]: [
          { username: userData.username },
          { email: userData.email },
          { nic: userData.nic }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.username === userData.username) {
        throw new Error('Username already exists');
      }
      if (existingUser.email === userData.email) {
        throw new Error('Email already exists');
      }
      if (existingUser.nic === userData.nic) {
        throw new Error('NIC already exists');
      }
    }

    // Create user
    const newUser = await db.User.create({
      employee_full_name: userData.employee_full_name,
      nic: userData.nic,
      gender: userData.gender,
      birthday: userData.birthday,
      email: userData.email,
      address: userData.address,
      username: userData.username,
      password_hash: userData.password, // **Password is hashed via model hook**
      role_id: userData.role_id,
      prison_id: userData.prison_id || null,
      is_active: userData.is_active !== undefined ? userData.is_active : true
    });

    // Fetch created user with relations
    return await getUserById(newUser.user_id);
  } catch (error) {
    throw error;
  }
};

/**
 * Update user
 */
const updateUser = async (userId, updateData, updaterRole, updaterPrisonId) => {
  try {
    const user = await db.User.findByPk(userId, {
      include: [{ model: db.Role, as: 'role' }]
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Validate permissions based on updater's role
    if (updaterRole !== USER_ROLES.SUPER_ADMIN) {
      // Prison Admin can only update users in their prison
      if (user.prison_id !== updaterPrisonId) {
        throw new Error('You can only update users in your assigned prison');
      }
      
      // Prison Admin cannot modify Super Admin or Prison Admin
      if (user.role.role_name === USER_ROLES.SUPER_ADMIN || 
          user.role.role_name === USER_ROLES.PRISON_ADMIN) {
        throw new Error('You do not have permission to update this user');
      }
      
      // If changing role, validate new role
      if (updateData.role_id) {
        const targetRole = await db.Role.findByPk(updateData.role_id);
        if (targetRole && (targetRole.role_name === USER_ROLES.SUPER_ADMIN || 
                          targetRole.role_name === USER_ROLES.PRISON_ADMIN)) {
          throw new Error('You do not have permission to assign this role');
        }
      }
    }

    // Check for duplicate username/email if being updated
    if (updateData.username || updateData.email || updateData.nic) {
      const duplicateCheck = {};
      if (updateData.username) duplicateCheck.username = updateData.username;
      if (updateData.email) duplicateCheck.email = updateData.email;
      if (updateData.nic) duplicateCheck.nic = updateData.nic;

      const existingUser = await db.User.findOne({
        where: {
          user_id: { [Op.ne]: userId },
          [Op.or]: Object.keys(duplicateCheck).map(key => ({ [key]: duplicateCheck[key] }))
        }
      });

      if (existingUser) {
        if (updateData.username && existingUser.username === updateData.username) {
          throw new Error('Username already exists');
        }
        if (updateData.email && existingUser.email === updateData.email) {
          throw new Error('Email already exists');
        }
        if (updateData.nic && existingUser.nic === updateData.nic) {
          throw new Error('NIC already exists');
        }
      }
    }

    // Update user
    await user.update(updateData);

    // Return updated user
    return await getUserById(userId);
  } catch (error) {
    throw error;
  }
};

/**
 * Delete user (soft delete by setting is_active to false)
 */
const deleteUser = async (userId, deleterRole, deleterPrisonId) => {
  try {
    const user = await db.User.findByPk(userId, {
      include: [{ model: db.Role, as: 'role' }]
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Validate permissions
    if (deleterRole !== USER_ROLES.SUPER_ADMIN) {
      if (user.prison_id !== deleterPrisonId) {
        throw new Error('You can only delete users in your assigned prison');
      }
      
      if (user.role.role_name === USER_ROLES.SUPER_ADMIN || 
          user.role.role_name === USER_ROLES.PRISON_ADMIN) {
        throw new Error('You do not have permission to delete this user');
      }
    }

    // Soft delete
    await user.update({ is_active: false });

    return { message: 'User deactivated successfully' };
  } catch (error) {
    throw error;
  }
};

/**
 * Reset user password (Admin function)
 */
const resetUserPassword = async (userId, newPassword, resetterRole, resetterPrisonId) => {
  try {
    const user = await db.User.findByPk(userId, {
      include: [{ model: db.Role, as: 'role' }]
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Validate permissions
    if (resetterRole !== USER_ROLES.SUPER_ADMIN) {
      if (user.prison_id !== resetterPrisonId) {
        throw new Error('You can only reset passwords for users in your assigned prison');
      }
      
      if (user.role.role_name === USER_ROLES.SUPER_ADMIN || 
          user.role.role_name === USER_ROLES.PRISON_ADMIN) {
        throw new Error('You do not have permission to reset this user\'s password');
      }
    }

    // Update password **Password is hashed via model hook** 
    await user.update({ password_hash: newPassword });

    return { message: 'Password reset successfully' };
  } catch (error) {
    throw error;
  }
};

// Roles
const getAllRolesDropdown = async () => {
  try {
    const roles = await db.Role.findAll({
      attributes: ['role_id', 'role_name'], // only what dropdown needs
      order: [['role_name', 'ASC']]
    });

    return roles.map(role => ({
      roleId: role.role_id,
      roleName: role.role_name
    }));
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  getAllRolesDropdown
};