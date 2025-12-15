const behaviourService = require('../services/behaviourService');

/**
 * @desc    Get all behaviour records with filtering and pagination
 * @route   GET /api/behaviour-records
 * @access  Private
 */
const getAllBehaviourRecords = async (req, res) => {
  try {
    const { 
      prison_id, 
      prisoner_id,
      behaviour_type, 
      severity_level,
      adjustment_status,
      start_date,
      end_date,
      search, 
      page = 1, 
      limit = 10 
    } = req.query;

    // Build filters
    const filters = {};
    
    // Prison admins and staff can only see records from their prison
    if (req.user.roleName !== 'Super Admin' && req.user.prisonId) {
      filters.prisonId = req.user.prisonId;
    } else if (prison_id) {
      filters.prisonId = prison_id;
    }
    
    if (prisoner_id) filters.prisonerId = prisoner_id;
    if (behaviour_type) filters.behaviourType = behaviour_type;
    if (severity_level) filters.severityLevel = severity_level;
    if (adjustment_status) filters.adjustmentStatus = adjustment_status;
    if (start_date) filters.startDate = start_date;
    if (end_date) filters.endDate = end_date;
    if (search) filters.search = search;

    const result = await behaviourService.getAllBehaviourRecords(filters, page, limit);

    res.status(200).json({
      success: true,
      data: result.behaviourRecords,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch behaviour records'
    });
  }
};

/**
 * @desc    Get behaviour records for a specific prisoner
 * @route   GET /api/behaviour-records/prisoner/:prisonerId
 * @access  Private
 */
const getBehaviourRecordsByPrisoner = async (req, res) => {
  try {
    const { prisonerId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const result = await behaviourService.getBehaviourRecordsByPrisoner(
      prisonerId,
      req.user.prisonId,
      req.user.roleName,
      page,
      limit
    );

    res.status(200).json({
      success: true,
      data: result.behaviourRecords,
      summary: result.summary,
      pagination: result.pagination
    });
  } catch (error) {
    const statusCode = error.message === 'Prisoner not found' ? 404 :
                       error.message.includes('access') ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch behaviour records'
    });
  }
};

/**
 * @desc    Get behaviour record by ID
 * @route   GET /api/behaviour-records/:id
 * @access  Private
 */
const getBehaviourRecordById = async (req, res) => {
  try {
    const { id } = req.params;
    const behaviourRecord = await behaviourService.getBehaviourRecordById(
      id,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(200).json({
      success: true,
      data: behaviourRecord
    });
  } catch (error) {
    const statusCode = error.message === 'Behaviour record not found' ? 404 :
                       error.message.includes('access') ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch behaviour record'
    });
  }
};

/**
 * @desc    Create new behaviour record
 * @route   POST /api/behaviour-records
 * @access  Private (Officer or higher)
 */
const createBehaviourRecord = async (req, res) => {
  try {
    const behaviourRecord = await behaviourService.createBehaviourRecord(
      req.body,
      req.user.userId,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(201).json({
      success: true,
      message: 'Behaviour record created successfully',
      data: behaviourRecord
    });
  } catch (error) {
    const statusCode = error.message === 'Prisoner not found' ? 404 :
                       error.message.includes('access') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create behaviour record'
    });
  }
};

/**
 * @desc    Update behaviour record
 * @route   PUT /api/behaviour-records/:id
 * @access  Private (Officer or higher)
 */
const updateBehaviourRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const behaviourRecord = await behaviourService.updateBehaviourRecord(
      id,
      req.body,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(200).json({
      success: true,
      message: 'Behaviour record updated successfully',
      data: behaviourRecord
    });
  } catch (error) {
    const statusCode = error.message === 'Behaviour record not found' ? 404 :
                       error.message.includes('access') ? 403 :
                       error.message.includes('approved') ? 400 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update behaviour record'
    });
  }
};

/**
 * @desc    Delete behaviour record
 * @route   DELETE /api/behaviour-records/:id
 * @access  Private (Prison Admin or Super Admin only)
 */
