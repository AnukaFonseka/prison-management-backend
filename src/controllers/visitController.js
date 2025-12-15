const visitService = require('../services/visitService');

/**
 * @desc    Get all visits with filtering and pagination
 * @route   GET /api/visits
 * @access  Private
 */
const getAllVisits = async (req, res) => {
  try {
    const { 
      prison_id,
      prisoner_id,
      visitor_id,
      status,
      start_date,
      end_date,
      search,
      page = 1, 
      limit = 10 
    } = req.query;

    // Build filters
    const filters = {};
    
    // Prison admins and staff can only see visits from their prison
    if (req.user.roleName !== 'Super Admin' && req.user.prisonId) {
      filters.prisonId = req.user.prisonId;
    } else if (prison_id) {
      filters.prisonId = prison_id;
    }
    
    if (prisoner_id) filters.prisonerId = prisoner_id;
    if (visitor_id) filters.visitorId = visitor_id;
    if (status) filters.status = status;
    if (start_date) filters.startDate = start_date;
    if (end_date) filters.endDate = end_date;
    if (search) filters.search = search;

    const result = await visitService.getAllVisits(filters, page, limit);

    res.status(200).json({
      success: true,
      data: result.visits,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch visits'
    });
  }
};

/**
 * @desc    Get visits for a specific prisoner
 * @route   GET /api/visits/prisoner/:prisonerId
 * @access  Private
 */
const getVisitsByPrisoner = async (req, res) => {
  try {
    const { prisonerId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const result = await visitService.getVisitsByPrisoner(
      prisonerId,
      req.user.prisonId,
      req.user.roleName,
      page,
      limit
    );

    res.status(200).json({
      success: true,
      data: result.visits,
      summary: result.summary,
      pagination: result.pagination
    });
  } catch (error) {
    const statusCode = error.message === 'Prisoner not found' ? 404 :
                       error.message.includes('access') ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch visits'
    });
  }
};

/**
 * @desc    Get upcoming scheduled visits
 * @route   GET /api/visits/upcoming
 * @access  Private
 */
const getUpcomingVisits = async (req, res) => {
  try {
    const { prison_id, page = 1, limit = 10 } = req.query;
    
    // Determine which prison to get upcoming visits for
    let targetPrisonId = null;
    if (req.user.roleName === 'Super Admin') {
      targetPrisonId = prison_id || null;
    } else {
      targetPrisonId = req.user.prisonId;
    }

    const result = await visitService.getUpcomingVisits(
      targetPrisonId,
      page,
      limit
    );

    res.status(200).json({
      success: true,
      data: result.visits,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch upcoming visits'
    });
  }
};

/**
 * @desc    Get visit by ID
 * @route   GET /api/visits/:id
 * @access  Private
 */
const getVisitById = async (req, res) => {
  try {
    const { id } = req.params;
    const visit = await visitService.getVisitById(
      id,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(200).json({
      success: true,
      data: visit
    });
  } catch (error) {
    const statusCode = error.message === 'Visit not found' ? 404 :
                       error.message.includes('access') ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch visit'
    });
  }
};

/**
 * @desc    Schedule new visit
 * @route   POST /api/visits
 * @access  Private (Visitor Manager or higher)
 */
const scheduleVisit = async (req, res) => {
  try {
    const visit = await visitService.scheduleVisit(
      req.body,
      req.user.userId,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(201).json({
      success: true,
      message: 'Visit scheduled successfully',
      data: visit
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('access') ? 403 :
                       error.message.includes('conflict') ? 409 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to schedule visit'
    });
  }
};

/**
 * @desc    Update visit
 * @route   PUT /api/visits/:id
 * @access  Private (Visitor Manager or higher)
 */
const updateVisit = async (req, res) => {
  try {
    const { id } = req.params;
    const visit = await visitService.updateVisit(
      id,
      req.body,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(200).json({
      success: true,
      message: 'Visit updated successfully',
      data: visit
    });
  } catch (error) {
    const statusCode = error.message === 'Visit not found' ? 404 :
                       error.message.includes('access') ? 403 :
                       error.message.includes('Cannot update') ? 400 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update visit'
    });
  }
};

/**
 * @desc    Update visit status
 * @route   PATCH /api/visits/:id/status
 * @access  Private (Visitor Manager or higher)
 */
const updateVisitStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const visit = await visitService.updateVisitStatus(
      id,
      status,
      notes,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(200).json({
      success: true,
      message: 'Visit status updated successfully',
      data: visit
    });
  } catch (error) {
    const statusCode = error.message === 'Visit not found' ? 404 :
                       error.message.includes('access') ? 403 :
                       error.message.includes('Invalid') ? 400 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update visit status'
    });
  }
};

/**
 * @desc    Delete visit
 * @route   DELETE /api/visits/:id
 * @access  Private (Prison Admin or Super Admin only)
 */
const deleteVisit = async (req, res) => {
  try {
    const { id } = req.params;
    
    await visitService.deleteVisit(
      id,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(200).json({
      success: true,
      message: 'Visit deleted successfully'
    });
  } catch (error) {
    const statusCode = error.message === 'Visit not found' ? 404 :
                       error.message.includes('access') ? 403 :
                       error.message.includes('Cannot delete') ? 400 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to delete visit'
    });
  }
};

/**
 * @desc    Approve visit
 * @route   POST /api/visits/:id/approve
 * @access  Private (Prison Admin or higher)
 */
const approveVisit = async (req, res) => {
  try {
    const { id } = req.params;
    
    const visit = await visitService.approveVisit(
      id,
      req.user.userId,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(200).json({
      success: true,
      message: 'Visit approved successfully',
      data: visit
    });
  } catch (error) {
    const statusCode = error.message === 'Visit not found' ? 404 :
                       error.message.includes('access') ? 403 :
                       error.message.includes('already') ? 400 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to approve visit'
    });
  }
};

/**
 * @desc    Get visit statistics
 * @route   GET /api/visits/statistics
 * @access  Private
 */
const getVisitStatistics = async (req, res) => {
  try {
    const { prison_id, start_date, end_date } = req.query;
    
    // Determine which prison to get stats for
    let targetPrisonId = null;
    if (req.user.roleName === 'Super Admin') {
      targetPrisonId = prison_id || null;
    } else {
      targetPrisonId = req.user.prisonId;
    }

    const statistics = await visitService.getVisitStatistics(
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
      message: error.message || 'Failed to fetch visit statistics'
    });
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