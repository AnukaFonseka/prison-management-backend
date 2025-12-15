/**
 * Middleware to check if user has required permission(s)
 * @param {string|string[]} requiredPermissions - Single permission or array of permissions
 * @param {boolean} requireAll - If true, user must have all permissions. If false, user needs at least one
 */
const checkPermission = (requiredPermissions, requireAll = false) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!req.user.permissions || req.user.permissions.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. No permissions assigned.'
      });
    }

    // Convert to array if single permission provided
    const permissions = Array.isArray(requiredPermissions) 
      ? requiredPermissions 
      : [requiredPermissions];

    if (requireAll) {
      // User must have ALL required permissions
      const hasAllPermissions = permissions.every(permission => 
        req.user.permissions.includes(permission)
      );

      if (!hasAllPermissions) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have the required permissions.'
        });
      }
    } else {
      // User needs at least ONE of the required permissions
      const hasAnyPermission = permissions.some(permission => 
        req.user.permissions.includes(permission)
      );

      if (!hasAnyPermission) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have the required permissions.'
        });
      }
    }

    next();
  };
};

/**
 * Check if user has any permission from a list
 */
const hasAnyPermission = (permissions) => {
  return checkPermission(permissions, false);
};

/**
 * Check if user has all permissions from a list
 */
const hasAllPermissions = (permissions) => {
  return checkPermission(permissions, true);
};

module.exports = {
  checkPermission,
  hasAnyPermission,
  hasAllPermissions
};