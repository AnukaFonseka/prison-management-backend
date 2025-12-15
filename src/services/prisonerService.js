const db = require('../models');
const { USER_ROLES, PRISONER_STATUS } = require('../config/constants');
const { Op } = require('sequelize');
const fs = require('fs').promises;
const path = require('path');

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
 * Get all prisoners with filtering and pagination
 */
const getAllPrisoners = async (filters = {}, page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit;
    
    // Build where clause
    const whereClause = {};
    
    if (filters.prisonId) {
      whereClause.prison_id = filters.prisonId;
    }
    
    if (filters.status) {
      whereClause.status = filters.status;
    }
    
    if (filters.gender) {
      whereClause.gender = filters.gender;
    }
    
    if (filters.nationality) {
      whereClause.nationality = { [Op.like]: `%${filters.nationality}%` };
    }
    
    if (filters.search) {
      whereClause[Op.or] = [
        { full_name: { [Op.like]: `%${filters.search}%` } },
        { nic: { [Op.like]: `%${filters.search}%` } },
        { case_number: { [Op.like]: `%${filters.search}%` } }
      ];
    }

    // Get prisoners with pagination
    const { count, rows: prisoners } = await db.Prisoner.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: db.Prison,
          as: 'prison',
          attributes: ['prison_id', 'prison_name', 'location']
        },
        {
          model: db.PrisonerPhoto,
          as: 'photos',
          attributes: ['photo_id', 'photo_url', 'photo_type'],
          where: { photo_type: 'Profile' },
          required: false,
          limit: 1
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      distinct: true
    });

    return {
      prisoners: prisoners.map(prisoner => ({
        prisonerId: prisoner.prisoner_id,
        fullName: prisoner.full_name,
        nic: prisoner.nic,
        caseNumber: prisoner.case_number,
        gender: prisoner.gender,
        birthday: prisoner.birthday,
        nationality: prisoner.nationality,
        status: prisoner.status,
        admissionDate: prisoner.admission_date,
        expectedReleaseDate: prisoner.expected_release_date,
        actualReleaseDate: prisoner.actual_release_date,
        cellNumber: prisoner.cell_number,
        prison: prisoner.prison ? {
          prisonId: prisoner.prison.prison_id,
          prisonName: prisoner.prison.prison_name,
          location: prisoner.prison.location
        } : null,
        profilePhoto: prisoner.photos && prisoner.photos.length > 0 ? prisoner.photos[0].photo_url : null,
        createdAt: prisoner.created_at,
        updatedAt: prisoner.updated_at
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
 * Get prisoner by ID with full details
 */
const getPrisonerById = async (prisonerId, userPrisonId, userRole) => {
  try {
    const prisoner = await db.Prisoner.findByPk(prisonerId, {
      include: [
        {
          model: db.Prison,
          as: 'prison',
          attributes: ['prison_id', 'prison_name', 'location', 'address']
        },
        {
          model: db.PrisonerFamilyDetail,
          as: 'familyDetails',
          attributes: ['family_id', 'family_member_name', 'relationship', 'contact_number', 'address', 'nic', 'emergency_contact']
        },
        {
          model: db.PrisonerPhoto,
          as: 'photos',
          attributes: ['photo_id', 'photo_url', 'photo_type', 'upload_date']
        },
        {
          model: db.PrisonerBodyMark,
          as: 'bodyMarks',
          attributes: ['mark_id', 'mark_description', 'mark_location']
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

    return {
      prisonerId: prisoner.prisoner_id,
      fullName: prisoner.full_name,
      nic: prisoner.nic,
      caseNumber: prisoner.case_number,
      gender: prisoner.gender,
      birthday: prisoner.birthday,
      nationality: prisoner.nationality,
      admissionDate: prisoner.admission_date,
      expectedReleaseDate: prisoner.expected_release_date,
      actualReleaseDate: prisoner.actual_release_date,
      status: prisoner.status,
      cellNumber: prisoner.cell_number,
      socialStatus: prisoner.social_status,
      prison: prisoner.prison ? {
        prisonId: prisoner.prison.prison_id,
        prisonName: prisoner.prison.prison_name,
        location: prisoner.prison.location,
        address: prisoner.prison.address
      } : null,
      familyDetails: prisoner.familyDetails ? prisoner.familyDetails.map(family => ({
        familyId: family.family_id,
        memberName: family.family_member_name,
        relationship: family.relationship,
        contactNumber: family.contact_number,
        address: family.address,
        nic: family.nic,
        emergencyContact: family.emergency_contact
      })) : [],
      photos: prisoner.photos ? prisoner.photos.map(photo => ({
        photoId: photo.photo_id,
        photoUrl: photo.photo_url,
        photoType: photo.photo_type,
        uploadDate: photo.upload_date
      })) : [],
      bodyMarks: prisoner.bodyMarks ? prisoner.bodyMarks.map(mark => ({
        markId: mark.mark_id,
        description: mark.mark_description,
        location: mark.mark_location
      })) : [],
      createdAt: prisoner.created_at,
      updatedAt: prisoner.updated_at
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Register new prisoner
 */
const registerPrisoner = async (prisonerData, userPrisonId, userRole, userId) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    // Determine prison ID
    let prisonId;
    if (userRole === USER_ROLES.SUPER_ADMIN && prisonerData.prison_id) {
      prisonId = prisonerData.prison_id;
    } else {
      prisonId = userPrisonId;
    }

    if (!prisonId) {
      throw new Error('Prison ID is required');
    }

    // Check if prison exists and has capacity
    const prison = await db.Prison.findByPk(prisonId);
    if (!prison) {
      throw new Error('Prison not found');
    }

    const activePrisoners = await db.Prisoner.count({
      where: {
        prison_id: prisonId,
        status: PRISONER_STATUS.ACTIVE
      }
    });

    if (activePrisoners >= prison.capacity) {
      throw new Error(`Prison has reached maximum capacity of ${prison.capacity}`);
    }

    // Check if NIC or case number already exists
    const existingPrisoner = await db.Prisoner.findOne({
      where: {
        [Op.or]: [
          { nic: prisonerData.nic },
          { case_number: prisonerData.case_number }
        ]
      }
    });

    if (existingPrisoner) {
      if (existingPrisoner.nic === prisonerData.nic) {
        throw new Error('Prisoner with this NIC already exists');
      }
      if (existingPrisoner.case_number === prisonerData.case_number) {
        throw new Error('Prisoner with this case number already exists');
      }
    }

    // Create prisoner
    const newPrisoner = await db.Prisoner.create({
      full_name: prisonerData.full_name,
      nic: prisonerData.nic,
      case_number: prisonerData.case_number,
      gender: prisonerData.gender,
      birthday: prisonerData.birthday,
      nationality: prisonerData.nationality || 'Sri Lankan',
      admission_date: prisonerData.admission_date || new Date(),
      expected_release_date: prisonerData.expected_release_date,
      status: PRISONER_STATUS.ACTIVE,
      prison_id: prisonId,
      cell_number: prisonerData.cell_number,
      social_status: prisonerData.social_status
    }, { transaction });

    await transaction.commit();

    // Fetch created prisoner with details
    return await getPrisonerById(newPrisoner.prisoner_id, userPrisonId, userRole);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Update prisoner
 */
const updatePrisoner = async (prisonerId, updateData, userPrisonId, userRole, userId) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const prisoner = await db.Prisoner.findByPk(prisonerId);

    if (!prisoner) {
      throw new Error('Prisoner not found');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, prisoner.prison_id, userRole)) {
      throw new Error('You do not have access to this prisoner');
    }

    // Check for duplicate NIC or case number if being updated
    if (updateData.nic && updateData.nic !== prisoner.nic) {
      const existingNIC = await db.Prisoner.findOne({
        where: {
          nic: updateData.nic,
          prisoner_id: { [Op.ne]: prisonerId }
        }
      });

      if (existingNIC) {
        throw new Error('Prisoner with this NIC already exists');
      }
    }

    if (updateData.case_number && updateData.case_number !== prisoner.case_number) {
      const existingCase = await db.Prisoner.findOne({
        where: {
          case_number: updateData.case_number,
          prisoner_id: { [Op.ne]: prisonerId }
        }
      });

      if (existingCase) {
        throw new Error('Prisoner with this case number already exists');
      }
    }

    // Update prisoner
    await prisoner.update(updateData, { transaction });

    await transaction.commit();

    // Return updated prisoner
    return await getPrisonerById(prisonerId, userPrisonId, userRole);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Delete prisoner (change status based on reason)
 */
const deletePrisoner = async (prisonerId, reason, userPrisonId, userRole, userId) => {
  try {
    // Only Prison Admin or Super Admin can delete
    if (userRole !== USER_ROLES.PRISON_ADMIN && userRole !== USER_ROLES.SUPER_ADMIN) {
      throw new Error('Only Prison Admin or Super Admin can delete prisoners');
    }

    const prisoner = await db.Prisoner.findByPk(prisonerId);

    if (!prisoner) {
      throw new Error('Prisoner not found');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, prisoner.prison_id, userRole)) {
      throw new Error('You do not have access to this prisoner');
    }

    // Update status based on reason
    const newStatus = reason === 'deceased' ? PRISONER_STATUS.DECEASED : PRISONER_STATUS.RELEASED;
    await prisoner.update({
      status: newStatus,
      actual_release_date: new Date()
    });

    return { message: `Prisoner marked as ${newStatus.toLowerCase()} successfully` };
  } catch (error) {
    throw error;
  }
};

/**
 * Add family details
 */
const addFamilyDetails = async (prisonerId, familyData, userPrisonId, userRole) => {
  try {
    const prisoner = await db.Prisoner.findByPk(prisonerId);

    if (!prisoner) {
      throw new Error('Prisoner not found');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, prisoner.prison_id, userRole)) {
      throw new Error('You do not have access to this prisoner');
    }

    const familyMember = await db.PrisonerFamilyDetail.create({
      prisoner_id: prisonerId,
      family_member_name: familyData.family_member_name,
      relationship: familyData.relationship,
      contact_number: familyData.contact_number,
      address: familyData.address,
      nic: familyData.nic,
      emergency_contact: familyData.emergency_contact || false
    });

    return {
      familyId: familyMember.family_id,
      memberName: familyMember.family_member_name,
      relationship: familyMember.relationship,
      contactNumber: familyMember.contact_number,
      address: familyMember.address,
      nic: familyMember.nic,
      emergencyContact: familyMember.emergency_contact
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Update family details
 */
const updateFamilyDetails = async (prisonerId, familyId, updateData, userPrisonId, userRole) => {
  try {
    const prisoner = await db.Prisoner.findByPk(prisonerId);

    if (!prisoner) {
      throw new Error('Prisoner not found');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, prisoner.prison_id, userRole)) {
      throw new Error('You do not have access to this prisoner');
    }

    const familyMember = await db.PrisonerFamilyDetail.findOne({
      where: {
        family_id: familyId,
        prisoner_id: prisonerId
      }
    });

    if (!familyMember) {
      throw new Error('Family member not found');
    }

    await familyMember.update(updateData);

    return {
      familyId: familyMember.family_id,
      memberName: familyMember.family_member_name,
      relationship: familyMember.relationship,
      contactNumber: familyMember.contact_number,
      address: familyMember.address,
      nic: familyMember.nic,
      emergencyContact: familyMember.emergency_contact
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Delete family member
 */
const deleteFamilyMember = async (prisonerId, familyId, userPrisonId, userRole) => {
  try {
    const prisoner = await db.Prisoner.findByPk(prisonerId);

    if (!prisoner) {
      throw new Error('Prisoner not found');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, prisoner.prison_id, userRole)) {
      throw new Error('You do not have access to this prisoner');
    }

    const familyMember = await db.PrisonerFamilyDetail.findOne({
      where: {
        family_id: familyId,
        prisoner_id: prisonerId
      }
    });

    if (!familyMember) {
      throw new Error('Family member not found');
    }

    await familyMember.destroy();
  } catch (error) {
    throw error;
  }
};

/**
 * Upload prisoner photo
 */
const uploadPhoto = async (prisonerId, file, photoType, userPrisonId, userRole) => {
  try {
    const prisoner = await db.Prisoner.findByPk(prisonerId);

    if (!prisoner) {
      throw new Error('Prisoner not found');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, prisoner.prison_id, userRole)) {
      throw new Error('You do not have access to this prisoner');
    }

    // Generate photo URL
    const photoUrl = `/uploads/prisoner-photos/${file.filename}`;

    const photo = await db.PrisonerPhoto.create({
      prisoner_id: prisonerId,
      photo_url: photoUrl,
      photo_type: photoType || 'Other',
      upload_date: new Date()
    });

    return {
      photoId: photo.photo_id,
      photoUrl: photo.photo_url,
      photoType: photo.photo_type,
      uploadDate: photo.upload_date
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Delete prisoner photo
 */
const deletePhoto = async (prisonerId, photoId, userPrisonId, userRole) => {
  try {
    const prisoner = await db.Prisoner.findByPk(prisonerId);

    if (!prisoner) {
      throw new Error('Prisoner not found');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, prisoner.prison_id, userRole)) {
      throw new Error('You do not have access to this prisoner');
    }

    const photo = await db.PrisonerPhoto.findOne({
      where: {
        photo_id: photoId,
        prisoner_id: prisonerId
      }
    });

    if (!photo) {
      throw new Error('Photo not found');
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '../../', photo.photo_url);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.log('File not found or already deleted:', err.message);
    }

    await photo.destroy();
  } catch (error) {
    throw error;
  }
};

/**
 * Add body mark
 */
const addBodyMark = async (prisonerId, markData, userPrisonId, userRole) => {
  try {
    const prisoner = await db.Prisoner.findByPk(prisonerId);

    if (!prisoner) {
      throw new Error('Prisoner not found');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, prisoner.prison_id, userRole)) {
      throw new Error('You do not have access to this prisoner');
    }

    const bodyMark = await db.PrisonerBodyMark.create({
      prisoner_id: prisonerId,
      mark_description: markData.mark_description,
      mark_location: markData.mark_location
    });

    return {
      markId: bodyMark.mark_id,
      description: bodyMark.mark_description,
      location: bodyMark.mark_location
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Update body mark
 */
const updateBodyMark = async (prisonerId, markId, updateData, userPrisonId, userRole) => {
  try {
    const prisoner = await db.Prisoner.findByPk(prisonerId);

    if (!prisoner) {
      throw new Error('Prisoner not found');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, prisoner.prison_id, userRole)) {
      throw new Error('You do not have access to this prisoner');
    }

    const bodyMark = await db.PrisonerBodyMark.findOne({
      where: {
        mark_id: markId,
        prisoner_id: prisonerId
      }
    });

    if (!bodyMark) {
      throw new Error('Body mark not found');
    }

    await bodyMark.update(updateData);

    return {
      markId: bodyMark.mark_id,
      description: bodyMark.mark_description,
      location: bodyMark.mark_location
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Delete body mark
 */
const deleteBodyMark = async (prisonerId, markId, userPrisonId, userRole) => {
  try {
    const prisoner = await db.Prisoner.findByPk(prisonerId);

    if (!prisoner) {
      throw new Error('Prisoner not found');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, prisoner.prison_id, userRole)) {
      throw new Error('You do not have access to this prisoner');
    }

    const bodyMark = await db.PrisonerBodyMark.findOne({
      where: {
        mark_id: markId,
        prisoner_id: prisonerId
      }
    });

    if (!bodyMark) {
      throw new Error('Body mark not found');
    }

    await bodyMark.destroy();
  } catch (error) {
    throw error;
  }
};

/**
 * Transfer prisoner to another prison
 */
const transferPrisoner = async (prisonerId, targetPrisonId, transferReason, userPrisonId, userRole, userId) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    // Only Prison Admin or Super Admin can transfer
    if (userRole !== USER_ROLES.PRISON_ADMIN && userRole !== USER_ROLES.SUPER_ADMIN) {
      throw new Error('Only Prison Admin or Super Admin can transfer prisoners');
    }

    const prisoner = await db.Prisoner.findByPk(prisonerId);

    if (!prisoner) {
      throw new Error('Prisoner not found');
    }

    // Check access to source prison
    if (!checkPrisonAccess(userPrisonId, prisoner.prison_id, userRole)) {
      throw new Error('You do not have access to this prisoner');
    }

    // Check if target prison exists and has capacity
    const targetPrison = await db.Prison.findByPk(targetPrisonId);
    if (!targetPrison) {
      throw new Error('Target prison not found');
    }

    const activePrisoners = await db.Prisoner.count({
      where: {
        prison_id: targetPrisonId,
        status: PRISONER_STATUS.ACTIVE
      }
    });

    if (activePrisoners >= targetPrison.capacity) {
      throw new Error(`Target prison has reached maximum capacity of ${targetPrison.capacity}`);
    }

    // Update prisoner
    await prisoner.update({
      prison_id: targetPrisonId,
      status: PRISONER_STATUS.ACTIVE
    }, { transaction });

    await transaction.commit();

    return {
      prisonerId: prisoner.prisoner_id,
      fullName: prisoner.full_name,
      previousPrison: prisoner.prison_id,
      newPrison: targetPrisonId,
      transferReason: transferReason
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Release prisoner
 */
const releasePrisoner = async (prisonerId, releaseReason, releaseNotes, userPrisonId, userRole, userId) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    // Only Prison Admin or Super Admin can release
    if (userRole !== USER_ROLES.PRISON_ADMIN && userRole !== USER_ROLES.SUPER_ADMIN) {
      throw new Error('Only Prison Admin or Super Admin can release prisoners');
    }

    const prisoner = await db.Prisoner.findByPk(prisonerId);

    if (!prisoner) {
      throw new Error('Prisoner not found');
    }

    // Check access
    if (!checkPrisonAccess(userPrisonId, prisoner.prison_id, userRole)) {
      throw new Error('You do not have access to this prisoner');
    }

    if (prisoner.status === PRISONER_STATUS.RELEASED) {
      throw new Error('Prisoner is already released');
    }

    // Update prisoner
    await prisoner.update({
      status: PRISONER_STATUS.RELEASED,
      actual_release_date: new Date()
    }, { transaction });

    await transaction.commit();

    return {
      prisonerId: prisoner.prisoner_id,
      fullName: prisoner.full_name,
      releaseDate: prisoner.actual_release_date,
      releaseReason: releaseReason,
      releaseNotes: releaseNotes
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Get prisoner statistics
 */
const getPrisonerStatistics = async (prisonId = null) => {
  try {
    const whereClause = prisonId ? { prison_id: prisonId } : {};

    // Get prisoner count by status
    const statusStats = await db.Prisoner.findAll({
      where: whereClause,
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('prisoner_id')), 'count']
      ],
      group: ['status']
    });

    // Get prisoner count by gender
    const genderStats = await db.Prisoner.findAll({
      where: { ...whereClause, status: PRISONER_STATUS.ACTIVE },
      attributes: [
        'gender',
        [db.sequelize.fn('COUNT', db.sequelize.col('prisoner_id')), 'count']
      ],
      group: ['gender']
    });

    // Get prisoner count by nationality (top 5)
    const nationalityStats = await db.Prisoner.findAll({
      where: { ...whereClause, status: PRISONER_STATUS.ACTIVE },
      attributes: [
        'nationality',
        [db.sequelize.fn('COUNT', db.sequelize.col('prisoner_id')), 'count']
      ],
      group: ['nationality'],
      order: [[db.sequelize.fn('COUNT', db.sequelize.col('prisoner_id')), 'DESC']],
      limit: 5
    });

    // Calculate total
    const total = statusStats.reduce((sum, stat) => sum + parseInt(stat.dataValues.count), 0);

    return {
      total,
      byStatus: statusStats.map(stat => ({
        status: stat.status,
        count: parseInt(stat.dataValues.count)
      })),
      byGender: genderStats.map(stat => ({
        gender: stat.gender,
        count: parseInt(stat.dataValues.count)
      })),
      byNationality: nationalityStats.map(stat => ({
        nationality: stat.nationality,
        count: parseInt(stat.dataValues.count)
      }))
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllPrisoners,
  getPrisonerById,
  registerPrisoner,
  updatePrisoner,
  deletePrisoner,
  addFamilyDetails,
  updateFamilyDetails,
  deleteFamilyMember,
  uploadPhoto,
  deletePhoto,
  addBodyMark,
  updateBodyMark,
  deleteBodyMark,
  transferPrisoner,
  releasePrisoner,
  getPrisonerStatistics
};