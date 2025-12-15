const { body } = require('express-validator');
const { PAYMENT_STATUS } = require('../../config/constants');

/**
 * Validation rules for creating a work record
 */
const createWorkRecordValidation = [
  body('prisoner_id')
    .notEmpty()
    .withMessage('Prisoner ID is required')
    .isInt({ min: 1 })
    .withMessage('Invalid prisoner ID')
    .toInt(),
  
  body('task_description')
    .trim()
    .notEmpty()
    .withMessage('Task description is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Task description must be between 10 and 1000 characters'),
  
  body('work_date')
    .optional()
    .isDate()
    .withMessage('Invalid work date format')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      if (date > now) {
        throw new Error('Work date cannot be in the future');
      }
      // Check if work date is not more than 30 days in the past
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (date < thirtyDaysAgo) {
        throw new Error('Work date cannot be more than 30 days in the past');
      }
      return true;
    }),
  
  body('hours_worked')
    .notEmpty()
    .withMessage('Hours worked is required')
    .isFloat({ min: 0.5, max: 24 })
    .withMessage('Hours worked must be between 0.5 and 24')
    .toFloat(),
  
  body('payment_amount')
    .notEmpty()
    .withMessage('Payment amount is required')
    .isFloat({ min: 0 })
    .withMessage('Payment amount must be a positive number')
    .toFloat()
    .custom((value, { req }) => {
      // Validate payment amount based on hours worked
      const hoursWorked = parseFloat(req.body.hours_worked);
      const maxPaymentPerHour = 1000; // Maximum LKR per hour
      if (value > hoursWorked * maxPaymentPerHour) {
        throw new Error(`Payment amount seems too high. Maximum allowed: LKR ${hoursWorked * maxPaymentPerHour}`);
      }
      return true;
    })
];

/**
 * Validation rules for updating a work record
 */
const updateWorkRecordValidation = [
  body('task_description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Task description must be between 10 and 1000 characters'),
  
  body('work_date')
    .optional()
    .isDate()
    .withMessage('Invalid work date format')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      if (date > now) {
        throw new Error('Work date cannot be in the future');
      }
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (date < thirtyDaysAgo) {
        throw new Error('Work date cannot be more than 30 days in the past');
      }
      return true;
    }),
  
  body('hours_worked')
    .optional()
    .isFloat({ min: 0.5, max: 24 })
    .withMessage('Hours worked must be between 0.5 and 24')
    .toFloat(),
  
  body('payment_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Payment amount must be a positive number')
    .toFloat()
    .custom((value, { req }) => {
      // Validate payment amount based on hours worked if both are provided
      if (req.body.hours_worked) {
        const hoursWorked = parseFloat(req.body.hours_worked);
        const maxPaymentPerHour = 1000;
        if (value > hoursWorked * maxPaymentPerHour) {
          throw new Error(`Payment amount seems too high. Maximum allowed: LKR ${hoursWorked * maxPaymentPerHour}`);
        }
      }
      return true;
    })
];

/**
 * Validation rules for approving payment
 */
const approvePaymentValidation = [
  body('payment_date')
    .optional()
    .isDate()
    .withMessage('Invalid payment date format')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      if (date > now) {
        throw new Error('Payment date cannot be in the future');
      }
      return true;
    })
];

module.exports = {
  createWorkRecordValidation,
  updateWorkRecordValidation,
  approvePaymentValidation
};