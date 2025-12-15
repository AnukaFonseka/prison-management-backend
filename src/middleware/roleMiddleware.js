const { USER_ROLES } = require('../config/constants');

/**
 * Middleware to check if user has required role
 * @param {string|string[]} allowedRoles - Single role or array of roles
 */
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    // Convert to array if single role provided
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    // Check if user's role is in allowed roles
    if (!roles.includes(req.user.roleName)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

/**
 * Middleware to check if user is Super Admin
 */
const isSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (req.user.roleName !== USER_ROLES.SUPER_ADMIN) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super Admin access required.'
    });
  }

  next();
};

/**
 * Middleware to check if user is Prison Admin or Super Admin
 */
const isPrisonAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  const allowedRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.PRISON_ADMIN];
  
  if (!allowedRoles.includes(req.user.roleName)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin access required.'
    });
  }

  next();
};

/**
 * Middleware to check if user belongs to the same prison or is Super Admin
 * Requires prison_id in request params or body
 */
const checkPrisonAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  // Super Admin can access all prisons
  if (req.user.roleName === USER_ROLES.SUPER_ADMIN) {
    return next();
  }

  // Get prison_id from params or body
  const prisonId = req.params.prison_id || req.body.prison_id;

  // Check if user has a prison assigned
  if (!req.user.prisonId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. No prison assigned to your account.'
    });
  }

  // Check if prison_id matches user's prison
  if (prisonId && parseInt(prisonId) !== parseInt(req.user.prisonId)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access data from your assigned prison.'
    });
  }

  next();
};

/**
 * Middleware to check if user has any of the specified roles
 * @param {Array} allowedRoles - Array of role names that are allowed
 */
const hasAnyRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!Array.isArray(allowedRoles)) {
      allowedRoles = [allowedRoles];
    }

    if (allowedRoles.includes(req.user.roleName)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
    });
  };
};

module.exports = {
  checkRole,
  isSuperAdmin,
  isPrisonAdmin,
  checkPrisonAccess,
  hasAnyRole
};