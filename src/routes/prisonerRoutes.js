const express = require('express');
const router = express.Router();
const prisonerController = require('../controllers/prisonerController');
const { authenticate } = require('../middleware/authMiddleware');
const { hasAnyPermission } = require('../middleware/permissionMiddleware');
const { hasAnyRole } = require('../middleware/roleMiddleware');
const { handleValidationErrors } = require('../middleware/validationMiddleware');
const { auditLog } = require('../middleware/auditMiddleware');
const { PERMISSIONS, USER_ROLES } = require('../config/constants');
const {
  registerPrisonerValidation,
  updatePrisonerValidation,
  familyDetailsValidation,
  bodyMarkValidation,
  transferPrisonerValidation,
  releasePrisonerValidation
} = require('../utils/validators/prisonerValidation');
const multer = require('multer');
const path = require('path');

// Multer configuration for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/prisoner-photos/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'prisoner-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

/**
 * @route   GET /api/prisoners/statistics
 * @desc    Get prisoner statistics
 * @access  Private
 */
router.get(
  '/statistics',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_PRISONERS, PERMISSIONS.MANAGE_PRISONERS, PERMISSIONS.VIEW_REPORTS]),
  prisonerController.getPrisonerStatistics
);

/**
 * @route   GET /api/prisoners
 * @desc    Get all prisoners with filtering and pagination
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_PRISONERS, PERMISSIONS.MANAGE_PRISONERS]),
  prisonerController.getAllPrisoners
);

/**
 * @route   GET /api/prisoners/:id
 * @desc    Get prisoner by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_PRISONERS, PERMISSIONS.MANAGE_PRISONERS]),
  prisonerController.getPrisonerById
);

/**
 * @route   POST /api/prisoners
 * @desc    Register new prisoner
 * @access  Private (Officer or higher)
 */
router.post(
  '/',
  authenticate,
  hasAnyPermission([PERMISSIONS.REGISTER_PRISONER, PERMISSIONS.MANAGE_PRISONERS]),
  registerPrisonerValidation,
  handleValidationErrors,
  auditLog('REGISTER_PRISONER'),
  prisonerController.registerPrisoner
);

/**
 * @route   PUT /api/prisoners/:id
 * @desc    Update prisoner
 * @access  Private (Officer or higher)
 */
router.put(
  '/:id',
  authenticate,
  hasAnyPermission([PERMISSIONS.UPDATE_PRISONER, PERMISSIONS.MANAGE_PRISONERS]),
  updatePrisonerValidation,
  handleValidationErrors,
  auditLog('UPDATE_PRISONER'),
  prisonerController.updatePrisoner
);

/**
 * @route   DELETE /api/prisoners/:id
 * @desc    Delete prisoner (soft delete)
 * @access  Private (Prison Admin or Super Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  hasAnyRole([USER_ROLES.PRISON_ADMIN, USER_ROLES.SUPER_ADMIN]),
  hasAnyPermission([PERMISSIONS.DELETE_PRISONER, PERMISSIONS.MANAGE_PRISONERS]),
  auditLog('DELETE_PRISONER'),
  prisonerController.deletePrisoner
);

/**
 * @route   POST /api/prisoners/:id/family
 * @desc    Add family details to prisoner
 * @access  Private
 */
router.post(
  '/:id/family',
  authenticate,
  hasAnyPermission([PERMISSIONS.MANAGE_PRISONERS, PERMISSIONS.UPDATE_PRISONER]),
  familyDetailsValidation,
  handleValidationErrors,
  auditLog('ADD_FAMILY_MEMBER'),
  prisonerController.addFamilyDetails
);

/**
 * @route   PUT /api/prisoners/:id/family/:familyId
 * @desc    Update family member details
 * @access  Private
 */
router.put(
  '/:id/family/:familyId',
  authenticate,
  hasAnyPermission([PERMISSIONS.MANAGE_PRISONERS, PERMISSIONS.UPDATE_PRISONER]),
  familyDetailsValidation,
  handleValidationErrors,
  auditLog('UPDATE_FAMILY_MEMBER'),
  prisonerController.updateFamilyDetails
);

