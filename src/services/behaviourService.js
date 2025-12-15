const db = require('../models');
const { USER_ROLES, BEHAVIOUR_TYPE, SEVERITY_LEVEL, PRISONER_STATUS } = require('../config/constants');
const { Op, DATEONLY } = require('sequelize');

/**
 * Check if user has access to prisoner's prison
 */
const checkPrisonAccess = (userPrisonId, prisonerPrisonId, userRole) => {
  if (userRole === USER_ROLES.SUPER_ADMIN) {
    return true;
  }
  return userPrisonId === prisonerPrisonId;
};

/**
 * Get all behaviour records with filtering and pagination
 */
const getAllBehaviourRecords = async (filters = {}, page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit;
    
    // Build where clause for behaviour records
    const behaviourRecordWhere = {};
    
    if (filters.behaviourType) {
      behaviourRecordWhere.behaviour_type = filters.behaviourType;
    }
    
    if (filters.severityLevel) {
      behaviourRecordWhere.severity_level = filters.severityLevel;
    }
    
    if (filters.adjustmentStatus) {
      behaviourRecordWhere.adjustment_status = filters.adjustmentStatus;
    }
    
    if (filters.startDate && filters.endDate) {
      behaviourRecordWhere.incident_date = {
        [Op.between]: [filters.startDate, filters.endDate]
      };
    } else if (filters.startDate) {
      behaviourRecordWhere.incident_date = {
        [Op.gte]: filters.startDate
      };
    } else if (filters.endDate) {
      behaviourRecordWhere.incident_date = {
        [Op.lte]: filters.endDate
      };
    }

    // Build include options
    const includeOptions = [
      {
        model: db.Prisoner,
        as: 'prisoner',
        attributes: ['prisoner_id', 'full_name', 'nic', 'case_number'],
        include: [
          {
            model: db.Prison,
            as: 'prison',
            attributes: ['prison_id', 'prison_name', 'location']
          }
        ]
      },
      {
        model: db.User,
        as: 'recorder',
        attributes: ['user_id', 'employee_full_name', 'username']
      }
    ];

    // Add prison filter if specified
    if (filters.prisonId) {
      includeOptions[0].include[0].where = { prison_id: filters.prisonId };
      includeOptions[0].required = true;
    }

    // Add prisoner filter if specified
    if (filters.prisonerId) {
      behaviourRecordWhere.prisoner_id = filters.prisonerId;
    }

    // Add search filter
    if (filters.search) {
      includeOptions[0].where = {
        [Op.or]: [
          { full_name: { [Op.like]: `%${filters.search}%` } },
          { nic: { [Op.like]: `%${filters.search}%` } },
          { case_number: { [Op.like]: `%${filters.search}%` } }
        ]
      };
      includeOptions[0].required = true;
    }

    // Get behaviour records with pagination
    const { count, rows: behaviourRecords } = await db.PrisonerBehaviourRecord.findAndCountAll({
      where: behaviourRecordWhere,
      include: includeOptions,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['incident_date', 'DESC'], ['created_at', 'DESC']],
      distinct: true
    });

    return {
      behaviourRecords: behaviourRecords.map(record => ({
        behaviourRecordId: record.behaviour_id,
        prisonerId: record.prisoner_id,
        prisoner: record.prisoner ? {
          prisonerId: record.prisoner.prisoner_id,
          fullName: record.prisoner.full_name,
          nic: record.prisoner.nic,
          caseNumber: record.prisoner.case_number,
          prison: record.prisoner.prison ? {
            prisonId: record.prisoner.prison.prison_id,
            prisonName: record.prisoner.prison.prison_name,
            location: record.prisoner.prison.location
          } : null
        } : null,
        behaviourType: record.behaviour_type,
        severityLevel: record.severity_level,
        incidentDate: record.incident_date,
        description: record.description,
        actionTaken: record.action_taken,
        witnessName: record.witness_name,
        sentenceAdjustmentDays: record.sentence_adjustment_days,
        adjustmentStatus: record.adjustment_status,
        adjustmentApprovedAt: record.adjustment_approved_at,
        notes: record.notes,
        recordedBy: record.recorder ? {
          userId: record.recorder.user_id,
          fullName: record.recorder.employee_full_name,
          username: record.recorder.username
        } : null,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      })),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get behaviour records for a specific prisoner
 */
const getBehaviourRecordsByPrisoner = async (prisonerId, userPrisonId, userRole, page = 1, limit = 10) => {
  try {
    // Check if prisoner exists
    const prisoner = await db.Prisoner.findByPk(prisonerId, {
      include: [
        {
          model: db.Prison,
          as: 'prison',
          attributes: ['prison_id', 'prison_name']
        }
      ]
    });

    if (!prisoner) {
      throw new Error('Prisoner not found');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, prisoner.prison_id, userRole)) {
      throw new Error('You do not have access to this prisoner');
    }

    const offset = (page - 1) * limit;

    // Get behaviour records
    const { count, rows: behaviourRecords } = await db.PrisonerBehaviourRecord.findAndCountAll({
      where: { prisoner_id: prisonerId },
      include: [
        {
          model: db.User,
          as: 'recorder',
          attributes: ['user_id', 'employee_full_name', 'username']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['incident_date', 'DESC'], ['created_at', 'DESC']]
    });

    // Calculate summary statistics
    const summaryStats = await db.PrisonerBehaviourRecord.findAll({
      where: { prisoner_id: prisonerId },
      attributes: [
        'behaviour_type',
        [db.sequelize.fn('COUNT', db.sequelize.col('behaviour_id')), 'count'],
        [db.sequelize.fn('SUM', db.sequelize.col('sentence_adjustment_days')), 'totalAdjustment']
      ],
      group: ['behaviour_type'],
      raw: true
    });

    // Calculate total approved adjustments
    const approvedAdjustments = await db.PrisonerBehaviourRecord.findOne({
      where: { 
        prisoner_id: prisonerId,
        adjustment_status: 'Approved'
      },
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('sentence_adjustment_days')), 'totalApprovedAdjustment']
      ],
      raw: true
    });

    const summary = {
      totalRecords: count,
      positiveCount: 0,
      negativeCount: 0,
      totalSentenceAdjustment: 0,
      approvedAdjustment: parseInt(approvedAdjustments?.totalApprovedAdjustment) || 0
    };

    summaryStats.forEach(stat => {
      if (stat.behaviour_type === BEHAVIOUR_TYPE.POSITIVE) {
        summary.positiveCount = parseInt(stat.count);
      } else if (stat.behaviour_type === BEHAVIOUR_TYPE.NEGATIVE) {
        summary.negativeCount = parseInt(stat.count);
      }
      summary.totalSentenceAdjustment += parseInt(stat.totalAdjustment) || 0;
    });

    return {
      behaviourRecords: behaviourRecords.map(record => ({
        behaviourRecordId: record.behaviour_record_id,
        behaviourType: record.behaviour_type,
        severityLevel: record.severity_level,
        incidentDate: record.incident_date,
        description: record.description,
        actionTaken: record.action_taken,
        witnessName: record.witness_name,
        sentenceAdjustmentDays: record.sentence_adjustment_days,
        adjustmentStatus: record.adjustment_status,
        adjustmentApprovedAt: record.adjustment_approved_at,
        notes: record.notes,
        recordedBy: record.recorder ? {
          userId: record.recorder.user_id,
          fullName: record.recorder.employee_full_name,
          username: record.recorder.username
        } : null,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      })),
      summary,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get behaviour record by ID
 */
const getBehaviourRecordById = async (behaviourRecordId, userPrisonId, userRole) => {
  try {
    const behaviourRecord = await db.PrisonerBehaviourRecord.findByPk(behaviourRecordId, {
      include: [
        {
          model: db.Prisoner,
          as: 'prisoner',
          attributes: ['prisoner_id', 'full_name', 'nic', 'case_number'],
          include: [
            {
              model: db.Prison,
              as: 'prison',
              attributes: ['prison_id', 'prison_name', 'location']
            }
          ]
        },
        {
          model: db.User,
          as: 'recorder',
          attributes: ['user_id', 'employee_full_name', 'username', 'email']
        }
      ]
    });

    if (!behaviourRecord) {
      throw new Error('Behaviour record not found');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, behaviourRecord.prisoner.prison.prison_id, userRole)) {
      throw new Error('You do not have access to this behaviour record');
    }

    return {
      behaviourRecordId: behaviourRecord.behaviour_record_id,
      prisonerId: behaviourRecord.prisoner_id,
      prisoner: behaviourRecord.prisoner ? {
        prisonerId: behaviourRecord.prisoner.prisoner_id,
        fullName: behaviourRecord.prisoner.full_name,
        nic: behaviourRecord.prisoner.nic,
        caseNumber: behaviourRecord.prisoner.case_number,
        prison: behaviourRecord.prisoner.prison ? {
          prisonId: behaviourRecord.prisoner.prison.prison_id,
          prisonName: behaviourRecord.prisoner.prison.prison_name,
          location: behaviourRecord.prisoner.prison.location
        } : null
      } : null,
      behaviourType: behaviourRecord.behaviour_type,
      severityLevel: behaviourRecord.severity_level,
      incidentDate: behaviourRecord.incident_date,
      description: behaviourRecord.description,
      actionTaken: behaviourRecord.action_taken,
      witnessName: behaviourRecord.witness_name,
      sentenceAdjustmentDays: behaviourRecord.sentence_adjustment_days,
      adjustmentStatus: behaviourRecord.adjustment_status,
      adjustmentApprovedAt: behaviourRecord.adjustment_approved_at,
      notes: behaviourRecord.notes,
      recordedBy: behaviourRecord.recorder ? {
        userId: behaviourRecord.recorder.user_id,
        fullName: behaviourRecord.recorder.employee_full_name,
        username: behaviourRecord.recorder.username,
        email: behaviourRecord.recorder.email
      } : null,
      createdAt: behaviourRecord.createdAt,
      updatedAt: behaviourRecord.updatedAt
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Create new behaviour record
 */
const createBehaviourRecord = async (behaviourData, userId, userPrisonId, userRole) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    // Check if prisoner exists and is active
    const prisoner = await db.Prisoner.findByPk(behaviourData.prisoner_id, {
      include: [
        {
          model: db.Prison,
          as: 'prison',
          attributes: ['prison_id', 'prison_name']
        }
      ]
    });

    if (!prisoner) {
      throw new Error('Prisoner not found');
    }

    if (prisoner.status !== PRISONER_STATUS.ACTIVE) {
      throw new Error('Behaviour records can only be created for active prisoners');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, prisoner.prison_id, userRole)) {
      throw new Error('You do not have access to this prisoner');
    }

    // Determine adjustment status
    let adjustmentStatus = 'N/A';
    if (behaviourData.sentence_adjustment_days && behaviourData.sentence_adjustment_days !== 0) {
      adjustmentStatus = 'Pending';
    }

    // Create behaviour record
    const newBehaviourRecord = await db.PrisonerBehaviourRecord.create({
      prisoner_id: behaviourData.prisoner_id,
      behaviour_type: behaviourData.behaviour_type,
      severity_level: behaviourData.severity_level,
      incident_date: behaviourData.incident_date || new Date(),
      description: behaviourData.description,
      action_taken: behaviourData.action_taken,
      witness_name: behaviourData.witness_name,
      sentence_adjustment_days: behaviourData.sentence_adjustment_days || 0,
      adjustment_status: adjustmentStatus,
      notes: behaviourData.notes,
      recorded_by: userId
    }, { transaction });

    await transaction.commit();

    // Fetch created behaviour record with details
    return await getBehaviourRecordById(newBehaviourRecord.behaviour_id, userPrisonId, userRole);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Update behaviour record
 */
const updateBehaviourRecord = async (behaviourRecordId, updateData, userPrisonId, userRole) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const behaviourRecord = await db.PrisonerBehaviourRecord.findByPk(behaviourRecordId, {
      include: [
        {
          model: db.Prisoner,
          as: 'prisoner',
          attributes: ['prison_id']
        }
      ]
    });

    if (!behaviourRecord) {
      throw new Error('Behaviour record not found');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, behaviourRecord.prisoner.prison.prison_id, userRole)) {
      throw new Error('You do not have access to this behaviour record');
    }

    // Cannot update already approved records
    if (behaviourRecord.adjustment_status === 'Approved') {
      throw new Error('Cannot update behaviour record with approved sentence adjustment');
    }

    // Prepare update data
    const allowedUpdates = {
      behaviour_type: updateData.behaviour_type,
      severity_level: updateData.severity_level,
      incident_date: updateData.incident_date,
      description: updateData.description,
      action_taken: updateData.action_taken,
      witness_name: updateData.witness_name,
      sentence_adjustment_days: updateData.sentence_adjustment_days,
      notes: updateData.notes
    };

    // Remove undefined values
    Object.keys(allowedUpdates).forEach(key => 
      allowedUpdates[key] === undefined && delete allowedUpdates[key]
    );

    // Update adjustment status if sentence adjustment is being modified
    if ('sentence_adjustment_days' in allowedUpdates) {
      if (allowedUpdates.sentence_adjustment_days && allowedUpdates.sentence_adjustment_days !== 0) {
        allowedUpdates.adjustment_status = 'Pending';
      } else {
        allowedUpdates.adjustment_status = 'N/A';
      }
    }

    await behaviourRecord.update(allowedUpdates, { transaction });

    await transaction.commit();

    // Return updated behaviour record
    return await getBehaviourRecordById(behaviourRecordId, userPrisonId, userRole);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Delete behaviour record
 */
const deleteBehaviourRecord = async (behaviourRecordId, userPrisonId, userRole) => {
  try {
    const behaviourRecord = await db.PrisonerBehaviourRecord.findByPk(behaviourRecordId, {
      include: [
        {
          model: db.Prisoner,
          as: 'prisoner',
          attributes: ['prison_id']
        }
      ]
    });

    if (!behaviourRecord) {
      throw new Error('Behaviour record not found');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, behaviourRecord.prisoner.prison_id, userRole)) {
      throw new Error('You do not have access to this behaviour record');
    }

    // Cannot delete already approved records
    if (behaviourRecord.adjustment_status === 'Approved') {
      throw new Error('Cannot delete behaviour record with approved sentence adjustment');
    }

    await behaviourRecord.destroy();
  } catch (error) {
    throw error;
  }
};

