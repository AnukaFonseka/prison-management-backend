const express = require('express');
const router = express.Router();
const visitorController = require('../controllers/visitorController');
const { authenticate } = require('../middleware/authMiddleware');
const { hasAnyPermission } = require('../middleware/permissionMiddleware');
const { handleValidationErrors } = require('../middleware/validationMiddleware');
const { auditLog } = require('../middleware/auditMiddleware');
const { PERMISSIONS } = require('../config/constants');
const {
  createVisitorValidation,
  updateVisitorValidation,
  searchVisitorValidation
} = require('../utils/validators/visitorValidation');

/**
 * @route   GET /api/visitors/statistics
 * @desc    Get visitor statistics
 * @access  Private
 */
router.get(
  '/statistics',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_VISITORS, PERMISSIONS.MANAGE_VISITORS, PERMISSIONS.VIEW_REPORTS]),
  visitorController.getVisitorStatistics
);

/**
 * @route   GET /api/visitors
 * @desc    Get all visitors with filtering and pagination
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_VISITORS, PERMISSIONS.MANAGE_VISITORS]),
  visitorController.getAllVisitors
);

/**
 * @route   GET /api/visitors/search
 * @desc    Search visitors by NIC or name
 * @access  Private
 */
router.get(
  '/search',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_VISITORS, PERMISSIONS.MANAGE_VISITORS]),
  searchVisitorValidation,
  handleValidationErrors,
  visitorController.searchVisitors
);

/**
 * @route   GET /api/visitors/:id
 * @desc    Get visitor by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_VISITORS, PERMISSIONS.MANAGE_VISITORS]),
  visitorController.getVisitorById
);

/**
 * @route   POST /api/visitors
 * @desc    Create new visitor
 * @access  Private (Visitor Manager or higher)
 */
router.post(
  '/',
  authenticate,
  hasAnyPermission([PERMISSIONS.MANAGE_VISITORS]),
  createVisitorValidation,
  handleValidationErrors,
  auditLog('CREATE_VISITOR'),
  visitorController.createVisitor
);

/**
 * @route   PUT /api/visitors/:id
 * @desc    Update visitor
 * @access  Private (Visitor Manager or higher)
 */
router.put(
  '/:id',
  authenticate,
  hasAnyPermission([PERMISSIONS.MANAGE_VISITORS]),
  updateVisitorValidation,
  handleValidationErrors,
  auditLog('UPDATE_VISITOR'),
  visitorController.updateVisitor
);

/**
 * @route   DELETE /api/visitors/:id
 * @desc    Delete visitor
 * @access  Private (Prison Admin or Super Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  hasAnyPermission([PERMISSIONS.MANAGE_VISITORS]),
  auditLog('DELETE_VISITOR'),
  visitorController.deleteVisitor
);

/**
 * @route   GET /api/visitors/:id/history
 * @desc    Get visitor's visit history
 * @access  Private
 */
router.get(
  '/:id/history',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_VISITORS, PERMISSIONS.MANAGE_VISITORS]),
  visitorController.getVisitorHistory
);

module.exports = router;