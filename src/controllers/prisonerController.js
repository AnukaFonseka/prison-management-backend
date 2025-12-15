const prisonerService = require('../services/prisonerService');

/**
 * @desc    Get all prisoners with filtering and pagination
 * @route   GET /api/prisoners
 * @access  Private
 */
const getAllPrisoners = async (req, res) => {
  try {
    const { 
      prison_id, 
      status, 
      gender, 
      nationality,
      search, 
      page = 1, 
      limit = 10 
    } = req.query;

    // Build filters
    const filters = {};
    
    // Prison admins and staff can only see prisoners from their prison
    if (req.user.roleName !== 'Super Admin' && req.user.prisonId) {
      filters.prisonId = req.user.prisonId;
    } else if (prison_id) {
      filters.prisonId = prison_id;
    }
    
    if (status) filters.status = status;
    if (gender) filters.gender = gender;
    if (nationality) filters.nationality = nationality;
    if (search) filters.search = search;

    const result = await prisonerService.getAllPrisoners(filters, page, limit);

    res.status(200).json({
      success: true,
      data: result.prisoners,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch prisoners'
    });
  }
};

/**
 * @desc    Get prisoner by ID
 * @route   GET /api/prisoners/:id
 * @access  Private
 */
const getPrisonerById = async (req, res) => {
  try {
    const { id } = req.params;
    const prisoner = await prisonerService.getPrisonerById(
      id,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(200).json({
      success: true,
      data: prisoner
    });
  } catch (error) {
    const statusCode = error.message === 'Prisoner not found' ? 404 :
                       error.message.includes('access') ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch prisoner'
    });
  }
};

/**
 * @desc    Register new prisoner
 * @route   POST /api/prisoners
 * @access  Private (Officer or higher)
 */
const registerPrisoner = async (req, res) => {
  try {
    const prisoner = await prisonerService.registerPrisoner(
      req.body,
      req.user.prisonId,
      req.user.roleName,
      req.user.userId
    );

    res.status(201).json({
      success: true,
      message: 'Prisoner registered successfully',
      data: prisoner
    });
  } catch (error) {
    const statusCode = error.message.includes('already exists') ? 409 :
                       error.message.includes('access') ? 403 :
                       error.message.includes('capacity') ? 400 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to register prisoner'
    });
  }
};

/**
 * @desc    Update prisoner
 * @route   PUT /api/prisoners/:id
 * @access  Private (Officer or higher)
 */
const updatePrisoner = async (req, res) => {
  try {
    const { id } = req.params;
    const prisoner = await prisonerService.updatePrisoner(
      id,
      req.body,
      req.user.prisonId,
      req.user.roleName,
      req.user.userId
    );

    res.status(200).json({
      success: true,
      message: 'Prisoner updated successfully',
      data: prisoner
    });
  } catch (error) {
    const statusCode = error.message === 'Prisoner not found' ? 404 :
                       error.message.includes('already exists') ? 409 :
                       error.message.includes('access') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update prisoner'
    });
  }
};

/**
 * @desc    Delete prisoner (soft delete - mark as released/transferred)
 * @route   DELETE /api/prisoners/:id
 * @access  Private (Prison Admin or Super Admin only)
 */
const deletePrisoner = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const result = await prisonerService.deletePrisoner(
      id,
      reason,
      req.user.prisonId,
      req.user.roleName,
      req.user.userId
    );

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    const statusCode = error.message === 'Prisoner not found' ? 404 :
                       error.message.includes('access') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to delete prisoner'
    });
  }
};

/**
 * @desc    Add family details to prisoner
 * @route   POST /api/prisoners/:id/family
 * @access  Private
 */
const addFamilyDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const familyMember = await prisonerService.addFamilyDetails(
      id,
      req.body,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(201).json({
      success: true,
      message: 'Family member added successfully',
      data: familyMember
    });
  } catch (error) {
    const statusCode = error.message === 'Prisoner not found' ? 404 :
                       error.message.includes('access') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to add family member'
    });
  }
};

/**
 * @desc    Update family member details
 * @route   PUT /api/prisoners/:id/family/:familyId
 * @access  Private
 */
