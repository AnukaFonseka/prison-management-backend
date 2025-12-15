const prisonService = require('../services/prisonService');

/**
 * @desc    Get all prisons
 * @route   GET /api/prisons
 * @access  Private
 */
const getAllPrisons = async (req, res) => {
  try {
    const { location, is_active, search, page = 1, limit = 10 } = req.query;

    // Build filters
    const filters = {};
    
    if (location) filters.location = location;
    if (is_active !== undefined) filters.isActive = is_active === 'true';
    if (search) filters.search = search;

    const result = await prisonService.getAllPrisons(filters, page, limit);

    res.status(200).json({
      success: true,
      data: result.prisons,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch prisons'
    });
  }
};

/**
 * @desc    Get prison by ID
 * @route   GET /api/prisons/:id
 * @access  Private
 */
const getPrisonById = async (req, res) => {
  try {
    const { id } = req.params;
    const prison = await prisonService.getPrisonById(id);

    res.status(200).json({
      success: true,
      data: prison
    });
  } catch (error) {
    const statusCode = error.message === 'Prison not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch prison'
    });
  }
};

/**
 * @desc    Create new prison
 * @route   POST /api/prisons
 * @access  Private (Super Admin only)
 */
const createPrison = async (req, res) => {
  try {
    const prison = await prisonService.createPrison(
      req.body,
      req.user.roleName
    );

    res.status(201).json({
      success: true,
      message: 'Prison created successfully',
      data: prison
    });
  } catch (error) {
    const statusCode = error.message.includes('already exists') ? 409 : 
                       error.message.includes('Only Super Admin') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create prison'
    });
  }
};

/**
 * @desc    Update prison
 * @route   PUT /api/prisons/:id
 * @access  Private (Super Admin only)
 */
const updatePrison = async (req, res) => {
  try {
    const { id } = req.params;
    const prison = await prisonService.updatePrison(
      id,
      req.body,
      req.user.roleName
    );

    res.status(200).json({
      success: true,
      message: 'Prison updated successfully',
      data: prison
    });
  } catch (error) {
    const statusCode = error.message === 'Prison not found' ? 404 : 
                       error.message.includes('already exists') ? 409 :
                       error.message.includes('Only Super Admin') ? 403 :
                       error.message.includes('Cannot reduce capacity') ? 400 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update prison'
    });
  }
};

/**
 * @desc    Delete prison (deactivate)
 * @route   DELETE /api/prisons/:id
 * @access  Private (Super Admin only)
 */
const deletePrison = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await prisonService.deletePrison(
      id,
      req.user.roleName
    );

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    const statusCode = error.message === 'Prison not found' ? 404 :
                       error.message.includes('Only Super Admin') ? 403 :
                       error.message.includes('Cannot delete') ? 400 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to delete prison'
    });
  }
};

/**
 * @desc    Get prison statistics
 * @route   GET /api/prisons/:id/statistics
 * @access  Private
 */
const getPrisonStatistics = async (req, res) => {
  try {
    const { id } = req.params;
    const statistics = await prisonService.getPrisonStatistics(id);

    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    const statusCode = error.message === 'Prison not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch prison statistics'
    });
  }
};

module.exports = {
  getAllPrisons,
  getPrisonById,
  createPrison,
  updatePrison,
  deletePrison,
  getPrisonStatistics
};