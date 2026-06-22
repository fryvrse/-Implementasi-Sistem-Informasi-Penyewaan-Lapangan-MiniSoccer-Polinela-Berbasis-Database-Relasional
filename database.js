const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'minisoccer.db');
const db = new sqlite3.Database(dbPath);

// Helper functions that return Promises for async/await
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Database Initialization
async function initDatabase() {
    try {
        console.log('Initializing database...');
        
        // Read and execute schema.sql
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // SQLite doesn't natively support running multiple queries separated by semicolons in db.run
        // So we split by semicolon and run them one by one
        const queries = schema
            .split(';')
            .map(q => q.trim())
            .filter(q => q.length > 0);
            
        for (const query of queries) {
            await dbRun(query);
        }
        console.log('Database tables verified/created successfully.');

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
