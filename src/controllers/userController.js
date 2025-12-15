const userService = require('../services/userService');

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Private
 */
const getAllUsers = async (req, res) => {
  try {
    const { prison_id, role_id, is_active, search, page = 1, limit = 10 } = req.query;

    // Build filters
    const filters = {};
    
    // If not Super Admin, filter by user's prison
    if (req.user.roleName !== 'Super Admin' && req.user.prisonId) {
      filters.prisonId = req.user.prisonId;
    } else if (prison_id) {
      filters.prisonId = prison_id;
    }
    
    if (role_id) filters.roleId = role_id;
    if (is_active !== undefined) filters.isActive = is_active === 'true';
    if (search) filters.search = search;

    const result = await userService.getAllUsers(filters, page, limit);

    res.status(200).json({
      success: true,
      data: result.users,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch users'
    });
  }
};

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Private
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    const statusCode = error.message === 'User not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch user'
    });
  }
};

/**
 * @desc    Create new user
 * @route   POST /api/users
 * @access  Private (Admin only)
 */
const createUser = async (req, res) => {
  try {
    const user = await userService.createUser(
      req.body,
      req.user.roleName,
      req.user.prisonId
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  } catch (error) {
    const statusCode = error.message.includes('already exists') ? 409 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create user'
    });
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Private (Admin only)
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.updateUser(
      id,
      req.body,
      req.user.roleName,
      req.user.prisonId
    );

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    const statusCode = error.message === 'User not found' ? 404 : 
                       error.message.includes('already exists') ? 409 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update user'
    });
  }
};

/**
 * @desc    Delete user (deactivate)
 * @route   DELETE /api/users/:id
 * @access  Private (Admin only)
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await userService.deleteUser(
      id,
      req.user.roleName,
      req.user.prisonId
    );

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    const statusCode = error.message === 'User not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to delete user'
    });
  }
};

/**
 * @desc    Reset user password
 * @route   POST /api/users/:id/reset-password
 * @access  Private (Admin only)
 */
const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password is required'
      });
    }

    const result = await userService.resetUserPassword(
      id,
      newPassword,
      req.user.roleName,
      req.user.prisonId
    );

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    const statusCode = error.message === 'User not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to reset password'
    });
  }
};

// Roles Dropdown
const getAllRolesDropdown = async (req, res) => {
  try {
    const roles = await userService.getAllRolesDropdown();
    res.status(200).json({
      success: true,
      data: roles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch roles'
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  getAllRolesDropdown
};