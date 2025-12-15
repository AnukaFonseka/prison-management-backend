const visitorService = require('../services/visitorService');

/**
 * @desc    Get all visitors with filtering and pagination
 * @route   GET /api/visitors
 * @access  Private
 */
const getAllVisitors = async (req, res) => {
  try {
    const { 
      search,
      page = 1, 
      limit = 10 
    } = req.query;

    const filters = {};
    if (search) filters.search = search;

    const result = await visitorService.getAllVisitors(filters, page, limit);

    res.status(200).json({
      success: true,
      data: result.visitors,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch visitors'
    });
  }
};

/**
 * @desc    Search visitors by NIC or name
 * @route   GET /api/visitors/search
 * @access  Private
 */
const searchVisitors = async (req, res) => {
  try {
    const { query } = req.query;

    const visitors = await visitorService.searchVisitors(query);

    res.status(200).json({
      success: true,
      data: visitors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to search visitors'
    });
  }
};

/**
 * @desc    Get visitor by ID
 * @route   GET /api/visitors/:id
 * @access  Private
 */
const getVisitorById = async (req, res) => {
  try {
    const { id } = req.params;
    const visitor = await visitorService.getVisitorById(id);

    res.status(200).json({
      success: true,
      data: visitor
    });
  } catch (error) {
    const statusCode = error.message === 'Visitor not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch visitor'
    });
  }
};

/**
 * @desc    Create new visitor
 * @route   POST /api/visitors
 * @access  Private (Visitor Manager or higher)
 */
const createVisitor = async (req, res) => {
  try {
    const visitor = await visitorService.createVisitor(req.body);

    res.status(201).json({
      success: true,
      message: 'Visitor created successfully',
      data: visitor
    });
  } catch (error) {
    const statusCode = error.message.includes('already exists') ? 409 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create visitor'
    });
  }
};

/**
 * @desc    Update visitor
 * @route   PUT /api/visitors/:id
 * @access  Private (Visitor Manager or higher)
 */
const updateVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    const visitor = await visitorService.updateVisitor(id, req.body);

    res.status(200).json({
      success: true,
      message: 'Visitor updated successfully',
      data: visitor
    });
  } catch (error) {
    const statusCode = error.message === 'Visitor not found' ? 404 :
                       error.message.includes('already exists') ? 409 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update visitor'
    });
  }
};

/**
 * @desc    Delete visitor
 * @route   DELETE /api/visitors/:id
 * @access  Private (Prison Admin or Super Admin only)
 */
const deleteVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    
    await visitorService.deleteVisitor(id);

    res.status(200).json({
      success: true,
      message: 'Visitor deleted successfully'
    });
  } catch (error) {
    const statusCode = error.message === 'Visitor not found' ? 404 :
                       error.message.includes('has visit records') ? 400 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to delete visitor'
    });
  }
};

/**
 * @desc    Get visitor's visit history
 * @route   GET /api/visitors/:id/history
 * @access  Private
 */
const getVisitorHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const result = await visitorService.getVisitorHistory(
      id,
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
    const statusCode = error.message === 'Visitor not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch visitor history'
    });
  }
};

/**
 * @desc    Get visitor statistics
 * @route   GET /api/visitors/statistics
 * @access  Private
 */
const getVisitorStatistics = async (req, res) => {
  try {
    const { prison_id, start_date, end_date } = req.query;
    
    // Determine which prison to get stats for
    let targetPrisonId = null;
    if (req.user.roleName === 'Super Admin') {
      targetPrisonId = prison_id || null;
    } else {
      targetPrisonId = req.user.prisonId;
    }

    const statistics = await visitorService.getVisitorStatistics(
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
      message: error.message || 'Failed to fetch visitor statistics'
    });
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