const express = require('express');
const router = express.Router();
const prisonController = require('../controllers/prisonController');
const { authenticate } = require('../middleware/authMiddleware');
const { isSuperAdmin } = require('../middleware/roleMiddleware');
const { hasAnyPermission } = require('../middleware/permissionMiddleware');
const { handleValidationErrors } = require('../middleware/validationMiddleware');
const { auditLog } = require('../middleware/auditMiddleware');
const { PERMISSIONS } = require('../config/constants');
const {
  createPrisonValidation,
  updatePrisonValidation
} = require('../utils/validators/prisonValidation');

/**
 * @route   GET /api/prisons
 * @desc    Get all prisons with filtering and pagination
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_PRISONS, PERMISSIONS.MANAGE_PRISONS]),
  prisonController.getAllPrisons
);

/**
 * @route   GET /api/prisons/:id
 * @desc    Get prison by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_PRISONS, PERMISSIONS.MANAGE_PRISONS]),
  prisonController.getPrisonById
);

/**
 * @route   GET /api/prisons/:id/statistics
 * @desc    Get prison statistics
 * @access  Private
 */
router.get(
  '/:id/statistics',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_PRISONS, PERMISSIONS.MANAGE_PRISONS, PERMISSIONS.VIEW_REPORTS]),
  prisonController.getPrisonStatistics
);

/**
 * @route   POST /api/prisons
 * @desc    Create new prison
 * @access  Private (Super Admin only)
 */
router.post(
  '/',
  authenticate,
  isSuperAdmin,
  hasAnyPermission([PERMISSIONS.MANAGE_PRISONS]),
  createPrisonValidation,
  handleValidationErrors,
  auditLog('CREATE_PRISON'),
  prisonController.createPrison
);

/**
 * @route   PUT /api/prisons/:id
 * @desc    Update prison
 * @access  Private (Super Admin only)
 */
router.put(
  '/:id',
  authenticate,
  isSuperAdmin,
  hasAnyPermission([PERMISSIONS.MANAGE_PRISONS]),
  updatePrisonValidation,
  handleValidationErrors,
  auditLog('UPDATE_PRISON'),
  prisonController.updatePrison
);

/**
 * @route   DELETE /api/prisons/:id
 * @desc    Delete prison (deactivate)
 * @access  Private (Super Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  isSuperAdmin,
  hasAnyPermission([PERMISSIONS.MANAGE_PRISONS]),
  auditLog('DELETE_PRISON'),
  prisonController.deletePrison
);

module.exports = router;