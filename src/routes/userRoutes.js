const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');
const { isPrisonAdmin } = require('../middleware/roleMiddleware');
const { hasAnyPermission } = require('../middleware/permissionMiddleware');
const { handleValidationErrors } = require('../middleware/validationMiddleware');
const { auditLog } = require('../middleware/auditMiddleware');
const { PERMISSIONS } = require('../config/constants');
const {
  createUserValidation,
  updateUserValidation,
  resetPasswordValidation
} = require('../utils/validators/userValidation');
const { body } = require('express-validator');

/**
 * @route   GET /api/users
 * @desc    Get all users with filtering and pagination
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_USERS, PERMISSIONS.MANAGE_USERS]),
  userController.getAllUsers
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_USERS, PERMISSIONS.MANAGE_USERS]),
  userController.getUserById
);

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Private (Admin only)
 */
router.post(
  '/',
  authenticate,
  isPrisonAdmin,
  hasAnyPermission([PERMISSIONS.CREATE_USER, PERMISSIONS.MANAGE_USERS]),
  createUserValidation,
  handleValidationErrors,
  auditLog('CREATE_USER'),
  userController.createUser
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (Admin only)
 */
router.put(
  '/:id',
  authenticate,
  isPrisonAdmin,
  hasAnyPermission([PERMISSIONS.UPDATE_USER, PERMISSIONS.MANAGE_USERS]),
  updateUserValidation,
  handleValidationErrors,
  auditLog('UPDATE_USER'),
  userController.updateUser
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (deactivate)
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  isPrisonAdmin,
  hasAnyPermission([PERMISSIONS.DELETE_USER, PERMISSIONS.MANAGE_USERS]),
  auditLog('DELETE_USER'),
  userController.deleteUser
);

/**
 * @route   POST /api/users/:id/reset-password
 * @desc    Reset user password
 * @access  Private (Admin only)
 */
router.post(
  '/:id/reset-password',
  authenticate,
  isPrisonAdmin,
  hasAnyPermission([PERMISSIONS.UPDATE_USER, PERMISSIONS.MANAGE_USERS]),
  resetPasswordValidation,
  handleValidationErrors,
  auditLog('RESET_PASSWORD'),
  userController.resetUserPassword
);

/** 
 * @route   GET /api/users/roles/dropdown
 * @desc    Get all roles for dropdown
 * @access  Private
 */
router.get(
  '/roles/dropdown',
  authenticate,
  hasAnyPermission([PERMISSIONS.VIEW_USERS, PERMISSIONS.MANAGE_USERS]),
  userController.getAllRolesDropdown
);

module.exports = router;