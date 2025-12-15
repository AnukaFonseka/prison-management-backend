const workRecordService = require('../services/workRecordService');

/**
 * @desc    Get all work records with filtering and pagination
 * @route   GET /api/work-records
 * @access  Private
 */
const getAllWorkRecords = async (req, res) => {
  try {
    const { 
      prison_id, 
      prisoner_id,
      payment_status, 
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
    if (payment_status) filters.paymentStatus = payment_status;
    if (start_date) filters.startDate = start_date;
    if (end_date) filters.endDate = end_date;
    if (search) filters.search = search;

    const result = await workRecordService.getAllWorkRecords(filters, page, limit);

    res.status(200).json({
      success: true,
      data: result.workRecords,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch work records'
    });
  }
};

/**
 * @desc    Get work records for a specific prisoner
 * @route   GET /api/work-records/prisoner/:prisonerId
 * @access  Private
 */
const getWorkRecordsByPrisoner = async (req, res) => {
  try {
    const { prisonerId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const result = await workRecordService.getWorkRecordsByPrisoner(
      prisonerId,
      req.user.prisonId,
      req.user.roleName,
      page,
      limit
    );

    res.status(200).json({
      success: true,
      data: result.workRecords,
      summary: result.summary,
      pagination: result.pagination
    });
  } catch (error) {
    const statusCode = error.message === 'Prisoner not found' ? 404 :
                       error.message.includes('access') ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch work records'
    });
  }
};

/**
 * @desc    Get work record by ID
 * @route   GET /api/work-records/:id
 * @access  Private
 */
const getWorkRecordById = async (req, res) => {
  try {
    const { id } = req.params;
    const workRecord = await workRecordService.getWorkRecordById(
      id,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(200).json({
      success: true,
      data: workRecord
    });
  } catch (error) {
    const statusCode = error.message === 'Work record not found' ? 404 :
                       error.message.includes('access') ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch work record'
    });
  }
};

/**
 * @desc    Create new work record
 * @route   POST /api/work-records
 * @access  Private (Records Keeper or higher)
 */
const createWorkRecord = async (req, res) => {
  try {
    const workRecord = await workRecordService.createWorkRecord(
      req.body,
      req.user.userId,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(201).json({
      success: true,
      message: 'Work record created successfully',
      data: workRecord
    });
  } catch (error) {
    const statusCode = error.message === 'Prisoner not found' ? 404 :
                       error.message.includes('access') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create work record'
    });
  }
};

/**
 * @desc    Update work record
 * @route   PUT /api/work-records/:id
 * @access  Private (Records Keeper or higher)
 */
const updateWorkRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const workRecord = await workRecordService.updateWorkRecord(
      id,
      req.body,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(200).json({
      success: true,
      message: 'Work record updated successfully',
      data: workRecord
    });
  } catch (error) {
    const statusCode = error.message === 'Work record not found' ? 404 :
                       error.message.includes('access') ? 403 :
                       error.message.includes('paid') ? 400 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update work record'
    });
  }
};

/**
 * @desc    Delete work record
 * @route   DELETE /api/work-records/:id
 * @access  Private (Prison Admin or Super Admin only)
 */
const deleteWorkRecord = async (req, res) => {
  try {
    const { id } = req.params;
    
    await workRecordService.deleteWorkRecord(
      id,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(200).json({
      success: true,
      message: 'Work record deleted successfully'
    });
  } catch (error) {
    const statusCode = error.message === 'Work record not found' ? 404 :
                       error.message.includes('access') ? 403 :
                       error.message.includes('paid') ? 400 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to delete work record'
    });
  }
};

/**
 * @desc    Approve payment for work record
 * @route   POST /api/work-records/:id/approve-payment
 * @access  Private (Prison Admin or Super Admin only)
 */
const approvePayment = async (req, res) => {
  try {
    const { id } = req.params;
    // const { payment_date } = req.body;
    const payment_date = new Date().toISOString();
    
    const workRecord = await workRecordService.approvePayment(
      id,
      payment_date,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(200).json({
      success: true,
      message: 'Payment approved successfully',
      data: workRecord
    });
  } catch (error) {
    const statusCode = error.message === 'Work record not found' ? 404 :
                       error.message.includes('access') ? 403 :
                       error.message.includes('already paid') ? 400 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to approve payment'
    });
  }
};

/**
 * @desc    Approve multiple payments at once
 * @route   POST /api/work-records/bulk-approve
 * @access  Private (Prison Admin or Super Admin only)
 */
const bulkApprovePayments = async (req, res) => {
  try {
    const { work_record_ids, payment_date } = req.body;
    
    if (!Array.isArray(work_record_ids) || work_record_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'work_record_ids must be a non-empty array'
      });
    }

    const result = await workRecordService.bulkApprovePayments(
      work_record_ids,
      payment_date,
      req.user.prisonId,
      req.user.roleName
    );

    res.status(200).json({
      success: true,
      message: `Successfully approved ${result.approved} of ${result.total} payments`,
      data: result
    });
  } catch (error) {
    const statusCode = error.message.includes('access') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to approve payments'
    });
  }
};

/**
 * @desc    Get all pending payments
 * @route   GET /api/work-records/pending-payments
 * @access  Private
 */
const getPendingPayments = async (req, res) => {
  try {
    const { prison_id, page = 1, limit = 10 } = req.query;
    
    // Determine which prison to get pending payments for
    let targetPrisonId = null;
    if (req.user.roleName === 'Super Admin') {
      targetPrisonId = prison_id || null; // null means all prisons
    } else {
      targetPrisonId = req.user.prisonId;
    }

    const result = await workRecordService.getPendingPayments(
      targetPrisonId,
      page,
      limit
    );

    res.status(200).json({
      success: true,
      data: result.workRecords,
      summary: result.summary,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch pending payments'
    });
  }
};

/**
 * @desc    Get work record statistics
 * @route   GET /api/work-records/statistics
 * @access  Private
 */
const getWorkRecordStatistics = async (req, res) => {
  try {
    const { prison_id, start_date, end_date } = req.query;
    
    // Determine which prison to get stats for
    let targetPrisonId = null;
    if (req.user.roleName === 'Super Admin') {
      targetPrisonId = prison_id || null; // null means all prisons
    } else {
      targetPrisonId = req.user.prisonId;
    }

    const statistics = await workRecordService.getWorkRecordStatistics(
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
      message: error.message || 'Failed to fetch work record statistics'
    });
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