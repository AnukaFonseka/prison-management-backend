require('dotenv').config();
const app = require('./src/app');
const { testConnection } = require('./src/config/database');
const db = require('./src/models');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Sync database (create tables if they don't exist)
    // Use { force: true } to drop and recreate tables (WARNING: deletes data)
    // Use { alter: true } to update existing tables without deleting data
    await db.sync({ alter: false });
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();