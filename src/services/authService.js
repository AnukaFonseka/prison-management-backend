const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { jwtSecret, jwtExpiresIn, jwtRefreshSecret, jwtRefreshExpiresIn } = require('../config/auth');
const db = require('../models');

/**
 * Generate JWT access token
 */
const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, jwtSecret, { expiresIn: jwtExpiresIn });
};

/**
 * Generate JWT refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, jwtRefreshSecret, { expiresIn: jwtRefreshExpiresIn });
};

/**
 * Login user with username/email and password
 */
const login = async (username, password) => {
  try {
    // Find user by username or email
    const user = await db.User.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { username: username },
          { email: username }
        ]
      },
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
          as: 'prison',
          attributes: ['prison_id', 'prison_name', 'location']
        }
      ]
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if account is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.user_id);
    const refreshToken = generateRefreshToken(user.user_id);

    // Return user data and tokens
    return {
      user: {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        fullName: user.employee_full_name,
        role: {
          roleId: user.role.role_id,
          roleName: user.role.role_name,
          description: user.role.description
        },
        prison: user.prison ? {
          prisonId: user.prison.prison_id,
          prisonName: user.prison.prison_name,
          location: user.prison.location
        } : null,
        permissions: user.role.permissions.map(p => p.permission_name)
      },
      accessToken,
      refreshToken
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = async (refreshToken) => {
  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, jwtRefreshSecret);

    // Get user
    const user = await db.User.findByPk(decoded.userId);

    if (!user || !user.is_active) {
      throw new Error('Invalid refresh token');
    }

    // Generate new access token
    const accessToken = generateAccessToken(user.user_id);

    return { accessToken };
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

/**
 * Get current user profile
 */
const getCurrentUser = async (userId) => {
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
          as: 'prison',
          attributes: ['prison_id', 'prison_name', 'location', 'contact_number']
        }
      ]
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      userId: user.user_id,
      username: user.username,
      email: user.email,
      fullName: user.employee_full_name,
      nic: user.nic,
      gender: user.gender,
      birthday: user.birthday,
      address: user.address,
      role: {
        roleId: user.role.role_id,
        roleName: user.role.role_name,
        description: user.role.description
      },
      prison: user.prison ? {
        prisonId: user.prison.prison_id,
        prisonName: user.prison.prison_name,
        location: user.prison.location,
        contactNumber: user.prison.contact_number
      } : null,
      permissions: user.role.permissions.map(p => p.permission_name),
      isActive: user.is_active,
      createdAt: user.created_at
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Change user password
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  try {
    const user = await db.User.findByPk(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await user.update({ password_hash: hashedPassword });

    return { message: 'Password changed successfully' };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  login,
  refreshAccessToken,
  getCurrentUser,
  changePassword,
  generateAccessToken,
  generateRefreshToken
};