/**
 * Approve sentence adjustment
 */
const approveSentenceAdjustment = async (behaviourRecordId, notes, userPrisonId, userRole) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const behaviourRecord = await db.PrisonerBehaviourRecord.findByPk(behaviourRecordId, {
      include: [
        {
          model: db.Prisoner,
          as: 'prisoner',
          attributes: ['prisoner_id', 'prison_id', 'full_name', 'expected_release_date']
        }
      ]
    });

    if (!behaviourRecord) {
      throw new Error('Behaviour record not found');
    }

    console.log(behaviourRecord)

    // Check access
    if (!checkPrisonAccess(userPrisonId, behaviourRecord.prisoner.prison_id, userRole)) {
      throw new Error('You do not have access to this behaviour record');
    }

    // Check if adjustment is pending
    if (behaviourRecord.adjustment_status !== 'Pending') {
      throw new Error('This behaviour record does not have a pending sentence adjustment');
    }

    // Check if sentence adjustment days exist
    if (!behaviourRecord.sentence_adjustment_days || behaviourRecord.sentence_adjustment_days === 0) {
      throw new Error('No sentence adjustment to approve');
    }

    // Update prisoner's sentence end date
    const prisoner = behaviourRecord.prisoner;
    let previousReleaseDate;
    if (prisoner.expected_release_date) {
      const currentEndDate = new Date(prisoner.expected_release_date);
      previousReleaseDate = new Date(currentEndDate);
      previousReleaseDate.setDate(previousReleaseDate.getDate());
      const adjustmentDays = behaviourRecord.sentence_adjustment_days;
      
      // Add the adjustment (negative for reduction, positive for increase)
      currentEndDate.setDate(currentEndDate.getDate() + adjustmentDays);
      
      await prisoner.update({
        expected_release_date: currentEndDate
      }, { transaction });
    }

    // Update behaviour record
    await behaviourRecord.update({
      adjustment_status: 'Approved',
      adjustment_approved_at: new Date(),
      notes: notes || behaviourRecord.notes
    }, { transaction });

    await transaction.commit();

    // Return updated behaviour record with prisoner info
    const updatedRecord = await getBehaviourRecordById(behaviourRecordId, userPrisonId, userRole);
    
    return {
      ...updatedRecord,
      adjustmentApplied: {
        adjustmentDays: behaviourRecord.sentence_adjustment_days,
        previousEndDate: previousReleaseDate,
        newEndDate: prisoner.expected_release_date
      }
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Reject sentence adjustment
 */
const rejectSentenceAdjustment = async (behaviourRecordId, reason, userPrisonId, userRole) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const behaviourRecord = await db.PrisonerBehaviourRecord.findByPk(behaviourRecordId, {
      include: [
        {
          model: db.Prisoner,
          as: 'prisoner',
          attributes: ['prison_id']
        }
      ]
    });

    if (!behaviourRecord) {
      throw new Error('Behaviour record not found');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, behaviourRecord.prisoner.prison.prison_id, userRole)) {
      throw new Error('You do not have access to this behaviour record');
    }

    // Check if adjustment is pending
    if (behaviourRecord.adjustment_status !== 'Pending') {
      throw new Error('This behaviour record does not have a pending sentence adjustment');
    }

    // Update behaviour record
    await behaviourRecord.update({
      adjustment_status: 'Rejected',
      notes: reason ? `REJECTION REASON: ${reason}${behaviourRecord.notes ? '\n\n' + behaviourRecord.notes : ''}` : behaviourRecord.notes
    }, { transaction });

    await transaction.commit();

    // Return updated behaviour record
    return await getBehaviourRecordById(behaviourRecordId, userPrisonId, userRole);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Get pending sentence adjustments
 */