/**
 * @route   DELETE /api/prisoners/:id/family/:familyId
 * @desc    Delete family member
 * @access  Private
 */
router.delete(
  '/:id/family/:familyId',
  authenticate,
  hasAnyPermission([PERMISSIONS.MANAGE_PRISONERS, PERMISSIONS.UPDATE_PRISONER]),
  auditLog('DELETE_FAMILY_MEMBER'),
  prisonerController.deleteFamilyMember
);

/**
 * @route   POST /api/prisoners/:id/photos
 * @desc    Upload prisoner photo
 * @access  Private
 */
router.post(
  '/:id/photos',
  authenticate,
  hasAnyPermission([PERMISSIONS.MANAGE_PRISONERS, PERMISSIONS.UPDATE_PRISONER]),
  upload.single('photo'),
  auditLog('UPLOAD_PRISONER_PHOTO'),
  prisonerController.uploadPhoto
);

/**
 * @route   DELETE /api/prisoners/:id/photos/:photoId
 * @desc    Delete prisoner photo
 * @access  Private
 */
router.delete(
  '/:id/photos/:photoId',
  authenticate,
  hasAnyPermission([PERMISSIONS.MANAGE_PRISONERS, PERMISSIONS.UPDATE_PRISONER]),
  auditLog('DELETE_PRISONER_PHOTO'),
  prisonerController.deletePhoto
);

/**
 * @route   POST /api/prisoners/:id/body-marks
 * @desc    Add body mark to prisoner
 * @access  Private
 */
router.post(
  '/:id/body-marks',
  authenticate,
  hasAnyPermission([PERMISSIONS.MANAGE_PRISONERS, PERMISSIONS.UPDATE_PRISONER]),
  bodyMarkValidation,
  handleValidationErrors,
  auditLog('ADD_BODY_MARK'),
  prisonerController.addBodyMark
);

/**
 * @route   PUT /api/prisoners/:id/body-marks/:markId
 * @desc    Update body mark
 * @access  Private
 */
router.put(
  '/:id/body-marks/:markId',
  authenticate,
  hasAnyPermission([PERMISSIONS.MANAGE_PRISONERS, PERMISSIONS.UPDATE_PRISONER]),
  bodyMarkValidation,
  handleValidationErrors,
  auditLog('UPDATE_BODY_MARK'),
  prisonerController.updateBodyMark
);

/**
 * @route   DELETE /api/prisoners/:id/body-marks/:markId
 * @desc    Delete body mark
 * @access  Private
 */
router.delete(
  '/:id/body-marks/:markId',
  authenticate,
  hasAnyPermission([PERMISSIONS.MANAGE_PRISONERS, PERMISSIONS.UPDATE_PRISONER]),
  auditLog('DELETE_BODY_MARK'),
  prisonerController.deleteBodyMark
);

/**
 * @route   POST /api/prisoners/:id/transfer
 * @desc    Transfer prisoner to another prison
 * @access  Private (Prison Admin or Super Admin only)
 */
router.post(
  '/:id/transfer',
  authenticate,
  hasAnyRole([USER_ROLES.PRISON_ADMIN, USER_ROLES.SUPER_ADMIN]),
  hasAnyPermission([PERMISSIONS.MANAGE_PRISONERS]),
  transferPrisonerValidation,
  handleValidationErrors,
  auditLog('TRANSFER_PRISONER'),
  prisonerController.transferPrisoner
);

/**
 * @route   POST /api/prisoners/:id/release
 * @desc    Release prisoner
 * @access  Private (Prison Admin or Super Admin only)
 */
router.post(
  '/:id/release',
  authenticate,
  hasAnyRole([USER_ROLES.PRISON_ADMIN, USER_ROLES.SUPER_ADMIN]),
  hasAnyPermission([PERMISSIONS.MANAGE_PRISONERS]),
  releasePrisonerValidation,
  handleValidationErrors,
  auditLog('RELEASE_PRISONER'),
  prisonerController.releasePrisoner
);

module.exports = router;