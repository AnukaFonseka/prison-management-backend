const db = require('../models');

/**
 * Middleware to log user actions for audit trail
 */
const auditLog = (actionType) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to capture response
    res.json = function (data) {
      // Only log successful operations
      if (data.success !== false && req.user) {
        // Create audit log asynchronously (don't wait for it)
        db.AuditLog.create({
          user_id: req.user.userId,
          action_type: actionType,
          table_name: getTableNameFromRoute(req.route.path),
          record_id: getRecordId(req, data),
          old_values: req.method === 'PUT' || req.method === 'PATCH' ? req.body : null,
          new_values: req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' ? data.data : null,
          ip_address: req.ip || req.connection.remoteAddress
        }).catch(err => {
          console.error('Audit log error:', err);
        });
      }

      // Call original json method
      return originalJson(data);
    };

    next();
  };
};

/**
 * Helper function to extract table name from route
 */
const getTableNameFromRoute = (routePath) => {
  if (!routePath) return 'unknown';
  
  const match = routePath.match(/\/([^\/]+)/);
  return match ? match[1] : 'unknown';
};

/**
 * Helper function to extract record ID from request/response
 */
const getRecordId = (req, responseData) => {
  // Try to get ID from params
  if (req.params.id) return req.params.id;
  
  // Try to get ID from response data
  if (responseData.data && responseData.data.id) return responseData.data.id;
  
  // Try various ID field names in response
  const idFields = ['user_id', 'prisoner_id', 'prison_id', 'visit_id', 'visitor_id'];
  for (const field of idFields) {
    if (responseData.data && responseData.data[field]) {
      return responseData.data[field];
    }
  }
  
  return null;
};

module.exports = {
  auditLog
};