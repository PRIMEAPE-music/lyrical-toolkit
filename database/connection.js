const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DATABASE_URL || './data/users.db';
const schemaPath = path.join(__dirname, 'schema.sql');

// Ensure data directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Initialize schema if tables don't exist
const initializeDatabase = () => {
    try {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema);
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
};

// Check if users table exists, if not initialize
const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
if (!tableExists) {
    initializeDatabase();
}

module.exports = db;