const deleteBehaviourRecord = async (req, res) => {
  try {
    const { id } = req.params;
    
    await behaviourService.deleteBehaviourRecord(
      id,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(200).json({
      success: true,
      message: 'Behaviour record deleted successfully'
    });
  } catch (error) {
    const statusCode = error.message === 'Behaviour record not found' ? 404 :
                       error.message.includes('access') ? 403 :
                       error.message.includes('approved') ? 400 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to delete behaviour record'
    });
  }
};

/**
 * @desc    Approve sentence adjustment for behaviour record
 * @route   POST /api/behaviour-records/:id/approve-adjustment
 * @access  Private (Prison Admin or Super Admin only)
 */
const approveSentenceAdjustment = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body || "";

    console.log("controller called")
    
    const result = await behaviourService.approveSentenceAdjustment(
      id,
      notes,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(200).json({
      success: true,
      message: 'Sentence adjustment approved successfully',
      data: result
    });
  } catch (error) {
    const statusCode = error.message === 'Behaviour record not found' ? 404 :
                       error.message.includes('access') ? 403 :
                       error.message.includes('already') ? 400 :
                       error.message.includes('No sentence') ? 400 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to approve sentence adjustment'
    });
  }
};

/**
 * @desc    Reject sentence adjustment for behaviour record
 * @route   POST /api/behaviour-records/:id/reject-adjustment
 * @access  Private (Prison Admin or Super Admin only)
 */
const rejectSentenceAdjustment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const result = await behaviourService.rejectSentenceAdjustment(
      id,
      reason,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(200).json({
      success: true,
      message: 'Sentence adjustment rejected',
      data: result
    });
  } catch (error) {
    const statusCode = error.message === 'Behaviour record not found' ? 404 :
                       error.message.includes('access') ? 403 :
                       error.message.includes('already') ? 400 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to reject sentence adjustment'
    });
  }
};

/**
 * @desc    Get behaviour records with pending sentence adjustments
 * @route   GET /api/behaviour-records/pending-adjustments
 * @access  Private (Prison Admin or Super Admin only)
 */
const getPendingAdjustments = async (req, res) => {
  try {
    const { prison_id, page = 1, limit = 10 } = req.query;
    
    // Determine which prison to get pending adjustments for
    let targetPrisonId = null;
    if (req.user.roleName === 'Super Admin') {
      targetPrisonId = prison_id || null; // null means all prisons
    } else {
      targetPrisonId = req.user.prisonId;
    }

    const result = await behaviourService.getPendingAdjustments(
      targetPrisonId,
      page,
      limit
    );

    res.status(200).json({
      success: true,
      data: result.behaviourRecords,
      summary: result.summary,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch pending adjustments'
    });
  }
};

/**
 * @desc    Calculate behaviour score for a prisoner
 * @route   GET /api/behaviour-records/prisoner/:prisonerId/score
 * @access  Private
 */
const calculateBehaviourScore = async (req, res) => {
  try {
    const { prisonerId } = req.params;
    const { months = 6 } = req.query; // Default to last 6 months

    const score = await behaviourService.calculateBehaviourScore(
      prisonerId,
      req.user.prisonId,
      req.user.roleName,
      parseInt(months)
    );

    res.status(200).json({
      success: true,
      data: score
    });
  } catch (error) {
    const statusCode = error.message === 'Prisoner not found' ? 404 :
                       error.message.includes('access') ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to calculate behaviour score'
    });
  }
};

/**
 * @desc    Get behaviour statistics
 * @route   GET /api/behaviour-records/statistics
 * @access  Private
 */
const getBehaviourStatistics = async (req, res) => {
  try {
    const { prison_id, start_date, end_date } = req.query;
    
    // Determine which prison to get stats for
    let targetPrisonId = null;
    if (req.user.roleName === 'Super Admin') {
      targetPrisonId = prison_id || null; // null means all prisons
    } else {
      targetPrisonId = req.user.prisonId;
    }

    const statistics = await behaviourService.getBehaviourStatistics(
      targetPrisonId,
      start_date,
      end_date
    );

    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch behaviour statistics'
    });
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