const db = require('../models');
const { Op } = require('sequelize');

/**
 * Get all visitors with filtering and pagination
 */
const getAllVisitors = async (filters = {}, page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit;
    
    // Build where clause
    const whereClause = {};
    
    if (filters.search) {
      whereClause[Op.or] = [
        { visitor_name: { [Op.like]: `%${filters.search}%` } },
        { nic: { [Op.like]: `%${filters.search}%` } },
        { mobile_number: { [Op.like]: `%${filters.search}%` } }
      ];
    }

    // Get visitors with pagination
    const { count, rows: visitors } = await db.Visitor.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      attributes: ['visitor_id', 'visitor_name', 'nic', 'mobile_number', 'address', 'created_at']
    });

    return {
      visitors: visitors.map(visitor => ({
        visitorId: visitor.visitor_id,
        visitorName: visitor.visitor_name,
        nic: visitor.nic,
        mobileNumber: visitor.mobile_number,
        address: visitor.address,
        createdAt: visitor.created_at
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
 * Search visitors by NIC or name
 */
const searchVisitors = async (query) => {
  try {
    const visitors = await db.Visitor.findAll({
      where: {
        [Op.or]: [
          { visitor_name: { [Op.like]: `%${query}%` } },
          { nic: { [Op.like]: `%${query}%` } }
        ]
      },
      limit: 10,
      attributes: ['visitor_id', 'visitor_name', 'nic', 'mobile_number']
    });

    return visitors.map(visitor => ({
      visitorId: visitor.visitor_id,
      visitorName: visitor.visitor_name,
      nic: visitor.nic,
      mobileNumber: visitor.mobile_number
    }));
  } catch (error) {
    throw error;
  }
};

/**
 * Get visitor by ID
 */
const getVisitorById = async (visitorId) => {
  try {
    const visitor = await db.Visitor.findByPk(visitorId, {
      include: [
        {
          model: db.Visit,
          as: 'visits',
          attributes: ['visit_id', 'visit_date', 'status'],
          limit: 5,
          order: [['visit_date', 'DESC']]
        }
      ]
    });

    if (!visitor) {
      throw new Error('Visitor not found');
    }

    return {
      visitorId: visitor.visitor_id,
      visitorName: visitor.visitor_name,
      nic: visitor.nic,
      mobileNumber: visitor.mobile_number,
      address: visitor.address,
      recentVisits: visitor.visits ? visitor.visits.map(visit => ({
        visitId: visit.visit_id,
        visitDate: visit.visit_date,
        status: visit.status
      })) : [],
      createdAt: visitor.created_at,
      updatedAt: visitor.updated_at
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Create new visitor
 */
const createVisitor = async (visitorData) => {
  try {
    // Check if visitor with same NIC already exists
    const existingVisitor = await db.Visitor.findOne({
      where: { nic: visitorData.nic }
    });

    if (existingVisitor) {
      throw new Error('Visitor with this NIC already exists');
    }

    // Create visitor
    const newVisitor = await db.Visitor.create({
      visitor_name: visitorData.visitor_name,
      nic: visitorData.nic,
      mobile_number: visitorData.mobile_number,
      address: visitorData.address
    });

    return await getVisitorById(newVisitor.visitor_id);
  } catch (error) {
    throw error;
  }
};

/**
 * Update visitor
 */
const updateVisitor = async (visitorId, updateData) => {
  try {
    const visitor = await db.Visitor.findByPk(visitorId);

    if (!visitor) {
      throw new Error('Visitor not found');
    }

    // If updating NIC, check for duplicates
    if (updateData.nic && updateData.nic !== visitor.nic) {
      const existingVisitor = await db.Visitor.findOne({
        where: { 
          nic: updateData.nic,
          visitor_id: { [Op.ne]: visitorId }
        }
      });

      if (existingVisitor) {
        throw new Error('Visitor with this NIC already exists');
      }
    }

    // Update visitor
    const allowedUpdates = {
      visitor_name: updateData.visitor_name,
      nic: updateData.nic,
      mobile_number: updateData.mobile_number,
      address: updateData.address
    };

    // Remove undefined values
    Object.keys(allowedUpdates).forEach(key => 
      allowedUpdates[key] === undefined && delete allowedUpdates[key]
    );

    await visitor.update(allowedUpdates);

    return await getVisitorById(visitorId);
  } catch (error) {
    throw error;
  }
};

/**
 * Delete visitor
 */
const deleteVisitor = async (visitorId) => {
  try {
    const visitor = await db.Visitor.findByPk(visitorId);

    if (!visitor) {
      throw new Error('Visitor not found');
    }

    // Check if visitor has visit records
    const visitCount = await db.Visit.count({
      where: { visitor_id: visitorId }
    });

    if (visitCount > 0) {
      throw new Error('Cannot delete visitor with existing visit records. Consider archiving instead.');
    }

    await visitor.destroy();
  } catch (error) {
    throw error;
  }
};

/**
 * Get visitor's visit history
 */
const getVisitorHistory = async (visitorId, userPrisonId, userRole, page = 1, limit = 10) => {
  try {
    const visitor = await db.Visitor.findByPk(visitorId);

    if (!visitor) {
      throw new Error('Visitor not found');
    }

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
        as: 'approver',
        attributes: ['user_id', 'employee_full_name']
      }
    ];

    // Filter by prison if not super admin
    if (userRole !== 'Super Admin' && userPrisonId) {
      includeOptions[0].include[0].where = { prison_id: userPrisonId };
      includeOptions[0].required = true;
    }

    // Get visits
    const { count, rows: visits } = await db.Visit.findAndCountAll({
      where: { visitor_id: visitorId },
      include: includeOptions,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['visit_date', 'DESC']]
    });

    // Calculate summary
    const summary = await db.Visit.findAll({
      where: { visitor_id: visitorId },
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('visit_id')), 'count']
      ],
      group: ['status']
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
        relationship: visit.relationship,
        visitDate: visit.visit_date,
        visitTimeStart: visit.visit_time_start,
        visitTimeEnd: visit.visit_time_end,
        purpose: visit.purpose,
        status: visit.status,
        notes: visit.notes,
        approvedBy: visit.approver ? {
          userId: visit.approver.user_id,
          fullName: visit.approver.employee_full_name
        } : null
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
 * Get visitor statistics
 */
const getVisitorStatistics = async (prisonId = null, startDate = null, endDate = null) => {
  try {
    // Build include options for prison filtering
    const includeOptions = [];
    if (prisonId) {
      includeOptions.push({
        model: db.Visit,
        as: 'visits',
        attributes: [],
        include: [
          {
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
            ]
          }
        ],
        required: true
      });
    }

    // Get total unique visitors
    const totalVisitors = await db.Visitor.count({
      distinct: true,
      ...(includeOptions.length > 0 && { include: includeOptions })
    });

    // Build where clause for visits
    const visitWhereClause = {};
    if (startDate && endDate) {
      visitWhereClause.visit_date = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      visitWhereClause.visit_date = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      visitWhereClause.visit_date = {
        [Op.lte]: endDate
      };
    }

    // Build include for visit stats
    const visitInclude = [];
    if (prisonId) {
      visitInclude.push({
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

    // Get visit statistics
    const visitStats = await db.Visit.findAll({
      where: visitWhereClause,
      include: visitInclude,
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('visit_id')), 'count']
      ],
      group: ['status']
    });

    // Get most frequent visitors
    const frequentVisitors = await db.Visit.findAll({
      where: visitWhereClause,
      include: [
        {
          model: db.Visitor,
          as: 'visitor',
          attributes: ['visitor_id', 'visitor_name', 'nic']
        },
        ...(prisonId ? [{
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
        }] : [])
      ],
      attributes: [
        'visitor_id',
        [db.sequelize.fn('COUNT', db.sequelize.col('visit_id')), 'visitCount']
      ],
      group: ['visitor_id', 'visitor.visitor_id', 'visitor.visitor_name', 'visitor.nic'],
      order: [[db.sequelize.fn('COUNT', db.sequelize.col('visit_id')), 'DESC']],
      limit: 10
    });

    return {
      totalVisitors,
      visitsByStatus: visitStats.reduce((acc, stat) => {
        acc[stat.status.toLowerCase()] = parseInt(stat.dataValues.count);
        return acc;
      }, { scheduled: 0, completed: 0, cancelled: 0 }),
      frequentVisitors: frequentVisitors.map(v => ({
        visitorId: v.visitor_id,
        visitorName: v.visitor.visitor_name,
        nic: v.visitor.nic,
        visitCount: parseInt(v.dataValues.visitCount)
      }))
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllVisitors,
  searchVisitors,
  getVisitorById,
  createVisitor,
  updateVisitor,
  deleteVisitor,
  getVisitorHistory,
  getVisitorStatistics
};