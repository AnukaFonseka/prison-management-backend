const { body } = require('express-validator');

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
  createPrisonValidation,
  updatePrisonValidation
};