const getPendingAdjustments = async (prisonId = null, page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit;
    
    // Build include options
    const includeOptions = [
      {
        model: db.Prisoner,
        as: 'prisoner',
        attributes: ['prisoner_id', 'full_name', 'nic', 'case_number'],
        include: [
          {
            model: db.Prison,
            as: 'prison',
            attributes: ['prison_id', 'prison_name', 'location']
          }
        ]
      },
      {
        model: db.User,
        as: 'recorder',
        attributes: ['user_id', 'employee_full_name']
      }
    ];

    // Add prison filter if specified
    if (prisonId) {
      includeOptions[0].include[0].where = { prison_id: prisonId };
      includeOptions[0].required = true;
    }

    // Get pending adjustments
    const { count, rows: behaviourRecords } = await db.PrisonerBehaviourRecord.findAndCountAll({
      where: { adjustment_status: 'Pending' },
      include: includeOptions,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['incident_date', 'ASC']],
      distinct: true
    });

    // Calculate summary
    const summary = await db.PrisonerBehaviourRecord.findOne({
      where: { adjustment_status: 'Pending' },
      attributes: [
        [db.sequelize.fn('COUNT', db.sequelize.col('behaviour_record_id')), 'totalPending'],
        [db.sequelize.fn('SUM', 
          db.sequelize.literal(`CASE WHEN sentence_adjustment_days < 0 THEN 1 ELSE 0 END`)
        ), 'reductionsCount'],
        [db.sequelize.fn('SUM', 
          db.sequelize.literal(`CASE WHEN sentence_adjustment_days > 0 THEN 1 ELSE 0 END`)
        ), 'increasesCount']
      ],
      raw: true
    });

    return {
      behaviourRecords: behaviourRecords.map(record => ({
        behaviourRecordId: record.behaviour_record_id,
        prisonerId: record.prisoner_id,
        prisoner: record.prisoner ? {
          prisonerId: record.prisoner.prisoner_id,
          fullName: record.prisoner.full_name,
          nic: record.prisoner.nic,
          caseNumber: record.prisoner.case_number,
          prison: record.prisoner.prison ? {
            prisonId: record.prisoner.prison.prison_id,
            prisonName: record.prisoner.prison.prison_name,
            location: record.prisoner.prison.location
          } : null
        } : null,
        behaviourType: record.behaviour_type,
        severityLevel: record.severity_level,
        incidentDate: record.incident_date,
        description: record.description,
        sentenceAdjustmentDays: record.sentence_adjustment_days,
        adjustmentStatus: record.adjustment_status,
        recordedBy: record.recorder ? {
          userId: record.recorder.user_id,
          fullName: record.recorder.employee_full_name
        } : null,
        createdAt: record.createdAt
      })),
      summary: {
        totalPending: parseInt(summary.totalPending) || 0,
        reductionsCount: parseInt(summary.reductionsCount) || 0,
        increasesCount: parseInt(summary.increasesCount) || 0
      },
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Calculate behaviour score for a prisoner
 */
const calculateBehaviourScore = async (prisonerId, userPrisonId, userRole, months = 6) => {
  try {
    // Check if prisoner exists
    const prisoner = await db.Prisoner.findByPk(prisonerId, {
      include: [
        {
          model: db.Prison,
          as: 'prison',
          attributes: ['prison_id', 'prison_name']
        }
      ]
    });

    if (!prisoner) {
      throw new Error('Prisoner not found');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, prisoner.prison_id, userRole)) {
      throw new Error('You do not have access to this prisoner');
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Get behaviour records within the date range
    const behaviourRecords = await db.PrisonerBehaviourRecord.findAll({
      where: {
        prisoner_id: prisonerId,
        incident_date: {
          [Op.between]: [startDate, endDate]
        }
      }
    });

    // Calculate score based on behaviour type and severity
    const scoreWeights = {
      [BEHAVIOUR_TYPE.POSITIVE]: {
        [SEVERITY_LEVEL.MINOR]: 5,
        [SEVERITY_LEVEL.MODERATE]: 10,
        [SEVERITY_LEVEL.SEVERE]: 15
      },
      [BEHAVIOUR_TYPE.NEGATIVE]: {
        [SEVERITY_LEVEL.MINOR]: -5,
        [SEVERITY_LEVEL.MODERATE]: -10,
        [SEVERITY_LEVEL.SEVERE]: -20
      }
    };

    let totalScore = 100; // Start with base score of 100
    const breakdown = {
      positive: { minor: 0, moderate: 0, severe: 0, points: 0 },
      negative: { minor: 0, moderate: 0, severe: 0, points: 0 }
    };

    behaviourRecords.forEach(record => {
      const points = scoreWeights[record.behaviour_type][record.severity_level];
      totalScore += points;

      const category = record.behaviour_type === BEHAVIOUR_TYPE.POSITIVE ? 'positive' : 'negative';
      const severity = record.severity_level.toLowerCase();
      
      breakdown[category][severity]++;
      breakdown[category].points += points;
    });

    // Ensure score is between 0 and 150
    totalScore = Math.max(0, Math.min(150, totalScore));

    // Determine behaviour rating
    let rating = 'Poor';
    if (totalScore >= 120) rating = 'Excellent';
    else if (totalScore >= 100) rating = 'Good';
    else if (totalScore >= 80) rating = 'Fair';

    return {
      prisonerId: prisoner.prisoner_id,
      prisonerName: prisoner.full_name,
      calculationPeriod: {
        startDate,
        endDate,
        months
      },
      score: totalScore,
      rating,
      totalRecords: behaviourRecords.length,
      breakdown,
      interpretation: {
        excellent: '120-150 points',
        good: '100-119 points',
        fair: '80-99 points',
        poor: '0-79 points'
      }
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get behaviour statistics
 */
const getBehaviourStatistics = async (prisonId = null, startDate = null, endDate = null) => {
  try {
    // Build where clause
    const whereClause = {};
    
    if (startDate && endDate) {
      whereClause.incident_date = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      whereClause.incident_date = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      whereClause.incident_date = {
        [Op.lte]: endDate
      };
    }

    // Build include options
    const includeOptions = [];
    if (prisonId) {
      includeOptions.push({
        model: db.Prisoner,
        as: 'prisoner',
        attributes: [],
        include: [
          {
            model: db.Prison,
            as: 'prison',
            attributes: [],
            where: { prison_id: prisonId }
          }
        ],
        required: true
      });
    }

    // Get overall statistics
    const overallStats = await db.PrisonerBehaviourRecord.findOne({
      where: whereClause,
      include: includeOptions,
      attributes: [
        [db.sequelize.fn('COUNT', db.sequelize.col('behaviour_record_id')), 'totalRecords'],
        [db.sequelize.fn('SUM', 
          db.sequelize.literal(`CASE WHEN behaviour_type = 'Positive' THEN 1 ELSE 0 END`)
        ), 'positiveCount'],
        [db.sequelize.fn('SUM', 
          db.sequelize.literal(`CASE WHEN behaviour_type = 'Negative' THEN 1 ELSE 0 END`)
        ), 'negativeCount'],
        [db.sequelize.fn('SUM', db.sequelize.col('sentence_adjustment_days')), 'totalAdjustmentDays']
      ],
      raw: true
    });

    // Get statistics by severity level
    const severityStats = await db.PrisonerBehaviourRecord.findAll({
      where: whereClause,
      include: includeOptions,
      attributes: [
        'severity_level',
        'behaviour_type',
        [db.sequelize.fn('COUNT', db.sequelize.col('behaviour_record_id')), 'count']
      ],
      group: ['severity_level', 'behaviour_type']
    });

    // Get statistics by adjustment status
    const adjustmentStats = await db.PrisonerBehaviourRecord.findAll({
      where: whereClause,
      include: includeOptions,
      attributes: [
        'adjustment_status',
        [db.sequelize.fn('COUNT', db.sequelize.col('behaviour_record_id')), 'count'],
        [db.sequelize.fn('SUM', db.sequelize.col('sentence_adjustment_days')), 'totalDays']
      ],
      group: ['adjustment_status']
    });

    // Get most frequent incident types (by description keywords)
    const recentRecords = await db.PrisonerBehaviourRecord.findAll({
      where: whereClause,
      include: includeOptions,
      attributes: ['behaviour_type', 'severity_level', 'description'],
      order: [['incident_date', 'DESC']],
      limit: 50
    });

    return {
      overall: {
        totalRecords: parseInt(overallStats.totalRecords) || 0,
        positiveCount: parseInt(overallStats.positiveCount) || 0,
        negativeCount: parseInt(overallStats.negativeCount) || 0,
        totalAdjustmentDays: parseInt(overallStats.totalAdjustmentDays) || 0
      },
      bySeverity: severityStats.map(stat => ({
        severityLevel: stat.severity_level,
        behaviourType: stat.behaviour_type,
        count: parseInt(stat.dataValues.count)
      })),
      byAdjustmentStatus: adjustmentStats.map(stat => ({
        status: stat.adjustment_status,
        count: parseInt(stat.dataValues.count),
        totalDays: parseInt(stat.dataValues.totalDays) || 0
      })),
      trends: {
        positiveRate: overallStats.totalRecords > 0 
          ? ((parseInt(overallStats.positiveCount) / parseInt(overallStats.totalRecords)) * 100).toFixed(2) 
          : 0,
        negativeRate: overallStats.totalRecords > 0 
          ? ((parseInt(overallStats.negativeCount) / parseInt(overallStats.totalRecords)) * 100).toFixed(2) 
          : 0
      }
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllBehaviourRecords,
  getBehaviourRecordsByPrisoner,
  getBehaviourRecordById,
  createBehaviourRecord,
  updateBehaviourRecord,
  deleteBehaviourRecord,
  approveSentenceAdjustment,
  rejectSentenceAdjustment,
  getPendingAdjustments,
  calculateBehaviourScore,
  getBehaviourStatistics
};