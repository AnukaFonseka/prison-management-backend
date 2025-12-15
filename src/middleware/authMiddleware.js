const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/auth');
const db = require('../models');

/**
 * Middleware to verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, jwtSecret);

    // Get user from database with role and permissions
    const user = await db.User.findByPk(decoded.userId, {
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
          attributes: ['prison_id', 'prison_name']
        }
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    // Attach user to request
    req.user = {
      userId: user.user_id,
      username: user.username,
      email: user.email,
      roleId: user.role_id,
      roleName: user.role.role_name,
      prisonId: user.prison_id,
      permissions: user.role.permissions.map(p => p.permission_name)
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed.'
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, jwtSecret);

    const user = await db.User.findByPk(decoded.userId, {
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
        }
      ]
    });

    if (user && user.is_active) {
      req.user = {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        roleId: user.role_id,
        roleName: user.role.role_name,
        prisonId: user.prison_id,
        permissions: user.role.permissions.map(p => p.permission_name)
      };
    }

    next();
  } catch (error) {
    // If token is invalid, continue without user
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth
};