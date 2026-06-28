const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Determine whether to use MySQL or SQLite
const isMySQL = (process.env.DB_TYPE === 'mysql') || 
                (!!process.env.MYSQL_ADDON_HOST) || 
                (!!process.env.DB_HOST && process.env.DB_TYPE === 'mysql');

let db = null;
let pool = null;

if (isMySQL) {
    const mysql = require('mysql2');
    const host = process.env.MYSQL_ADDON_HOST || process.env.DB_HOST || 'localhost';
    const port = process.env.MYSQL_ADDON_PORT || process.env.DB_PORT || 3306;
    const user = process.env.MYSQL_ADDON_USER || process.env.DB_USER || 'root';
    const password = process.env.MYSQL_ADDON_PASSWORD || process.env.DB_PASSWORD || '';
    const database = process.env.MYSQL_ADDON_DB || process.env.DB_NAME || 'minisoccer';

    console.log(`[Database] Connecting to MySQL database on ${host}:${port}...`);
    pool = mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
} else {
    console.log('[Database] Using local SQLite database (minisoccer.db)...');
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.join(__dirname, 'minisoccer.db');
    db = new sqlite3.Database(dbPath);
}

// Helper functions that return Promises for async/await
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        if (isMySQL) {
            pool.query(sql, params, (err, results) => {
                if (err) return reject(err);
                resolve({
                    lastID: results.insertId,
                    changes: results.affectedRows
                });
            });
        } else {
            db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        }
    });
};

const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        if (isMySQL) {
            pool.query(sql, params, (err, results) => {
                if (err) return reject(err);
                resolve(results[0] || null);
            });
        } else {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        }
    });
};

const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        if (isMySQL) {
            pool.query(sql, params, (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        } else {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        }
    });
};

// Database Initialization
async function initDatabase() {
    try {
        console.log('Initializing database...');
        
        // Select schema based on database type
        const schemaFile = isMySQL ? 'schema_mysql.sql' : 'schema.sql';
        const schemaPath = path.join(__dirname, schemaFile);
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Split queries by semicolon, strip comments, and execute them one by one
        const queries = schema
            .split(';')
            .map(q => {
                // Remove SQL single-line comments (starting with --)
                return q.split('\n')
                    .map(line => line.trim().startsWith('--') ? '' : line)
                    .join('\n')
                    .trim();
            })
            .filter(q => q.length > 0);
            
        for (const query of queries) {
            await dbRun(query);
        }
        console.log(`Database tables verified/created successfully using ${schemaFile}.`);

        // Seed default Admin user if it doesn't exist
        const adminUser = await dbGet('SELECT * FROM users WHERE username = ?', ['admin']);
        if (!adminUser) {
            const adminPassword = 'admin123';
            const passwordHash = await bcrypt.hash(adminPassword, 10);
            await dbRun(
                `INSERT INTO users (username, password_hash, full_name, user_type, identity_number, phone)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                ['admin', passwordHash, 'Administrator Polinela', 'admin', '19700101000000', '081234567890']
            );
            console.log('Default admin seeded successfully. (username: admin, password: admin123)');
        }

        // Seed default fields if the fields table is empty
        const fieldCount = await dbGet('SELECT COUNT(*) as count FROM fields');
        if (fieldCount.count === 0) {
            await dbRun(
                `INSERT INTO fields (name, type, price_per_hour, description, status) VALUES (?, ?, ?, ?, ?)`,
                [
                    'Lapangan A (Rumput Sintetis)', 
                    'Rumput Sintetis', 
                    150000, 
                    'Lapangan minisoccer dengan rumput sintetis premium standar FIFA. Dilengkapi lampu sorot untuk bermain malam hari.',
                    'active'
                ]
            );
            await dbRun(
                `INSERT INTO fields (name, type, price_per_hour, description, status) VALUES (?, ?, ?, ?, ?)`,
                [
                    'Lapangan B (Rumput Alami)', 
                    'Rumput Alami', 
                    120000, 
                    'Lapangan minisoccer dengan rumput alami (Zoysia Matrella) berkualitas tinggi yang terawat rapi, empuk, dan nyaman.',
                    'active'
                ]
            );
            console.log('Default fields seeded successfully.');
        }

    } catch (error) {
        console.error('Error during database initialization:', error);
    }
}

module.exports = {
    db,
    dbRun,
    dbGet,
    dbAll,
    initDatabase
};
