const { body } = require('express-validator');

/**
 * Validation rules for login
 */
const loginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username or email is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * Validation rules for refresh token
 */
const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
];

/**
 * Validation rules for change password
 */
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('confirmPassword')
    .notEmpty()
    .withMessage('Password confirmation is required')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match')
];

/**
 * Validation rules for NIC (Sri Lankan National Identity Card)
 */
const validateNIC = (value) => {
  // Old NIC format: 9 digits + V (e.g., 123456789V)
  const oldNICPattern = /^[0-9]{9}[vVxX]$/;
  
  // New NIC format: 12 digits (e.g., 199912345678)
  const newNICPattern = /^[0-9]{12}$/;
  
  if (!oldNICPattern.test(value) && !newNICPattern.test(value)) {
    throw new Error('Invalid NIC format. Must be either 9 digits followed by V/X or 12 digits');
  }
  
  return true;
};

/**
 * Validation rules for creating a user
 */
const createUserValidation = [
  body('employee_full_name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Full name must be between 3 and 100 characters'),
  
  body('nic')
    .trim()
    .notEmpty()
    .withMessage('NIC is required')
    .custom(validateNIC),
  
  body('gender')
    .notEmpty()
    .withMessage('Gender is required')
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other'),
  
  body('birthday')
    .notEmpty()
    .withMessage('Birthday is required')
    .isDate()
    .withMessage('Invalid date format'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ max: 255 })
    .withMessage('Address must not exceed 255 characters'),
  
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 4, max: 50 })
    .withMessage('Username must be between 4 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('role_id')
    .notEmpty()
    .withMessage('Role is required')
    .isInt()
    .withMessage('Role ID must be an integer'),
  
  body('prison_id')
    .optional({ nullable: true })
    .isInt()
    .withMessage('Prison ID must be an integer')
];

/**
 * Validation rules for updating a user
 */
const updateUserValidation = [
  body('employee_full_name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Full name must be between 3 and 100 characters'),
  
  body('nic')
    .optional()
    .trim()
    .custom(validateNIC),
  
  body('gender')
    .optional()
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other'),
  
  body('birthday')
    .optional()
    .isDate()
    .withMessage('Invalid date format'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Address must not exceed 255 characters'),
  
  body('role_id')
    .optional()
    .isInt()
    .withMessage('Role ID must be an integer'),
  
  body('prison_id')
    .optional({ nullable: true })
    .isInt()
    .withMessage('Prison ID must be an integer'),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
];

/**
 * Validation rules for creating a prison
 */
const createPrisonValidation = [
  body('prison_name')
    .trim()
    .notEmpty()
    .withMessage('Prison name is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Prison name must be between 3 and 200 characters'),
  
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required')
    .isLength({ max: 100 })
    .withMessage('Location must not exceed 100 characters'),
  
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required'),
  
  body('capacity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Capacity must be a positive integer')
    .toInt(),
  
  body('superintendent_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Superintendent name must not exceed 100 characters'),
  
  body('contact_number')
    .optional()
    .trim()
    .matches(/^[0-9\-+() ]{7,20}$/)
    .withMessage('Invalid contact number format'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('established_date')
    .optional()
    .isDate()
    .withMessage('Invalid date format')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      if (date > now) {
        throw new Error('Established date cannot be in the future');
      }
      return true;
    }),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
];

/**
 * Validation rules for updating a prison
 */
const updatePrisonValidation = [
  body('prison_name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Prison name must be between 3 and 200 characters'),
  
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location must not exceed 100 characters'),
  
  body('address')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Address cannot be empty'),
  
  body('capacity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Capacity must be a positive integer')
    .toInt(),
  
  body('superintendent_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Superintendent name must not exceed 100 characters'),
  
  body('contact_number')
    .optional()
    .trim()
    .matches(/^[0-9\-+() ]{7,20}$/)
    .withMessage('Invalid contact number format'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('established_date')
    .optional()
    .isDate()
    .withMessage('Invalid date format')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      if (date > now) {
        throw new Error('Established date cannot be in the future');
      }
      return true;
    }),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
];

module.exports = {
  loginValidation,
  refreshTokenValidation,
  changePasswordValidation,
  createUserValidation,
  updateUserValidation,
  validateNIC,
  createPrisonValidation,
  updatePrisonValidation
};