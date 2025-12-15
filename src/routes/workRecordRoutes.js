const express = require('express');
const router = express.Router();
const workRecordController = require('../controllers/workRecordController');
const { authenticate } = require('../middleware/authMiddleware');
const { hasAnyPermission } = require('../middleware/permissionMiddleware');
const { handleValidationErrors } = require('../middleware/validationMiddleware');
const { auditLog } = require('../middleware/auditMiddleware');
const { PERMISSIONS } = require('../config/constants');
const {
  createWorkRecordValidation,
  updateWorkRecordValidation,
  approvePaymentValidation
} = require('../utils/validators/workRecordValidation');

/**
 * @route   GET /api/work-records/statistics
 * @desc    Get work records statistics
 * @access  Private
 */
router.get(
  '/statistics',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_WORK_RECORDS, PERMISSIONS.MANAGE_WORK_RECORDS, PERMISSIONS.VIEW_REPORTS]),
  workRecordController.getWorkRecordStatistics
);

/**
 * @route   GET /api/work-records
 * @desc    Get all work records with filtering and pagination
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_WORK_RECORDS, PERMISSIONS.MANAGE_WORK_RECORDS]),
  workRecordController.getAllWorkRecords
);

/**
 * @route   GET /api/work-records/prisoner/:prisonerId
 * @desc    Get work records for a specific prisoner
 * @access  Private
 */
router.get(
  '/prisoner/:prisonerId',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_WORK_RECORDS, PERMISSIONS.MANAGE_WORK_RECORDS]),
  workRecordController.getWorkRecordsByPrisoner
);

/**
 * @route   GET /api/work-records/:id
 * @desc    Get work record by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_WORK_RECORDS, PERMISSIONS.MANAGE_WORK_RECORDS]),
  workRecordController.getWorkRecordById
);

/**
 * @route   POST /api/work-records
 * @desc    Create new work record
 * @access  Private (Records Keeper or higher)
 */
router.post(
  '/',
  authenticate,
  hasAnyPermission([PERMISSIONS.RECORD_WORK, PERMISSIONS.MANAGE_WORK_RECORDS]),
  createWorkRecordValidation,
  handleValidationErrors,
  auditLog('CREATE_WORK_RECORD'),
  workRecordController.createWorkRecord
);

/**
 * @route   PUT /api/work-records/:id
 * @desc    Update work record
 * @access  Private (Records Keeper or higher)
 */
router.put(
  '/:id',
  authenticate,
  hasAnyPermission([PERMISSIONS.MANAGE_WORK_RECORDS]),
  updateWorkRecordValidation,
  handleValidationErrors,
  auditLog('UPDATE_WORK_RECORD'),
  workRecordController.updateWorkRecord
);

/**
 * @route   DELETE /api/work-records/:id
 * @desc    Delete work record
 * @access  Private (Prison Admin or Super Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  hasAnyPermission([PERMISSIONS.MANAGE_WORK_RECORDS]),
  auditLog('DELETE_WORK_RECORD'),
  workRecordController.deleteWorkRecord
);

/**
 * @route   POST /api/work-records/:id/approve-payment
 * @desc    Approve payment for work record
 * @access  Private (Prison Admin or Super Admin only)
 */
router.post(
  '/:id/approve-payment',
  authenticate,
  hasAnyPermission([PERMISSIONS.APPROVE_PAYMENT, PERMISSIONS.MANAGE_WORK_RECORDS]),
  approvePaymentValidation,
  handleValidationErrors,
  auditLog('APPROVE_PAYMENT'),
  workRecordController.approvePayment
);

/**
 * @route   POST /api/work-records/bulk-approve
 * @desc    Approve multiple payments at once
 * @access  Private (Prison Admin or Super Admin only)
 */
router.post(
  '/bulk-approve',
  authenticate,
  hasAnyPermission([PERMISSIONS.APPROVE_PAYMENT, PERMISSIONS.MANAGE_WORK_RECORDS]),
  auditLog('BULK_APPROVE_PAYMENTS'),
  workRecordController.bulkApprovePayments
);

/**
 * @route   GET /api/work-records/pending-payments
 * @desc    Get all pending payments
 * @access  Private
 */
router.get(
  '/pending-payments',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_WORK_RECORDS, PERMISSIONS.MANAGE_WORK_RECORDS, PERMISSIONS.APPROVE_PAYMENT]),
  workRecordController.getPendingPayments
);

module.exports = router;