const { body } = require('express-validator');
const { VISIT_STATUS } = require('../../config/constants');

/**
 * Validation rules for creating a visit
 */
const createVisitValidation = [
  body('prisoner_id')
    .notEmpty()
    .withMessage('Prisoner ID is required')
    .isInt({ min: 1 })
    .withMessage('Invalid prisoner ID')
    .toInt(),
  
  body('visitor_id')
    .notEmpty()
    .withMessage('Visitor ID is required')
    .isInt({ min: 1 })
    .withMessage('Invalid visitor ID')
    .toInt(),
  
  body('relationship')
    .trim()
    .notEmpty()
    .withMessage('Relationship is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Relationship must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s-]+$/)
    .withMessage('Relationship can only contain letters, spaces and hyphens'),
  
  body('visit_date')
    .notEmpty()
    .withMessage('Visit date is required')
    .isDate()
    .withMessage('Invalid visit date format')
    .custom((value) => {
      const visitDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (visitDate < today) {
        throw new Error('Visit date cannot be in the past');
      }
      
      // Check if visit date is not more than 30 days in the future
      const maxFutureDate = new Date();
      maxFutureDate.setDate(maxFutureDate.getDate() + 30);
      
      if (visitDate > maxFutureDate) {
        throw new Error('Visit date cannot be more than 30 days in the future');
      }
      
      return true;
    }),
  
  body('visit_time_start')
    .notEmpty()
    .withMessage('Visit start time is required')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .withMessage('Visit start time must be in HH:MM:SS format'),
  
  body('visit_time_end')
    .notEmpty()
    .withMessage('Visit end time is required')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .withMessage('Visit end time must be in HH:MM:SS format')
    .custom((value, { req }) => {
      const startTime = req.body.visit_time_start;
      if (startTime && value <= startTime) {
        throw new Error('Visit end time must be after start time');
      }
      
      // Validate visit duration (max 2 hours)
      const start = new Date(`2000-01-01 ${startTime}`);
      const end = new Date(`2000-01-01 ${value}`);
      const durationMs = end - start;
      const durationMinutes = durationMs / (1000 * 60);
      
      if (durationMinutes > 120) {
        throw new Error('Visit duration cannot exceed 2 hours');
      }
      
      if (durationMinutes < 15) {
        throw new Error('Visit duration must be at least 15 minutes');
      }
      
      return true;
    }),
  
  body('purpose')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Purpose must not exceed 500 characters'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters')
];

/**
 * Validation rules for updating a visit
 */
const updateVisitValidation = [
  body('relationship')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Relationship must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s-]+$/)
    .withMessage('Relationship can only contain letters, spaces and hyphens'),
  
  body('visit_date')
    .optional()
    .isDate()
    .withMessage('Invalid visit date format')
    .custom((value) => {
      const visitDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (visitDate < today) {
        throw new Error('Visit date cannot be in the past');
      }
      
      const maxFutureDate = new Date();
      maxFutureDate.setDate(maxFutureDate.getDate() + 30);
      
      if (visitDate > maxFutureDate) {
        throw new Error('Visit date cannot be more than 30 days in the future');
      }
      
      return true;
    }),
  
  body('visit_time_start')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .withMessage('Visit start time must be in HH:MM:SS format'),
  
  body('visit_time_end')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .withMessage('Visit end time must be in HH:MM:SS format')
    .custom((value, { req }) => {
      const startTime = req.body.visit_time_start;
      if (startTime && value <= startTime) {
        throw new Error('Visit end time must be after start time');
      }
      
      if (startTime) {
        const start = new Date(`2000-01-01 ${startTime}`);
        const end = new Date(`2000-01-01 ${value}`);
        const durationMs = end - start;
        const durationMinutes = durationMs / (1000 * 60);
        
        if (durationMinutes > 120) {
          throw new Error('Visit duration cannot exceed 2 hours');
        }
        
        if (durationMinutes < 15) {
          throw new Error('Visit duration must be at least 15 minutes');
        }
      }
      
      return true;
    }),
  
  body('purpose')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Purpose must not exceed 500 characters'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters')
];

/**
 * Validation rules for updating visit status
 */
const updateVisitStatusValidation = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(Object.values(VISIT_STATUS))
    .withMessage(`Status must be one of: ${Object.values(VISIT_STATUS).join(', ')}`),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters')
];

module.exports = {
  createVisitValidation,
  updateVisitValidation,
  updateVisitStatusValidation
};