const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'students.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        createTables();
    }
});

function createTables() {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            profile_pic TEXT, 
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (!err) {
            // Try to add the column if it doesn't exist (for existing DBs)
            db.run(`ALTER TABLE users ADD COLUMN profile_pic TEXT`, (alterErr) => {
                // Ignore error if column already exists
            });
        }
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS students (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            guardian_name TEXT,
            phone TEXT,
            address TEXT,
            batch TEXT,
            status TEXT DEFAULT 'active',
            profile_pic TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (!err) {
            db.run(`ALTER TABLE students ADD COLUMN profile_pic TEXT`, (alterErr) => {
                // Ignore error if column already exists
            });
        }
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            month TEXT NOT NULL,
            year TEXT NOT NULL,
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT NOT NULL,
            date TEXT NOT NULL,
            status TEXT NOT NULL, -- 'present', 'absent'
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
            UNIQUE(student_id, date)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS due_status (
            student_id TEXT NOT NULL,
            month TEXT NOT NULL,
            year TEXT NOT NULL,
            status TEXT NOT NULL, -- 'clear', 'due'
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY(student_id, month, year),
            FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
        )
    `);
}

module.exports = db;
