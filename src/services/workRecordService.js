const db = require('../models');
const { USER_ROLES, PAYMENT_STATUS, PRISONER_STATUS } = require('../config/constants');
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
 * Get all work records with filtering and pagination
 */
const getAllWorkRecords = async (filters = {}, page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit;
    
    // Build where clause for work records
    const workRecordWhere = {};
    
    if (filters.paymentStatus) {
      workRecordWhere.payment_status = filters.paymentStatus;
    }
    
    if (filters.startDate && filters.endDate) {
      workRecordWhere.work_date = {
        [Op.between]: [filters.startDate, filters.endDate]
      };
    } else if (filters.startDate) {
      workRecordWhere.work_date = {
        [Op.gte]: filters.startDate
      };
    } else if (filters.endDate) {
      workRecordWhere.work_date = {
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
      workRecordWhere.prisoner_id = filters.prisonerId;
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

    // Get work records with pagination
    const { count, rows: workRecords } = await db.PrisonerWorkRecord.findAndCountAll({
      where: workRecordWhere,
      include: includeOptions,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['work_date', 'DESC'], ['created_at', 'DESC']],
      distinct: true
    });

    return {
      workRecords: workRecords.map(record => ({
        workRecordId: record.work_record_id,
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
        taskDescription: record.task_description,
        workDate: record.work_date,
        hoursWorked: parseFloat(record.hours_worked),
        paymentAmount: parseFloat(record.payment_amount),
        paymentStatus: record.payment_status,
        paymentDate: record.payment_date,
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
 * Get work records for a specific prisoner
 */
const getWorkRecordsByPrisoner = async (prisonerId, userPrisonId, userRole, page = 1, limit = 10) => {
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

    // Get work records
    const { count, rows: workRecords } = await db.PrisonerWorkRecord.findAndCountAll({
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
      order: [['work_date', 'DESC'], ['created_at', 'DESC']]
    });

    // Calculate summary
    const summary = await db.PrisonerWorkRecord.findOne({
      where: { prisoner_id: prisonerId },
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('hours_worked')), 'totalHours'],
        [db.sequelize.fn('SUM', db.sequelize.col('payment_amount')), 'totalEarned'],
        [db.sequelize.fn('SUM', 
          db.sequelize.literal(`CASE WHEN payment_status = 'Paid' THEN payment_amount ELSE 0 END`)
        ), 'totalPaid'],
        [db.sequelize.fn('SUM', 
          db.sequelize.literal(`CASE WHEN payment_status = 'Pending' THEN payment_amount ELSE 0 END`)
        ), 'totalPending']
      ],
      raw: true
    });

    return {
      workRecords: workRecords.map(record => ({
        workRecordId: record.work_record_id,
        taskDescription: record.task_description,
        workDate: record.work_date,
        hoursWorked: parseFloat(record.hours_worked),
        paymentAmount: parseFloat(record.payment_amount),
        paymentStatus: record.payment_status,
        paymentDate: record.payment_date,
        recordedBy: record.recorder ? {
          userId: record.recorder.user_id,
          fullName: record.recorder.employee_full_name,
          username: record.recorder.username
        } : null,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      })),
      summary: {
        totalHours: parseFloat(summary.totalHours) || 0,
        totalEarned: parseFloat(summary.totalEarned) || 0,
        totalPaid: parseFloat(summary.totalPaid) || 0,
        totalPending: parseFloat(summary.totalPending) || 0
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
 * Get work record by ID
 */
const getWorkRecordById = async (workRecordId, userPrisonId, userRole) => {
  try {
    const workRecord = await db.PrisonerWorkRecord.findByPk(workRecordId, {
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

    if (!workRecord) {
      throw new Error('Work record not found');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, workRecord.prisoner.prison.prison_id, userRole)) {
      throw new Error('You do not have access to this work record');
    }

    return {
      workRecordId: workRecord.work_record_id,
      prisonerId: workRecord.prisoner_id,
      prisoner: workRecord.prisoner ? {
        prisonerId: workRecord.prisoner.prisoner_id,
        fullName: workRecord.prisoner.full_name,
        nic: workRecord.prisoner.nic,
        caseNumber: workRecord.prisoner.case_number,
        prison: workRecord.prisoner.prison ? {
          prisonId: workRecord.prisoner.prison.prison_id,
          prisonName: workRecord.prisoner.prison.prison_name,
          location: workRecord.prisoner.prison.location
        } : null
      } : null,
      taskDescription: workRecord.task_description,
      workDate: workRecord.work_date,
      hoursWorked: parseFloat(workRecord.hours_worked),
      paymentAmount: parseFloat(workRecord.payment_amount),
      paymentStatus: workRecord.payment_status,
      paymentDate: workRecord.payment_date,
      recordedBy: workRecord.recorder ? {
        userId: workRecord.recorder.user_id,
        fullName: workRecord.recorder.employee_full_name,
        username: workRecord.recorder.username,
        email: workRecord.recorder.email
      } : null,
      createdAt: workRecord.createdAt,
      updatedAt: workRecord.updatedAt
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Create new work record
 */
const createWorkRecord = async (workRecordData, userId, userPrisonId, userRole) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    // Check if prisoner exists and is active
    const prisoner = await db.Prisoner.findByPk(workRecordData.prisoner_id, {
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
      throw new Error('Work records can only be created for active prisoners');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, prisoner.prison_id, userRole)) {
      throw new Error('You do not have access to this prisoner');
    }

    // Create work record
    const newWorkRecord = await db.PrisonerWorkRecord.create({
      prisoner_id: workRecordData.prisoner_id,
      task_description: workRecordData.task_description,
      work_date: workRecordData.work_date || new Date(),
      hours_worked: workRecordData.hours_worked,
      payment_amount: workRecordData.payment_amount,
      payment_status: PAYMENT_STATUS.PENDING,
      recorded_by: userId
    }, { transaction });

    await transaction.commit();

    // Fetch created work record with details
    return await getWorkRecordById(newWorkRecord.work_record_id, userPrisonId, userRole);
  } catch (error) {
    console.log(error)
    await transaction.rollback();
    throw error;
  }
};

/**
 * Update work record
 */
const updateWorkRecord = async (workRecordId, updateData, userPrisonId, userRole) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const workRecord = await db.PrisonerWorkRecord.findByPk(workRecordId, {
      include: [
        {
          model: db.Prisoner,
          as: 'prisoner',
          attributes: ['prison_id']
        }
      ]
    });

    if (!workRecord) {
      throw new Error('Work record not found');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, workRecord.prisoner.prison_id, userRole)) {
      throw new Error('You do not have access to this work record');
    }

    // Cannot update already paid records
    if (workRecord.payment_status === PAYMENT_STATUS.PAID) {
      throw new Error('Cannot update work record with paid status');
    }

    // Update work record (excluding payment status and payment date)
    const allowedUpdates = {
      task_description: updateData.task_description,
      work_date: updateData.work_date,
      hours_worked: updateData.hours_worked,
      payment_amount: updateData.payment_amount
    };

    // Remove undefined values
    Object.keys(allowedUpdates).forEach(key => 
      allowedUpdates[key] === undefined && delete allowedUpdates[key]
    );

    await workRecord.update(allowedUpdates, { transaction });

    await transaction.commit();

    // Return updated work record
    return await getWorkRecordById(workRecordId, userPrisonId, userRole);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Delete work record
 */
const deleteWorkRecord = async (workRecordId, userPrisonId, userRole) => {
  try {
    const workRecord = await db.PrisonerWorkRecord.findByPk(workRecordId, {
      include: [
        {
          model: db.Prisoner,
          as: 'prisoner',
          attributes: ['prison_id']
        }
      ]
    });

    if (!workRecord) {
      throw new Error('Work record not found');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, workRecord.prisoner.prison_id, userRole)) {
      throw new Error('You do not have access to this work record');
    }

    // Cannot delete already paid records
    if (workRecord.payment_status === PAYMENT_STATUS.PAID) {
      throw new Error('Cannot delete work record with paid status');
    }

    await workRecord.destroy();
  } catch (error) {
    throw error;
  }
};

/**
 * Approve payment for work record
 */
const approvePayment = async (workRecordId, paymentDate, userPrisonId, userRole) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const workRecord = await db.PrisonerWorkRecord.findByPk(workRecordId, {
      include: [
        {
          model: db.Prisoner,
          as: 'prisoner',
          attributes: ['prison_id']
        }
      ]
    });

    if (!workRecord) {
      throw new Error('Work record not found');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, workRecord.prisoner.prison_id, userRole)) {
      throw new Error('You do not have access to this work record');
    }

    // Check if already paid
    if (workRecord.payment_status === PAYMENT_STATUS.PAID) {
      throw new Error('Payment is already approved for this work record');
    }

    // Update payment status
    await workRecord.update({
      payment_status: PAYMENT_STATUS.PAID,
      payment_date: paymentDate || new Date()
    }, { transaction });

    await transaction.commit();

    // Return updated work record
    return await getWorkRecordById(workRecordId, userPrisonId, userRole);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Bulk approve payments
 */
const bulkApprovePayments = async (workRecordIds, paymentDate, userPrisonId, userRole) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const results = {
      total: workRecordIds.length,
      approved: 0,
      failed: 0,
      errors: []
    };

    for (const workRecordId of workRecordIds) {
      try {
        const workRecord = await db.PrisonerWorkRecord.findByPk(workRecordId, {
          include: [
            {
              model: db.Prisoner,
              as: 'prisoner',
              attributes: ['prison_id', 'full_name']
            }
          ]
        });

        if (!workRecord) {
          results.failed++;
          results.errors.push({ workRecordId, error: 'Work record not found' });
          continue;
        }

        // Check access
        if (!checkPrisonAccess(userPrisonId, workRecord.prisoner.prison_id, userRole)) {
          results.failed++;
          results.errors.push({ workRecordId, error: 'Access denied' });
          continue;
        }

        // Skip if already paid
        if (workRecord.payment_status === PAYMENT_STATUS.PAID) {
          results.failed++;
          results.errors.push({ workRecordId, error: 'Already paid' });
          continue;
        }

        // Approve payment
        await workRecord.update({
          payment_status: PAYMENT_STATUS.PAID,
          payment_date: paymentDate || new Date()
        }, { transaction });

        results.approved++;
      } catch (error) {
        results.failed++;
        results.errors.push({ workRecordId, error: error.message });
      }
    }

    await transaction.commit();
    return results;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Get pending payments
 */
const getPendingPayments = async (prisonId = null, page = 1, limit = 10) => {
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

    // Get pending work records
    const { count, rows: workRecords } = await db.PrisonerWorkRecord.findAndCountAll({
      where: { payment_status: PAYMENT_STATUS.PENDING },
      include: includeOptions,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['work_date', 'ASC']],
      distinct: true
    });

    // Calculate summary
    const summary = await db.PrisonerWorkRecord.findOne({
      where: { payment_status: PAYMENT_STATUS.PENDING },
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('payment_amount')), 'totalPending'],
        [db.sequelize.fn('COUNT', db.sequelize.col('work_record_id')), 'totalRecords']
      ],
      raw: true
    });

    return {
      workRecords: workRecords.map(record => ({
        workRecordId: record.work_record_id,
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
        taskDescription: record.task_description,
        workDate: record.work_date,
        hoursWorked: parseFloat(record.hours_worked),
        paymentAmount: parseFloat(record.payment_amount),
        paymentStatus: record.payment_status,
        recordedBy: record.recorder ? {
          userId: record.recorder.user_id,
          fullName: record.recorder.employee_full_name
        } : null,
        createdAt: record.createdAt
      })),
      summary: {
        totalPending: parseFloat(summary.totalPending) || 0,
        totalRecords: parseInt(summary.totalRecords) || 0
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
 * Get work record statistics
 */
const getWorkRecordStatistics = async (prisonId = null, startDate = null, endDate = null) => {
  try {
    // Build where clause
    const whereClause = {};
    
    if (startDate && endDate) {
      whereClause.work_date = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      whereClause.work_date = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      whereClause.work_date = {
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
    const overallStats = await db.PrisonerWorkRecord.findOne({
      where: whereClause,
      include: includeOptions,
      attributes: [
        [db.sequelize.fn('COUNT', db.sequelize.col('work_record_id')), 'totalRecords'],
        [db.sequelize.fn('SUM', db.sequelize.col('hours_worked')), 'totalHours'],
        [db.sequelize.fn('SUM', db.sequelize.col('payment_amount')), 'totalAmount'],
        [db.sequelize.fn('SUM', 
          db.sequelize.literal(`CASE WHEN payment_status = 'Paid' THEN payment_amount ELSE 0 END`)
        ), 'totalPaid'],
        [db.sequelize.fn('SUM', 
          db.sequelize.literal(`CASE WHEN payment_status = 'Pending' THEN payment_amount ELSE 0 END`)
        ), 'totalPending']
      ],
      raw: true
    });

    // Get statistics by payment status
    const statusStats = await db.PrisonerWorkRecord.findAll({
      where: whereClause,
      include: includeOptions,
      attributes: [
        'payment_status',
        [db.sequelize.fn('COUNT', db.sequelize.col('work_record_id')), 'count'],
        [db.sequelize.fn('SUM', db.sequelize.col('payment_amount')), 'amount']
      ],
      group: ['payment_status']
    });

    // Get top workers (prisoners with most hours)
    const topWorkers = await db.PrisonerWorkRecord.findAll({
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
        [db.sequelize.fn('SUM', db.sequelize.col('hours_worked')), 'totalHours'],
        [db.sequelize.fn('SUM', db.sequelize.col('payment_amount')), 'totalEarned'],
        [db.sequelize.fn('COUNT', db.sequelize.col('work_record_id')), 'recordCount']
      ],
      group: ['prisoner_id', 'prisoner.prisoner_id', 'prisoner.full_name', 'prisoner.nic'],
      order: [[db.sequelize.fn('SUM', db.sequelize.col('hours_worked')), 'DESC']],
      limit: 10
    });

    return {
      overall: {
        totalRecords: parseInt(overallStats.totalRecords) || 0,
        totalHours: parseFloat(overallStats.totalHours) || 0,
        totalAmount: parseFloat(overallStats.totalAmount) || 0,
        totalPaid: parseFloat(overallStats.totalPaid) || 0,
        totalPending: parseFloat(overallStats.totalPending) || 0
      },
      byStatus: statusStats.map(stat => ({
        status: stat.payment_status,
        count: parseInt(stat.dataValues.count),
        amount: parseFloat(stat.dataValues.amount)
      })),
      topWorkers: topWorkers.map(worker => ({
        prisonerId: worker.prisoner_id,
        fullName: worker.prisoner.full_name,
        nic: worker.prisoner.nic,
        totalHours: parseFloat(worker.dataValues.totalHours),
        totalEarned: parseFloat(worker.dataValues.totalEarned),
        recordCount: parseInt(worker.dataValues.recordCount)
      }))
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllWorkRecords,
  getWorkRecordsByPrisoner,
  getWorkRecordById,
  createWorkRecord,
  updateWorkRecord,
  deleteWorkRecord,
  approvePayment,
  bulkApprovePayments,
  getPendingPayments,
  getWorkRecordStatistics
};