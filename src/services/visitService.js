const db = require('../models');
const { USER_ROLES, VISIT_STATUS, PRISONER_STATUS } = require('../config/constants');
const { Op } = require('sequelize');

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
 * Get all visits with filtering and pagination
 */
const getAllVisits = async (filters = {}, page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit;
    
    // Build where clause for visits
    const visitWhereClause = {};
    
    if (filters.visitorId) {
      visitWhereClause.visitor_id = filters.visitorId;
    }
    
    if (filters.status) {
      visitWhereClause.status = filters.status;
    }
    
    if (filters.startDate && filters.endDate) {
      visitWhereClause.visit_date = {
        [Op.between]: [filters.startDate, filters.endDate]
      };
    } else if (filters.startDate) {
      visitWhereClause.visit_date = {
        [Op.gte]: filters.startDate
      };
    } else if (filters.endDate) {
      visitWhereClause.visit_date = {
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
        model: db.Visitor,
        as: 'visitor',
        attributes: ['visitor_id', 'visitor_name', 'nic', 'mobile_number']
      },
      {
        model: db.User,
        as: 'approver',
        attributes: ['user_id', 'employee_full_name']
      }
    ];

    // Add prison filter if specified
    if (filters.prisonId) {
      includeOptions[0].include[0].where = { prison_id: filters.prisonId };
      includeOptions[0].required = true;
    }

    // Add prisoner filter if specified
    if (filters.prisonerId) {
      visitWhereClause.prisoner_id = filters.prisonerId;
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

    // Get visits with pagination
    const { count, rows: visits } = await db.Visit.findAndCountAll({
      where: visitWhereClause,
      include: includeOptions,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['visit_date', 'DESC'], ['visit_time_start', 'DESC']],
      distinct: true
    });

    return {
      visits: visits.map(visit => ({
        visitId: visit.visit_id,
        prisoner: visit.prisoner ? {
          prisonerId: visit.prisoner.prisoner_id,
          fullName: visit.prisoner.full_name,
          nic: visit.prisoner.nic,
          caseNumber: visit.prisoner.case_number,
          prison: visit.prisoner.prison ? {
            prisonId: visit.prisoner.prison.prison_id,
            prisonName: visit.prisoner.prison.prison_name,
            location: visit.prisoner.prison.location
          } : null
        } : null,
        visitor: visit.visitor ? {
          visitorId: visit.visitor.visitor_id,
          visitorName: visit.visitor.visitor_name,
          nic: visit.visitor.nic,
          mobileNumber: visit.visitor.mobile_number
        } : null,
        relationship: visit.relationship,
        visitDate: visit.visit_date,
        visitTimeStart: visit.visit_time_start,
        visitTimeEnd: visit.visit_time_end,
        purpose: visit.purpose,
        status: visit.status,
        approvedBy: visit.approver ? {
          userId: visit.approver.user_id,
          fullName: visit.approver.employee_full_name
        } : null,
        notes: visit.notes,
        createdAt: visit.created_at
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
 * Get visits for a specific prisoner
 */
const getVisitsByPrisoner = async (prisonerId, userPrisonId, userRole, page = 1, limit = 10) => {
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

    // Get visits
    const { count, rows: visits } = await db.Visit.findAndCountAll({
      where: { prisoner_id: prisonerId },
      include: [
        {
          model: db.Visitor,
          as: 'visitor',
          attributes: ['visitor_id', 'visitor_name', 'nic', 'mobile_number']
        },
        {
          model: db.User,
          as: 'approver',
          attributes: ['user_id', 'employee_full_name']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['visit_date', 'DESC'], ['visit_time_start', 'DESC']]
    });

    // Calculate summary
    const summary = await db.Visit.findAll({
      where: { prisoner_id: prisonerId },
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('visit_id')), 'count']
      ],
      group: ['status']
    });

    return {
      visits: visits.map(visit => ({
        visitId: visit.visit_id,
        visitor: visit.visitor ? {
          visitorId: visit.visitor.visitor_id,
          visitorName: visit.visitor.visitor_name,
          nic: visit.visitor.nic,
          mobileNumber: visit.visitor.mobile_number
        } : null,
        relationship: visit.relationship,
        visitDate: visit.visit_date,
        visitTimeStart: visit.visit_time_start,
        visitTimeEnd: visit.visit_time_end,
        purpose: visit.purpose,
        status: visit.status,
        approvedBy: visit.approver ? {
          userId: visit.approver.user_id,
          fullName: visit.approver.employee_full_name
        } : null,
        notes: visit.notes,
        createdAt: visit.created_at
      })),
      summary: summary.reduce((acc, stat) => {
        acc[stat.status.toLowerCase()] = parseInt(stat.dataValues.count);
        return acc;
      }, { scheduled: 0, completed: 0, cancelled: 0 }),
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
 * Get upcoming scheduled visits
 */
const getUpcomingVisits = async (prisonId = null, page = 1, limit = 10) => {
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
        model: db.Visitor,
        as: 'visitor',
        attributes: ['visitor_id', 'visitor_name', 'nic', 'mobile_number']
      }
    ];

    // Add prison filter if specified
    if (prisonId) {
      includeOptions[0].include[0].where = { prison_id: prisonId };
      includeOptions[0].required = true;
    }

    // Get upcoming visits
    const { count, rows: visits } = await db.Visit.findAndCountAll({
      where: { 
        status: VISIT_STATUS.SCHEDULED,
        visit_date: {
          [Op.gte]: new Date()
        }
      },
      include: includeOptions,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['visit_date', 'ASC'], ['visit_time_start', 'ASC']],
      distinct: true
    });

    return {
      visits: visits.map(visit => ({
        visitId: visit.visit_id,
        prisoner: visit.prisoner ? {
          prisonerId: visit.prisoner.prisoner_id,
          fullName: visit.prisoner.full_name,
          nic: visit.prisoner.nic,
          caseNumber: visit.prisoner.case_number,
          prison: visit.prisoner.prison ? {
            prisonId: visit.prisoner.prison.prison_id,
            prisonName: visit.prisoner.prison.prison_name,
            location: visit.prisoner.prison.location
          } : null
        } : null,
        visitor: visit.visitor ? {
          visitorId: visit.visitor.visitor_id,
          visitorName: visit.visitor.visitor_name,
          nic: visit.visitor.nic,
          mobileNumber: visit.visitor.mobile_number
        } : null,
        relationship: visit.relationship,
        visitDate: visit.visit_date,
        visitTimeStart: visit.visit_time_start,
        visitTimeEnd: visit.visit_time_end,
        purpose: visit.purpose,
        status: visit.status
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
 * Get visit by ID
 */
const getVisitById = async (visitId, userPrisonId, userRole) => {
  try {
    const visit = await db.Visit.findByPk(visitId, {
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
          model: db.Visitor,
          as: 'visitor',
          attributes: ['visitor_id', 'visitor_name', 'nic', 'mobile_number', 'address']
        },
        {
          model: db.User,
          as: 'approver',
          attributes: ['user_id', 'employee_full_name', 'username', 'email']
        }
      ]
    });

    if (!visit) {
      throw new Error('Visit not found');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, visit.prisoner.prison.prison_id, userRole)) {
      throw new Error('You do not have access to this visit');
    }

    return {
      visitId: visit.visit_id,
      prisoner: visit.prisoner ? {
        prisonerId: visit.prisoner.prisoner_id,
        fullName: visit.prisoner.full_name,
        nic: visit.prisoner.nic,
        caseNumber: visit.prisoner.case_number,
        prison: visit.prisoner.prison ? {
          prisonId: visit.prisoner.prison.prison_id,
          prisonName: visit.prisoner.prison.prison_name,
          location: visit.prisoner.prison.location
        } : null
      } : null,
      visitor: visit.visitor ? {
        visitorId: visit.visitor.visitor_id,
        visitorName: visit.visitor.visitor_name,
        nic: visit.visitor.nic,
        mobileNumber: visit.visitor.mobile_number,
        address: visit.visitor.address
      } : null,
      relationship: visit.relationship,
      visitDate: visit.visit_date,
      visitTimeStart: visit.visit_time_start,
      visitTimeEnd: visit.visit_time_end,
      purpose: visit.purpose,
      status: visit.status,
      approvedBy: visit.approver ? {
        userId: visit.approver.user_id,
        fullName: visit.approver.employee_full_name,
        username: visit.approver.username,
        email: visit.approver.email
      } : null,
      notes: visit.notes,
      createdAt: visit.created_at,
      updatedAt: visit.updated_at
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Schedule new visit
 */
const scheduleVisit = async (visitData, userId, userPrisonId, userRole) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    // Check if prisoner exists and is active
    const prisoner = await db.Prisoner.findByPk(visitData.prisoner_id, {
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
      throw new Error('Visits can only be scheduled for active prisoners');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, prisoner.prison_id, userRole)) {
      throw new Error('You do not have access to this prisoner');
    }

    // Check if visitor exists
    const visitor = await db.Visitor.findByPk(visitData.visitor_id);
    if (!visitor) {
      throw new Error('Visitor not found');
    }

    // Check for visit time conflicts
    const conflictingVisit = await db.Visit.findOne({
      where: {
        prisoner_id: visitData.prisoner_id,
        visit_date: visitData.visit_date,
        status: VISIT_STATUS.SCHEDULED,
        [Op.or]: [
          {
            visit_time_start: {
              [Op.between]: [visitData.visit_time_start, visitData.visit_time_end]
            }
          },
          {
            visit_time_end: {
              [Op.between]: [visitData.visit_time_start, visitData.visit_time_end]
            }
          },
          {
            [Op.and]: [
              { visit_time_start: { [Op.lte]: visitData.visit_time_start } },
              { visit_time_end: { [Op.gte]: visitData.visit_time_end } }
            ]
          }
        ]
      }
    });

    if (conflictingVisit) {
      throw new Error('Visit time conflict: Another visit is already scheduled during this time');
    }

    // Create visit
    const newVisit = await db.Visit.create({
      prisoner_id: visitData.prisoner_id,
      visitor_id: visitData.visitor_id,
      relationship: visitData.relationship,
      visit_date: visitData.visit_date,
      visit_time_start: visitData.visit_time_start,
      visit_time_end: visitData.visit_time_end,
      purpose: visitData.purpose,
      status: VISIT_STATUS.SCHEDULED,
      notes: visitData.notes || null,
      approved_by: userId
    }, { transaction });

    await transaction.commit();

    // Fetch created visit with details
    return await getVisitById(newVisit.visit_id, userPrisonId, userRole);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Update visit
 */
const updateVisit = async (visitId, updateData, userPrisonId, userRole) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const visit = await db.Visit.findByPk(visitId, {
      include: [
        {
          model: db.Prisoner,
          as: 'prisoner',
          attributes: ['prison_id']
        }
      ]
    });

    if (!visit) {
      throw new Error('Visit not found');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, visit.prisoner.prison_id, userRole)) {
      throw new Error('You do not have access to this visit');
    }

    // Cannot update completed or cancelled visits
    if (visit.status !== VISIT_STATUS.SCHEDULED) {
      throw new Error('Cannot update visit with status: ' + visit.status);
    }

    // If updating time, check for conflicts
    if (updateData.visit_date || updateData.visit_time_start || updateData.visit_time_end) {
      const visitDate = updateData.visit_date || visit.visit_date;
      const timeStart = updateData.visit_time_start || visit.visit_time_start;
      const timeEnd = updateData.visit_time_end || visit.visit_time_end;

      const conflictingVisit = await db.Visit.findOne({
        where: {
          visit_id: { [Op.ne]: visitId },
          prisoner_id: visit.prisoner_id,
          visit_date: visitDate,
          status: VISIT_STATUS.SCHEDULED,
          [Op.or]: [
            {
              visit_time_start: {
                [Op.between]: [timeStart, timeEnd]
              }
            },
            {
              visit_time_end: {
                [Op.between]: [timeStart, timeEnd]
              }
            },
            {
              [Op.and]: [
                { visit_time_start: { [Op.lte]: timeStart } },
                { visit_time_end: { [Op.gte]: timeEnd } }
              ]
            }
          ]
        }
      });

      if (conflictingVisit) {
        throw new Error('Visit time conflict: Another visit is already scheduled during this time');
      }
    }

    // Update visit
    const allowedUpdates = {
      relationship: updateData.relationship,
      visit_date: updateData.visit_date,
      visit_time_start: updateData.visit_time_start,
      visit_time_end: updateData.visit_time_end,
      purpose: updateData.purpose,
      notes: updateData.notes
    };

    // Remove undefined values
    Object.keys(allowedUpdates).forEach(key => 
      allowedUpdates[key] === undefined && delete allowedUpdates[key]
    );

    await visit.update(allowedUpdates, { transaction });

    await transaction.commit();

    // Return updated visit
    return await getVisitById(visitId, userPrisonId, userRole);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Update visit status
 */
const updateVisitStatus = async (visitId, status, notes, userPrisonId, userRole) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const visit = await db.Visit.findByPk(visitId, {
      include: [
        {
          model: db.Prisoner,
          as: 'prisoner',
          attributes: ['prison_id']
        }
      ]
    });

    if (!visit) {
      throw new Error('Visit not found');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, visit.prisoner.prison_id, userRole)) {
      throw new Error('You do not have access to this visit');
    }

    // Validate status transition
    if (!Object.values(VISIT_STATUS).includes(status)) {
      throw new Error('Invalid visit status');
    }

    // Update visit status
    await visit.update({
      status: status,
      notes: notes || visit.notes
    }, { transaction });

    await transaction.commit();

    // Return updated visit
    return await getVisitById(visitId, userPrisonId, userRole);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Delete visit
 */
const deleteVisit = async (visitId, userPrisonId, userRole) => {
  try {
    const visit = await db.Visit.findByPk(visitId, {
      include: [
        {
          model: db.Prisoner,
          as: 'prisoner',
          attributes: ['prison_id']
        }
      ]
    });

    if (!visit) {
      throw new Error('Visit not found');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, visit.prisoner.prison_id, userRole)) {
      throw new Error('You do not have access to this visit');
    }

    // Cannot delete completed visits
    if (visit.status === VISIT_STATUS.COMPLETED) {
      throw new Error('Cannot delete completed visit');
    }

    await visit.destroy();
  } catch (error) {
    throw error;
  }
};

/**
 * Approve visit
 */
const approveVisit = async (visitId, userId, userPrisonId, userRole) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const visit = await db.Visit.findByPk(visitId, {
      include: [
        {
          model: db.Prisoner,
          as: 'prisoner',
          attributes: ['prison_id']
        }
      ]
    });

    if (!visit) {
      throw new Error('Visit not found');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, visit.prisoner.prison_id, userRole)) {
      throw new Error('You do not have access to this visit');
    }

    // Check if already approved
    if (visit.approved_by) {
      throw new Error('Visit is already approved');
    }

    // Approve visit
    await visit.update({
      approved_by: userId
    }, { transaction });

    await transaction.commit();

    // Return updated visit
    return await getVisitById(visitId, userPrisonId, userRole);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Get visit statistics
 */
const getVisitStatistics = async (prisonId = null, startDate = null, endDate = null) => {
  try {
    // Build where clause
    const whereClause = {};
    
    if (startDate && endDate) {
      whereClause.visit_date = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      whereClause.visit_date = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      whereClause.visit_date = {
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
    const overallStats = await db.Visit.findOne({
      where: whereClause,
      include: includeOptions,
      attributes: [
        [db.sequelize.fn('COUNT', db.sequelize.col('visit_id')), 'totalVisits']
      ],
      raw: true
    });

    // Get statistics by status
    const statusStats = await db.Visit.findAll({
      where: whereClause,
      include: includeOptions,
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('visit_id')), 'count']
      ],
      group: ['status']
    });

    // Get most visited prisoners
    const mostVisited = await db.Visit.findAll({
      where: whereClause,
      include: [
        {
          model: db.Prisoner,
          as: 'prisoner',
          attributes: ['prisoner_id', 'full_name', 'nic'],
          ...(prisonId && {
            include: [
              {
                model: db.Prison,
                as: 'prison',
                attributes: [],
                where: { prison_id: prisonId }
              }
            ]
          })
        }
      ],
      attributes: [
        'prisoner_id',
        [db.sequelize.fn('COUNT', db.sequelize.col('visit_id')), 'visitCount']
      ],
      group: ['prisoner_id', 'prisoner.prisoner_id', 'prisoner.full_name', 'prisoner.nic'],
      order: [[db.sequelize.fn('COUNT', db.sequelize.col('visit_id')), 'DESC']],
      limit: 10
    });

    return {
      overall: {
        totalVisits: parseInt(overallStats.totalVisits) || 0
      },
      byStatus: statusStats.reduce((acc, stat) => {
        acc[stat.status.toLowerCase()] = parseInt(stat.dataValues.count);
        return acc;
      }, { scheduled: 0, completed: 0, cancelled: 0 }),
      mostVisitedPrisoners: mostVisited.map(v => ({
        prisonerId: v.prisoner_id,
        fullName: v.prisoner?.full_name,
        nic: v.prisoner?.nic,
        visitCount: parseInt(v.dataValues.visitCount)
      }))
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllVisits,
  getVisitsByPrisoner,
  getUpcomingVisits,
  getVisitById,
  scheduleVisit,
  updateVisit,
  updateVisitStatus,
  deleteVisit,
  approveVisit,
  getVisitStatistics
};