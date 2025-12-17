const db = require('../models');
const { USER_ROLES } = require('../config/constants');
const { Op } = require('sequelize');

/**
 * Get all prisons with filtering and pagination
 */
const getAllPrisons = async (filters = {}, page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit;
    
    // Build where clause
    const whereClause = {};
    
    if (filters.location) {
      whereClause.location = { [Op.like]: `%${filters.location}%` };
    }
    
    if (filters.isActive !== undefined) {
      whereClause.is_active = filters.isActive;
    }
    
    if (filters.search) {
      whereClause[Op.or] = [
        { prison_name: { [Op.like]: `%${filters.search}%` } },
        { location: { [Op.like]: `%${filters.search}%` } },
        { superintendent_name: { [Op.like]: `%${filters.search}%` } }
      ];
    }

    // Get prisons with pagination
    const { count, rows: prisons } = await db.Prison.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: db.User,
          as: 'users',
          attributes: ['user_id', 'employee_full_name', 'username'],
          where: { is_active: true },
          required: false
        },
        {
          model: db.Prisoner,
          as: 'prisoners',
          attributes: ['prisoner_id'],
          where: { status: 'Active' },
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      distinct: true
    });

    return {
      prisons: prisons.map(prison => ({
        prisonId: prison.prison_id,
        prisonName: prison.prison_name,
        location: prison.location,
        address: prison.address,
        capacity: prison.capacity,
        currentOccupancy: prison.prisoners ? prison.prisoners.length : 0,
        superintendentName: prison.superintendent_name,
        contactNumber: prison.contact_number,
        email: prison.email,
        establishedDate: prison.established_date,
        isActive: prison.is_active,
        staffCount: prison.users ? prison.users.length : 0,
        createdAt: prison.created_at,
        updatedAt: prison.updated_at
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
 * Get prison by ID
 */
const getPrisonById = async (prisonId) => {
  try {
    const prison = await db.Prison.findByPk(prisonId, {
      include: [
        {
          model: db.User,
          as: 'users',
          attributes: ['user_id', 'employee_full_name', 'username', 'email'],
          where: { is_active: true },
          required: false,
          include: [
            {
              model: db.Role,
              as: 'role',
              attributes: ['role_id', 'role_name']
            }
          ]
        },
        {
          model: db.Prisoner,
          as: 'prisoners',
          attributes: ['prisoner_id', 'full_name', 'status'],
          where: { status: 'Active' },
          required: false
        }
      ]
    });

    if (!prison) {
      throw new Error('Prison not found');
    }

    return {
      prisonId: prison.prison_id,
      prisonName: prison.prison_name,
      location: prison.location,
      address: prison.address,
      capacity: prison.capacity,
      currentOccupancy: prison.prisoners ? prison.prisoners.length : 0,
      superintendentName: prison.superintendent_name,
      contactNumber: prison.contact_number,
      email: prison.email,
      establishedDate: prison.established_date,
      isActive: prison.is_active,
      staff: prison.users ? prison.users.map(user => ({
        userId: user.user_id,
        fullName: user.employee_full_name,
        username: user.username,
        email: user.email,
        role: user.role ? user.role.role_name : null
      })) : [],
      prisoners: prison.prisoners ? prison.prisoners.map(prisoner => ({
        prisonerId: prisoner.prisoner_id,
        fullName: prisoner.full_name,
        status: prisoner.prisoner_status
      })) : [],
      createdAt: prison.created_at,
      updatedAt: prison.updated_at
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Create new prison
 */
const createPrison = async (prisonData, userRole) => {
  try {
    // Only Super Admin can create prisons
    if (userRole !== USER_ROLES.SUPER_ADMIN) {
      throw new Error('Only Super Admin can create prisons');
    }

    // Check if prison name already exists
    const existingPrison = await db.Prison.findOne({
      where: {
        prison_name: prisonData.prison_name
      }
    });

    if (existingPrison) {
      throw new Error('Prison with this name already exists');
    }

    // Validate capacity
    if (prisonData.capacity && prisonData.capacity < 0) {
      throw new Error('Capacity must be a positive number');
    }

    // Create prison
    const newPrison = await db.Prison.create({
      prison_name: prisonData.prison_name,
      location: prisonData.location,
      address: prisonData.address,
      capacity: prisonData.capacity || 0,
      superintendent_name: prisonData.superintendent_name,
      contact_number: prisonData.contact_number,
      email: prisonData.email,
      established_date: prisonData.established_date,
      is_active: prisonData.is_active !== undefined ? prisonData.is_active : true
    });

    // Fetch created prison
    return await getPrisonById(newPrison.prison_id);
  } catch (error) {
    throw error;
  }
};

/**
 * Update prison
 */
const updatePrison = async (prisonId, updateData, userRole) => {
  try {
    // Only Super Admin can update prisons
    if (userRole !== USER_ROLES.SUPER_ADMIN) {
      throw new Error('Only Super Admin can update prisons');
    }

    const prison = await db.Prison.findByPk(prisonId);

    if (!prison) {
      throw new Error('Prison not found');
    }

    // Check for duplicate prison name if being updated
    if (updateData.prison_name && updateData.prison_name !== prison.prison_name) {
      const existingPrison = await db.Prison.findOne({
        where: {
          prison_name: updateData.prison_name,
          prison_id: { [Op.ne]: prisonId }
        }
      });

      if (existingPrison) {
        throw new Error('Prison with this name already exists');
      }
    }

    // Validate capacity if being updated
    if (updateData.capacity !== undefined && updateData.capacity < 0) {
      throw new Error('Capacity must be a positive number');
    }

    // Check if capacity is being reduced below current occupancy
    if (updateData.capacity !== undefined) {
      const currentOccupancy = await db.Prisoner.count({
        where: {
          prison_id: prisonId,
          status: 'Active'
        }
      });

      if (updateData.capacity < currentOccupancy) {
        throw new Error(`Cannot reduce capacity below current occupancy of ${currentOccupancy} prisoners`);
      }
    }

    // Update prison
    await prison.update(updateData);

    // Return updated prison
    return await getPrisonById(prisonId);
  } catch (error) {
    throw error;
  }
};

/**
 * Delete prison (soft delete by setting is_active to false)
 */
const deletePrison = async (prisonId, userRole) => {
  try {
    // Only Super Admin can delete prisons
    if (userRole !== USER_ROLES.SUPER_ADMIN) {
      throw new Error('Only Super Admin can delete prisons');
    }

    const prison = await db.Prison.findByPk(prisonId);

    if (!prison) {
      throw new Error('Prison not found');
    }

    // Check if prison has active prisoners
    const activePrisoners = await db.Prisoner.count({
      where: {
        prison_id: prisonId,
        prisoner_status: 'Active'
      }
    });

    if (activePrisoners > 0) {
      throw new Error(`Cannot delete prison with ${activePrisoners} active prisoners`);
    }

    // Check if prison has active users
    const activeUsers = await db.User.count({
      where: {
        prison_id: prisonId,
        is_active: true
      }
    });

    if (activeUsers > 0) {
      throw new Error(`Cannot delete prison with ${activeUsers} active staff members`);
    }

    // Soft delete
    await prison.update({ is_active: false });

    return { message: 'Prison deactivated successfully' };
  } catch (error) {
    throw error;
  }
};

/**
 * Get prison statistics
 */
const getPrisonStatistics = async (prisonId) => {
  try {
    const prison = await db.Prison.findByPk(prisonId);

    if (!prison) {
      throw new Error('Prison not found');
    }

    // Get prisoner count by status
    const prisonerStats = await db.Prisoner.findAll({
      where: { prison_id: prisonId },
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('prisoner_id')), 'count']
      ],
      group: ['status']
    });

    // Get staff count by role
    const staffStats = await db.User.findAll({
      where: { 
        prison_id: prisonId,
        is_active: true
      },
      attributes: [
        [db.sequelize.fn('COUNT', db.sequelize.col('user_id')), 'count']
      ],
      include: [
        {
          model: db.Role,
          as: 'role',
          attributes: ['role_name']
        }
      ],
      group: ['role.role_id', 'role.role_name']
    });

    // Calculate occupancy rate
    const activePrisoners = prisonerStats.find(s => s.status === 'Active');
    const currentOccupancy = activePrisoners ? parseInt(activePrisoners.dataValues.count) : 0;
    const occupancyRate = prison.capacity > 0 ? ((currentOccupancy / prison.capacity) * 100).toFixed(2) : 0;

    return {
      prisonId: prison.prison_id,
      prisonName: prison.prison_name,
      capacity: prison.capacity,
      currentOccupancy,
      occupancyRate: parseFloat(occupancyRate),
      availableSpace: Math.max(0, prison.capacity - currentOccupancy),
      prisoners: prisonerStats.map(stat => ({
        status: stat.status,
        count: parseInt(stat.dataValues.count)
      })),
      staff: staffStats.map(stat => ({
        role: stat.role.role_name,
        count: parseInt(stat.dataValues.count)
      })),
      totalStaff: staffStats.reduce((sum, stat) => sum + parseInt(stat.dataValues.count), 0)
    };
  } catch (error) {
    throw error;
  }
};

const getPrisonDashboardStats = async () => {
  const [total, active, inactive] = await Promise.all([
    db.Prison.count(),
    db.Prison.count({ where: { is_active: true } }),
    db.Prison.count({ where: { is_active: false } })
  ]);

  return { total, active, inactive };
};

module.exports = {
  getAllPrisons,
  getPrisonById,
  createPrison,
  updatePrison,
  deletePrison,
  getPrisonStatistics,
  getPrisonDashboardStats
};