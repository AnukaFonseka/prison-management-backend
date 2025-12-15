const express = require('express');
const router = express.Router();
const behaviourController = require('../controllers/behaviourController');
const { authenticate } = require('../middleware/authMiddleware');
const { hasAnyPermission } = require('../middleware/permissionMiddleware');
const { hasAnyRole } = require('../middleware/roleMiddleware');
const { handleValidationErrors } = require('../middleware/validationMiddleware');
const { auditLog } = require('../middleware/auditMiddleware');
const { PERMISSIONS, USER_ROLES } = require('../config/constants');
const {
  createBehaviourRecordValidation,
  updateBehaviourRecordValidation,
  approveSentenceAdjustmentValidation
} = require('../utils/validators/behaviourValidation');

/**
 * @route   GET /api/behaviour-records/statistics
 * @desc    Get behaviour records statistics
 * @access  Private
 */
router.get(
  '/statistics',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_BEHAVIOUR, PERMISSIONS.MANAGE_BEHAVIOUR, PERMISSIONS.VIEW_REPORTS]),
  behaviourController.getBehaviourStatistics
);

/**
 * @route   GET /api/behaviour-records
 * @desc    Get all behaviour records with filtering and pagination
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_BEHAVIOUR, PERMISSIONS.MANAGE_BEHAVIOUR]),
  behaviourController.getAllBehaviourRecords
);

/**
 * @route   GET /api/behaviour-records/prisoner/:prisonerId
 * @desc    Get behaviour records for a specific prisoner
 * @access  Private
 */
router.get(
  '/prisoner/:prisonerId',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_BEHAVIOUR, PERMISSIONS.MANAGE_BEHAVIOUR]),
  behaviourController.getBehaviourRecordsByPrisoner
);

/**
 * @route   GET /api/behaviour-records/pending-adjustments
 * @desc    Get behaviour records with pending sentence adjustments
 * @access  Private (Prison Admin or Super Admin only)
 */
router.get(
  '/pending-adjustments',
  authenticate,
  hasAnyRole([USER_ROLES.PRISON_ADMIN, USER_ROLES.SUPER_ADMIN]),
  hasAnyPermission([PERMISSIONS.ADJUST_SENTENCE, PERMISSIONS.MANAGE_BEHAVIOUR]),
  behaviourController.getPendingAdjustments
);

/**
 * @route   GET /api/behaviour-records/:id
 * @desc    Get behaviour record by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_BEHAVIOUR, PERMISSIONS.MANAGE_BEHAVIOUR]),
  behaviourController.getBehaviourRecordById
);

/**
 * @route   POST /api/behaviour-records
 * @desc    Create new behaviour record
 * @access  Private (Officer or higher)
 */
router.post(
  '/',
  authenticate,
  hasAnyPermission([PERMISSIONS.RECORD_BEHAVIOUR, PERMISSIONS.MANAGE_BEHAVIOUR]),
  createBehaviourRecordValidation,
  handleValidationErrors,
  auditLog('CREATE_BEHAVIOUR_RECORD'),
  behaviourController.createBehaviourRecord
);

/**
 * @route   PUT /api/behaviour-records/:id
 * @desc    Update behaviour record
 * @access  Private (Officer or higher)
 */
router.put(
  '/:id',
  authenticate,
  hasAnyPermission([PERMISSIONS.MANAGE_BEHAVIOUR]),
  updateBehaviourRecordValidation,
  handleValidationErrors,
  auditLog('UPDATE_BEHAVIOUR_RECORD'),
  behaviourController.updateBehaviourRecord
);

/**
 * @route   DELETE /api/behaviour-records/:id
 * @desc    Delete behaviour record
 * @access  Private (Prison Admin or Super Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  hasAnyRole([USER_ROLES.PRISON_ADMIN, USER_ROLES.SUPER_ADMIN]),
  hasAnyPermission([PERMISSIONS.MANAGE_BEHAVIOUR]),
  auditLog('DELETE_BEHAVIOUR_RECORD'),
  behaviourController.deleteBehaviourRecord
);

/**
 * @route   POST /api/behaviour-records/:id/approve-adjustment
 * @desc    Approve sentence adjustment for behaviour record
 * @access  Private (Prison Admin or Super Admin only)
 */
router.post(
  '/:id/approve-adjustment',
  authenticate,
  hasAnyRole([USER_ROLES.PRISON_ADMIN, USER_ROLES.SUPER_ADMIN]),
  hasAnyPermission([PERMISSIONS.ADJUST_SENTENCE, PERMISSIONS.MANAGE_BEHAVIOUR]),
  approveSentenceAdjustmentValidation,
  handleValidationErrors,
  auditLog('APPROVE_SENTENCE_ADJUSTMENT'),
  behaviourController.approveSentenceAdjustment
);

/**
 * @route   POST /api/behaviour-records/:id/reject-adjustment
 * @desc    Reject sentence adjustment for behaviour record
 * @access  Private (Prison Admin or Super Admin only)
 */
router.post(
  '/:id/reject-adjustment',
  authenticate,
  hasAnyRole([USER_ROLES.PRISON_ADMIN, USER_ROLES.SUPER_ADMIN]),
  hasAnyPermission([PERMISSIONS.ADJUST_SENTENCE, PERMISSIONS.MANAGE_BEHAVIOUR]),
  auditLog('REJECT_SENTENCE_ADJUSTMENT'),
  behaviourController.rejectSentenceAdjustment
);

/**
 * @route   GET /api/behaviour-records/prisoner/:prisonerId/score
 * @desc    Calculate behaviour score for a prisoner
 * @access  Private
 */
router.get(
  '/prisoner/:prisonerId/score',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_BEHAVIOUR, PERMISSIONS.MANAGE_BEHAVIOUR, PERMISSIONS.VIEW_PRISONERS]),
  behaviourController.calculateBehaviourScore
);

module.exports = router;