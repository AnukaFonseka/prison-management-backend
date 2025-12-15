const { body } = require('express-validator');
const { BEHAVIOUR_TYPE, SEVERITY_LEVEL } = require('../../config/constants');

/**
 * Validation rules for creating a behaviour record
 */
const createBehaviourRecordValidation = [
  body('prisoner_id')
    .notEmpty()
    .withMessage('Prisoner ID is required')
    .isInt({ min: 1 })
    .withMessage('Invalid prisoner ID')
    .toInt(),
  
  body('behaviour_type')
    .notEmpty()
    .withMessage('Behaviour type is required')
    .isIn(Object.values(BEHAVIOUR_TYPE))
    .withMessage(`Behaviour type must be one of: ${Object.values(BEHAVIOUR_TYPE).join(', ')}`),
  
  body('severity_level')
    .notEmpty()
    .withMessage('Severity level is required')
    .isIn(Object.values(SEVERITY_LEVEL))
    .withMessage(`Severity level must be one of: ${Object.values(SEVERITY_LEVEL).join(', ')}`),
  
  body('incident_date')
    .optional()
    .isDate()
    .withMessage('Invalid incident date format')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      if (date > now) {
        throw new Error('Incident date cannot be in the future');
      }
      // Check if incident date is not more than 90 days in the past
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      if (date < ninetyDaysAgo) {
        throw new Error('Incident date cannot be more than 90 days in the past');
      }
      return true;
    }),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),
  
  body('action_taken')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Action taken must not exceed 1000 characters'),
  
  body('witness_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Witness name must not exceed 255 characters'),
  
  body('sentence_adjustment_days')
    .optional()
    .isInt({ min: -365, max: 365 })
    .withMessage('Sentence adjustment must be between -365 and 365 days')
    .toInt()
    .custom((value, { req }) => {
      // Positive behaviours should reduce sentence (negative adjustment)
      // Negative behaviours should increase sentence (positive adjustment)
      if (req.body.behaviour_type === BEHAVIOUR_TYPE.POSITIVE && value > 0) {
        throw new Error('Positive behaviour should have negative or zero sentence adjustment (sentence reduction)');
      }
      if (req.body.behaviour_type === BEHAVIOUR_TYPE.NEGATIVE && value < 0) {
        throw new Error('Negative behaviour should have positive or zero sentence adjustment (sentence increase)');
      }
      return true;
    }),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters')
];

/**
 * Validation rules for updating a behaviour record
 */
const updateBehaviourRecordValidation = [
  body('behaviour_type')
    .optional()
    .isIn(Object.values(BEHAVIOUR_TYPE))
    .withMessage(`Behaviour type must be one of: ${Object.values(BEHAVIOUR_TYPE).join(', ')}`),
  
  body('severity_level')
    .optional()
    .isIn(Object.values(SEVERITY_LEVEL))
    .withMessage(`Severity level must be one of: ${Object.values(SEVERITY_LEVEL).join(', ')}`),
  
  body('incident_date')
    .optional()
    .isDate()
    .withMessage('Invalid incident date format')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      if (date > now) {
        throw new Error('Incident date cannot be in the future');
      }
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      if (date < ninetyDaysAgo) {
        throw new Error('Incident date cannot be more than 90 days in the past');
      }
      return true;
    }),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),
  
  body('action_taken')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Action taken must not exceed 1000 characters'),
  
  body('witness_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Witness name must not exceed 255 characters'),
  
  body('sentence_adjustment_days')
    .optional()
    .isInt({ min: -365, max: 365 })
    .withMessage('Sentence adjustment must be between -365 and 365 days')
    .toInt()
    .custom((value, { req }) => {
      if (req.body.behaviour_type === BEHAVIOUR_TYPE.POSITIVE && value > 0) {
        throw new Error('Positive behaviour should have negative or zero sentence adjustment (sentence reduction)');
      }
      if (req.body.behaviour_type === BEHAVIOUR_TYPE.NEGATIVE && value < 0) {
        throw new Error('Negative behaviour should have positive or zero sentence adjustment (sentence increase)');
      }
      return true;
    }),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters')
];

/**
 * Validation rules for approving sentence adjustment
 */
const approveSentenceAdjustmentValidation = [
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Approval notes must not exceed 1000 characters')
];

module.exports = {
  createBehaviourRecordValidation,
  updateBehaviourRecordValidation,
  approveSentenceAdjustmentValidation
};