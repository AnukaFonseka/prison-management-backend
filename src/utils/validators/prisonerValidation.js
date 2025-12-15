const { body } = require('express-validator');
const { PRISONER_STATUS, GENDER, PHOTO_TYPE } = require('../../config/constants');

/**
 * Validation rules for registering a prisoner
 */
const registerPrisonerValidation = [
  body('full_name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Full name must be between 3 and 200 characters'),
  
  body('nic')
    .trim()
    .notEmpty()
    .withMessage('NIC is required')
    .matches(/^([0-9]{9}[vVxX]|[0-9]{12})$/)
    .withMessage('Invalid NIC format. Must be 9 digits followed by V/X or 12 digits'),
  
  body('case_number')
    .trim()
    .notEmpty()
    .withMessage('Case number is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Case number must be between 3 and 100 characters'),
  
  body('gender')
    .notEmpty()
    .withMessage('Gender is required')
    .isIn(Object.values(GENDER))
    .withMessage(`Gender must be one of: ${Object.values(GENDER).join(', ')}`),
  
  body('birthday')
    .notEmpty()
    .withMessage('Birthday is required')
    .isDate()
    .withMessage('Invalid date format')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      const age = now.getFullYear() - date.getFullYear();
      if (age < 18 || age > 120) {
        throw new Error('Age must be between 18 and 120 years');
      }
      return true;
    }),
  
  body('nationality')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Nationality must not exceed 100 characters'),
  
  body('admission_date')
    .optional()
    .isDate()
    .withMessage('Invalid admission date format')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      if (date > now) {
        throw new Error('Admission date cannot be in the future');
      }
      return true;
    }),
  
  body('expected_release_date')
    .optional()
    .isDate()
    .withMessage('Invalid expected release date format')
    .custom((value, { req }) => {
      const releaseDate = new Date(value);
      const admissionDate = new Date(req.body.admission_date || new Date());
      if (releaseDate < admissionDate) {
        throw new Error('Expected release date must be after admission date');
      }
      return true;
    }),
  
  // body('prison_id')
  //   .optional()
  //   .isInt({ min: 1 })
  //   .withMessage('Invalid prison ID')
  //   .toInt(),
  
  body('cell_number')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Cell number must not exceed 50 characters'),
  
  body('social_status')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Social status must not exceed 500 characters')
];

/**
 * Validation rules for updating a prisoner
 */
const updatePrisonerValidation = [
  body('full_name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Full name must be between 3 and 200 characters'),
  
  body('nic')
    .optional()
    .trim()
    .matches(/^([0-9]{9}[vVxX]|[0-9]{12})$/)
    .withMessage('Invalid NIC format. Must be 9 digits followed by V/X or 12 digits'),
  
  body('case_number')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Case number must be between 3 and 100 characters'),
  
  body('gender')
    .optional()
    .isIn(Object.values(GENDER))
    .withMessage(`Gender must be one of: ${Object.values(GENDER).join(', ')}`),
  
  body('birthday')
    .optional()
    .isDate()
    .withMessage('Invalid date format')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      const age = now.getFullYear() - date.getFullYear();
      if (age < 18 || age > 120) {
        throw new Error('Age must be between 18 and 120 years');
      }
      return true;
    }),
  
  body('nationality')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Nationality must not exceed 100 characters'),
  
  body('expected_release_date')
    .optional()
    .isDate()
    .withMessage('Invalid expected release date format'),
  
  body('status')
    .optional()
    .isIn(Object.values(PRISONER_STATUS))
    .withMessage(`Status must be one of: ${Object.values(PRISONER_STATUS).join(', ')}`),
  
  body('cell_number')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Cell number must not exceed 50 characters'),
  
  body('social_status')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Social status must not exceed 500 characters')
];

/**
 * Validation rules for family details
 */
const familyDetailsValidation = [
  body('family_member_name')
    .trim()
    .notEmpty()
    .withMessage('Family member name is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Family member name must be between 3 and 200 characters'),
  
  body('relationship')
    .trim()
    .notEmpty()
    .withMessage('Relationship is required')
    .isLength({ max: 100 })
    .withMessage('Relationship must not exceed 100 characters'),
  
  body('contact_number')
    .optional()
    .trim()
    .matches(/^[0-9\-+() ]{7,20}$/)
    .withMessage('Invalid contact number format'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters'),
  
  body('nic')
    .optional()
    .trim()
    .matches(/^([0-9]{9}[vVxX]|[0-9]{12})$/)
    .withMessage('Invalid NIC format. Must be 9 digits followed by V/X or 12 digits'),
  
  body('emergency_contact')
    .optional()
    .isBoolean()
    .withMessage('Emergency contact must be a boolean')
];

/**
 * Validation rules for body marks
 */
const bodyMarkValidation = [
  body('mark_description')
    .trim()
    .notEmpty()
    .withMessage('Mark description is required')
    .isLength({ min: 3, max: 500 })
    .withMessage('Mark description must be between 3 and 500 characters'),
  
  body('mark_location')
    .trim()
    .notEmpty()
    .withMessage('Mark location is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Mark location must be between 3 and 200 characters')
];

/**
 * Validation rules for transferring prisoner
 */
const transferPrisonerValidation = [
  body('target_prison_id')
    .notEmpty()
    .withMessage('Target prison ID is required')
    .isInt({ min: 1 })
    .withMessage('Invalid target prison ID')
    .toInt(),
  
  body('transfer_reason')
    .trim()
    .notEmpty()
    .withMessage('Transfer reason is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Transfer reason must be between 10 and 500 characters')
];

/**
 * Validation rules for releasing prisoner
 */
const releasePrisonerValidation = [
  body('release_reason')
    .trim()
    .notEmpty()
    .withMessage('Release reason is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Release reason must be between 10 and 500 characters'),
  
  body('release_notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Release notes must not exceed 1000 characters')
];

module.exports = {
  registerPrisonerValidation,
  updatePrisonerValidation,
  familyDetailsValidation,
  bodyMarkValidation,
  transferPrisonerValidation,
  releasePrisonerValidation
};