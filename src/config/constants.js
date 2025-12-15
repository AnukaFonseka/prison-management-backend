module.exports = {
  PRISONER_STATUS: {
    ACTIVE: 'Active',
    RELEASED: 'Released',
    TRANSFERRED: 'Transferred',
    DECEASED: 'Deceased'
  },

  BEHAVIOUR_TYPE: {
    POSITIVE: 'Positive',
    NEGATIVE: 'Negative'
  },

  SEVERITY_LEVEL: {
    MINOR: 'Minor',
    MODERATE: 'Moderate',
    SEVERE: 'Severe'
  },

  PAYMENT_STATUS: {
    PENDING: 'Pending',
    PAID: 'Paid'
  },

  VISIT_STATUS: {
    SCHEDULED: 'Scheduled',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled'
  },

  PHOTO_TYPE: {
    PROFILE: 'Profile',
    FULL_BODY: 'Full Body',
    OTHER: 'Other'
  },

  GENDER: {
    MALE: 'Male',
    FEMALE: 'Female',
    OTHER: 'Other'
  },

  USER_ROLES: {
    SUPER_ADMIN: 'Super Admin',
    PRISON_ADMIN: 'Prison Admin',
    OFFICER: 'Officer',
    RECORDS_KEEPER: 'Records Keeper',
    VISITOR_MANAGER: 'Visitor Manager'
  },

  ADJUSTMENT_STATUS: {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    NOT_APPLICABLE: 'N/A'
  },

  PERMISSIONS: {
    // User Management
    MANAGE_USERS: 'manage_users',
    VIEW_USERS: 'view_users',
    CREATE_USER: 'create_user',
    UPDATE_USER: 'update_user',
    DELETE_USER: 'delete_user',
    
    // Prison Management
    MANAGE_PRISONS: 'manage_prisons',
    VIEW_PRISONS: 'view_prisons',
    
    // Prisoner Management
    MANAGE_PRISONERS: 'manage_prisoners',
    VIEW_PRISONERS: 'view_prisoners',
    REGISTER_PRISONER: 'register_prisoner',
    UPDATE_PRISONER: 'update_prisoner',
    DELETE_PRISONER: 'delete_prisoner',
    
    // Work Records
    MANAGE_WORK_RECORDS: 'manage_work_records',
    VIEW_WORK_RECORDS: 'view_work_records',
    RECORD_WORK: 'record_work',
    APPROVE_PAYMENT: 'approve_payment',
    
    // Behaviour Records
    MANAGE_BEHAVIOUR: 'manage_behaviour',
    VIEW_BEHAVIOUR: 'view_behaviour',
    RECORD_BEHAVIOUR: 'record_behaviour',
    ADJUST_SENTENCE: 'adjust_sentence',
    
    // Visitor Management
    MANAGE_VISITORS: 'manage_visitors',
    VIEW_VISITORS: 'view_visitors',
    SCHEDULE_VISIT: 'schedule_visit',
    APPROVE_VISIT: 'approve_visit',
    
    // Reports
    GENERATE_REPORTS: 'generate_reports',
    VIEW_REPORTS: 'view_reports'
  }
};