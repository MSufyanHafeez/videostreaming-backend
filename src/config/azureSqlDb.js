const sql = require('mssql');

const config = {
  server: process.env.AZURE_SQL_SERVER || 'vibestream-sql-fc.database.windows.net',
  database: process.env.AZURE_SQL_DATABASE || 'vibestream-db',
  user: process.env.AZURE_SQL_USER || 'vibeadmin',
  password: process.env.AZURE_SQL_PASSWORD || 'VibeStreamPass2026!',
  options: {
    encrypt: true, // Required for Azure SQL Database
    trustServerCertificate: false,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool = null;

const connectAzureSql = async () => {
  try {
    pool = await sql.connect(config);
    console.log(`[Azure SQL Connected]: Host: ${config.server}, Database: ${config.database}`);
    
    // Auto-create relational tables if they do not exist
    await initializeTables();
    return pool;
  } catch (error) {
    console.warn(`[Azure SQL Connection Warning]: ${error.message}`);
    console.warn('[Azure SQL]: Make sure firewall rules allow connection.');
    return null;
  }
};

const initializeTables = async () => {
  if (!pool) return;
  try {
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
      BEGIN
        CREATE TABLE Users (
          id NVARCHAR(100) PRIMARY KEY,
          username NVARCHAR(50) NOT NULL UNIQUE,
          email NVARCHAR(100) NOT NULL UNIQUE,
          password NVARCHAR(255) NOT NULL,
          name NVARCHAR(100) DEFAULT '',
          avatar NVARCHAR(500) DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          bio NVARCHAR(255) DEFAULT 'Digital creator | VibeStream member',
          role NVARCHAR(20) DEFAULT 'user',
          createdAt DATETIME2 DEFAULT GETDATE(),
          updatedAt DATETIME2 DEFAULT GETDATE()
        );
      END

      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Posts')
      BEGIN
        CREATE TABLE Posts (
          id NVARCHAR(100) PRIMARY KEY,
          authorId NVARCHAR(100) NOT NULL,
          caption NVARCHAR(2200) DEFAULT '',
          mediaUrl NVARCHAR(1000) NOT NULL,
          mediaType NVARCHAR(20) DEFAULT 'image',
          aspectRatio NVARCHAR(20) DEFAULT '1:1',
          likesCount INT DEFAULT 0,
          commentsCount INT DEFAULT 0,
          tags NVARCHAR(500) DEFAULT '',
          createdAt DATETIME2 DEFAULT GETDATE(),
          updatedAt DATETIME2 DEFAULT GETDATE()
        );
      END

      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Comments')
      BEGIN
        CREATE TABLE Comments (
          id NVARCHAR(100) PRIMARY KEY,
          postId NVARCHAR(100) NOT NULL,
          authorId NVARCHAR(100) NOT NULL,
          content NVARCHAR(1000) NOT NULL,
          createdAt DATETIME2 DEFAULT GETDATE()
        );
      END
    `);
    console.log('[Azure SQL]: Database Schema & Tables initialized successfully.');
  } catch (err) {
    console.error('[Azure SQL Schema Error]:', err.message);
  }
};

const getPool = () => pool;

module.exports = {
  sql,
  connectAzureSql,
  getPool,
};
