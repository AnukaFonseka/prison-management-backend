const { body, query } = require('express-validator');

/**
 * Validation rules for creating a visitor
 */
const createVisitorValidation = [
  body('visitor_name')
    .trim()
    .notEmpty()
    .withMessage('Visitor name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Visitor name must be between 2 and 200 characters')
    .matches(/^[a-zA-Z\s.'-]+$/)
    .withMessage('Visitor name can only contain letters, spaces, dots, hyphens and apostrophes'),
  
  body('nic')
    .trim()
    .notEmpty()
    .withMessage('NIC is required')
    .custom((value) => {
      // Validate Sri Lankan NIC format
      // Old format: 9 digits + V/X (e.g., 912345678V)
      // New format: 12 digits (e.g., 199123456789)
      const oldNicPattern = /^[0-9]{9}[vVxX]$/;
      const newNicPattern = /^[0-9]{12}$/;
      
      if (!oldNicPattern.test(value) && !newNicPattern.test(value)) {
        throw new Error('Invalid NIC format. Use either 9 digits + V/X or 12 digits');
      }
      return true;
    }),
  
  body('mobile_number')
    .trim()
    .notEmpty()
    .withMessage('Mobile number is required')
    .matches(/^[0-9]{10}$/)
    .withMessage('Mobile number must be exactly 10 digits'),
  
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Address must be between 10 and 500 characters')
];

/**
 * Validation rules for updating a visitor
 */
const updateVisitorValidation = [
  body('visitor_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Visitor name must be between 2 and 200 characters')
    .matches(/^[a-zA-Z\s.'-]+$/)
    .withMessage('Visitor name can only contain letters, spaces, dots, hyphens and apostrophes'),
  
  body('nic')
    .optional()
    .trim()
    .custom((value) => {
      const oldNicPattern = /^[0-9]{9}[vVxX]$/;
      const newNicPattern = /^[0-9]{12}$/;
      
      if (!oldNicPattern.test(value) && !newNicPattern.test(value)) {
        throw new Error('Invalid NIC format. Use either 9 digits + V/X or 12 digits');
      }
      return true;
    }),
  
  body('mobile_number')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Mobile number must be exactly 10 digits'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Address must be between 10 and 500 characters')
];

/**
 * Validation rules for searching visitors
 */
const searchVisitorValidation = [
  query('query')
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters')
];

module.exports = {
  createVisitorValidation,
  updateVisitorValidation,
  searchVisitorValidation
};