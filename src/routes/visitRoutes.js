const express = require('express');
const router = express.Router();
const visitController = require('../controllers/visitController');
const { authenticate } = require('../middleware/authMiddleware');
const { hasAnyPermission } = require('../middleware/permissionMiddleware');
const { handleValidationErrors } = require('../middleware/validationMiddleware');
const { auditLog } = require('../middleware/auditMiddleware');
const { PERMISSIONS } = require('../config/constants');
const {
  createVisitValidation,
  updateVisitValidation,
  updateVisitStatusValidation
} = require('../utils/validators/visitValidation');

/**
 * @route   GET /api/visits/statistics
 * @desc    Get visit statistics
 * @access  Private
 */
router.get(
  '/statistics',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_VISITORS, PERMISSIONS.MANAGE_VISITORS, PERMISSIONS.VIEW_REPORTS]),
  visitController.getVisitStatistics
);

/**
 * @route   GET /api/visits
 * @desc    Get all visits with filtering and pagination
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_VISITORS, PERMISSIONS.MANAGE_VISITORS]),
  visitController.getAllVisits
);

/**
 * @route   GET /api/visits/prisoner/:prisonerId
 * @desc    Get visits for a specific prisoner
 * @access  Private
 */
router.get(
  '/prisoner/:prisonerId',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_VISITORS, PERMISSIONS.MANAGE_VISITORS]),
  visitController.getVisitsByPrisoner
);

/**
 * @route   GET /api/visits/upcoming
 * @desc    Get upcoming scheduled visits
 * @access  Private
 */
router.get(
  '/upcoming',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_VISITORS, PERMISSIONS.MANAGE_VISITORS]),
  visitController.getUpcomingVisits
);

/**
 * @route   GET /api/visits/:id
 * @desc    Get visit by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_VISITORS, PERMISSIONS.MANAGE_VISITORS]),
  visitController.getVisitById
);

/**
 * @route   POST /api/visits
 * @desc    Schedule new visit
 * @access  Private (Visitor Manager or higher)
 */
router.post(
  '/',
  authenticate,
  hasAnyPermission([PERMISSIONS.SCHEDULE_VISIT, PERMISSIONS.MANAGE_VISITORS]),
  createVisitValidation,
  handleValidationErrors,
  auditLog('SCHEDULE_VISIT'),
  visitController.scheduleVisit
);

/**
 * @route   PUT /api/visits/:id
 * @desc    Update visit
 * @access  Private (Visitor Manager or higher)
 */
router.put(
  '/:id',
  authenticate,
  hasAnyPermission([PERMISSIONS.MANAGE_VISITORS]),
  updateVisitValidation,
  handleValidationErrors,
  auditLog('UPDATE_VISIT'),
  visitController.updateVisit
);

/**
 * @route   PATCH /api/visits/:id/status
 * @desc    Update visit status (complete/cancel)
 * @access  Private (Visitor Manager or higher)
 */
router.patch(
  '/:id/status',
  authenticate,
  hasAnyPermission([PERMISSIONS.MANAGE_VISITORS]),
  updateVisitStatusValidation,
  handleValidationErrors,
  auditLog('UPDATE_VISIT_STATUS'),
  visitController.updateVisitStatus
);

/**
 * @route   DELETE /api/visits/:id
 * @desc    Delete visit
 * @access  Private (Prison Admin or Super Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  hasAnyPermission([PERMISSIONS.MANAGE_VISITORS]),
  auditLog('DELETE_VISIT'),
  visitController.deleteVisit
);

/**
 * @route   POST /api/visits/:id/approve
 * @desc    Approve visit
 * @access  Private (Prison Admin or higher)
 */
router.post(
  '/:id/approve',
  authenticate,
  hasAnyPermission([PERMISSIONS.APPROVE_VISIT, PERMISSIONS.MANAGE_VISITORS]),
  auditLog('APPROVE_VISIT'),
  visitController.approveVisit
);

module.exports = router;