const updateFamilyDetails = async (req, res) => {
  try {
    const { id, familyId } = req.params;
    const familyMember = await prisonerService.updateFamilyDetails(
      id,
      familyId,
      req.body,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(200).json({
      success: true,
      message: 'Family member updated successfully',
      data: familyMember
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('access') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update family member'
    });
  }
};

/**
 * @desc    Delete family member
 * @route   DELETE /api/prisoners/:id/family/:familyId
 * @access  Private
 */
const deleteFamilyMember = async (req, res) => {
  try {
    const { id, familyId } = req.params;
    await prisonerService.deleteFamilyMember(
      id,
      familyId,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(200).json({
      success: true,
      message: 'Family member deleted successfully'
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('access') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to delete family member'
    });
  }
};

/**
 * @desc    Upload prisoner photo
 * @route   POST /api/prisoners/:id/photos
 * @access  Private
 */
const uploadPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const { photo_type } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No photo file uploaded'
      });
    }

    const photo = await prisonerService.uploadPhoto(
      id,
      req.file,
      photo_type,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(201).json({
      success: true,
      message: 'Photo uploaded successfully',
      data: photo
    });
  } catch (error) {
    const statusCode = error.message === 'Prisoner not found' ? 404 :
                       error.message.includes('access') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to upload photo'
    });
  }
};

/**
 * @desc    Delete prisoner photo
 * @route   DELETE /api/prisoners/:id/photos/:photoId
 * @access  Private
 */
const deletePhoto = async (req, res) => {
  try {
    const { id, photoId } = req.params;
    await prisonerService.deletePhoto(
      id,
      photoId,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(200).json({
      success: true,
      message: 'Photo deleted successfully'
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('access') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to delete photo'
    });
  }
};

/**
 * @desc    Add body mark to prisoner
 * @route   POST /api/prisoners/:id/body-marks
 * @access  Private
 */
const addBodyMark = async (req, res) => {
  try {
    const { id } = req.params;
    const bodyMark = await prisonerService.addBodyMark(
      id,
      req.body,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(201).json({
      success: true,
      message: 'Body mark added successfully',
      data: bodyMark
    });
  } catch (error) {
    const statusCode = error.message === 'Prisoner not found' ? 404 :
                       error.message.includes('access') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to add body mark'
    });
  }
};

/**
 * @desc    Update body mark
 * @route   PUT /api/prisoners/:id/body-marks/:markId
 * @access  Private
 */
const updateBodyMark = async (req, res) => {
  try {
    const { id, markId } = req.params;
    const bodyMark = await prisonerService.updateBodyMark(
      id,
      markId,
      req.body,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(200).json({
      success: true,
      message: 'Body mark updated successfully',
      data: bodyMark
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('access') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update body mark'
    });
  }
};

/**
 * @desc    Delete body mark
 * @route   DELETE /api/prisoners/:id/body-marks/:markId
 * @access  Private
 */
const deleteBodyMark = async (req, res) => {
  try {
    const { id, markId } = req.params;
    await prisonerService.deleteBodyMark(
      id,
      markId,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(200).json({
      success: true,
      message: 'Body mark deleted successfully'
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('access') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to delete body mark'
    });
  }
};

/**
 * @desc    Transfer prisoner to another prison
 * @route   POST /api/prisoners/:id/transfer
 * @access  Private (Prison Admin or Super Admin only)
 */
const transferPrisoner = async (req, res) => {
  try {
    const { id } = req.params;
    const { target_prison_id, transfer_reason } = req.body;
    
    const result = await prisonerService.transferPrisoner(
      id,
      target_prison_id,
      transfer_reason,
      req.user.prisonId,
      req.user.roleName,
      req.user.userId
    );

    res.status(200).json({
      success: true,
      message: 'Prisoner transferred successfully',
      data: result
    });
  } catch (error) {
    const statusCode = error.message === 'Prisoner not found' ? 404 :
                       error.message === 'Target prison not found' ? 404 :
                       error.message.includes('access') ? 403 :
                       error.message.includes('capacity') ? 400 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to transfer prisoner'
    });
  }
};

/**
 * @desc    Release prisoner
 * @route   POST /api/prisoners/:id/release
 * @access  Private (Prison Admin or Super Admin only)
 */
const releasePrisoner = async (req, res) => {
  try {
    const { id } = req.params;
    const { release_reason, release_notes } = req.body;
    
    const result = await prisonerService.releasePrisoner(
      id,
      release_reason,
      release_notes,
      req.user.prisonId,
      req.user.roleName,
      req.user.userId
    );

    res.status(200).json({
      success: true,
      message: 'Prisoner released successfully',
      data: result
    });
  } catch (error) {
    const statusCode = error.message === 'Prisoner not found' ? 404 :
                       error.message.includes('access') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to release prisoner'
    });
  }
};

/**
 * @desc    Get prisoner statistics
 * @route   GET /api/prisoners/statistics
 * @access  Private
 */
const getPrisonerStatistics = async (req, res) => {
  try {
    const { prison_id } = req.query;
    
    // Determine which prison to get stats for
    let targetPrisonId = null;
    if (req.user.roleName === 'Super Admin') {
      targetPrisonId = prison_id || null; // null means all prisons
    } else {
      targetPrisonId = req.user.prisonId;
    }

    const statistics = await prisonerService.getPrisonerStatistics(targetPrisonId);

    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch prisoner statistics'
    });
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