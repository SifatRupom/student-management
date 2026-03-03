const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('./database');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// === AUTH API ===

// Register
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    console.log(`[AUTH] Registration attempt for: ${username}`);
    if (!username || !password) return res.status(400).json({ error: 'Username and Password are required.' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (username, password_hash) VALUES (?, ?)`, [username, hashedPassword], function (err) {
            if (err) {
                console.error(`[AUTH] Registration error for ${username}:`, err.message);
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Username already exists.' });
                }
                return res.status(500).json({ error: err.message });
            }
            console.log(`[AUTH] Registration successful for: ${username}`);
            res.json({ success: true, message: 'User registered successfully!' });
        });
    } catch (err) {
        console.error(`[AUTH] Bcrypt/DB error:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    console.log(`[AUTH] Login attempt for: ${username}`);
    if (!username || !password) return res.status(400).json({ error: 'Username and Password are required.' });

    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) {
            console.log(`[AUTH] Login failed: User ${username} not found`);
            return res.status(400).json({ error: 'Invalid username or password.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            console.log(`[AUTH] Login failed: Password mismatch for ${username}`);
            return res.status(400).json({ error: 'Invalid username or password.' });
        }

        console.log(`[AUTH] Login successful for: ${username}`);
        res.json({
            success: true,
            message: 'Login successful!',
            user: {
                id: user.id,
                username: user.username,
                profilePic: user.profile_pic
            }
        });
    });
});

// Update profile picture
app.put('/api/user/profile-pic', (req, res) => {
    const { username, profilePic } = req.body;
    if (!username || !profilePic) return res.status(400).json({ error: 'Username and profilePic are required.' });

    db.run(`UPDATE users SET profile_pic = ? WHERE username = ?`, [profilePic, username], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true, message: 'Profile picture updated successfully!' });
    });
});

// === STUDENTS API ===

// Get all students (filter by status)
app.get('/api/students', (req, res) => {
    const status = req.query.status || 'active';
    pool.query('SELECT * FROM students WHERE batch = $1 ORDER BY created_at DESC', [status], (err, result) => {
    if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database Error' });
    }
    // ডেটা এখন result.rows এর ভেতর থাকে
    res.json({ students: result.rows });
    });
});

// Get a single student + their payments by ID
app.get('/api/students/:id', (req, res) => {
    const id = req.params.id;
    db.get(`SELECT * FROM students WHERE id = ?`, [id], (err, student) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!student) return res.status(404).json({ error: 'Student not found.' });

        db.all(`SELECT * FROM payments WHERE student_id = ? ORDER BY date DESC`, [id], (err, payments) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ student, payments });
        });
    });
});

// Add a new student
app.post('/api/students', (req, res) => {
    const { id, name, guardian_name, phone, address, batch, profile_pic } = req.body;
    if (!id || !name) return res.status(400).json({ error: 'ID and Name are required.' });

    const stmt = db.prepare(`INSERT INTO students (id, name, guardian_name, phone, address, batch, status, profile_pic) VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`);
    stmt.run([id, name, guardian_name, phone, address, batch, profile_pic || null], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Student added successfully!', student_id: id });
    });
});

// Update student details (Universal Update)
app.put('/api/students/:id', (req, res) => {
    const id = req.params.id;
    const { name, guardian_name, phone, address, batch, profile_pic } = req.body;

    db.run(`
        UPDATE students 
        SET name = COALESCE(?, name),
            guardian_name = COALESCE(?, guardian_name),
            phone = COALESCE(?, phone),
            address = COALESCE(?, address),
            batch = COALESCE(?, batch),
            profile_pic = COALESCE(?, profile_pic)
        WHERE id = ?
    `, [name, guardian_name, phone, address, batch, profile_pic, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Student not found.' });
        res.json({ success: true, message: 'Student details updated.' });
    });
});

// Update student status (e.g., mark as 'old' or delete via status)
app.put('/api/students/:id/status', (req, res) => {
    const id = req.params.id;
    const { status } = req.body; // 'active', 'old'
    db.run(`UPDATE students SET status = ? WHERE id = ?`, [status, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Status updated.' });
    });
});

// Hard Delete a student and their payments
app.delete('/api/students/:id', (req, res) => {
    const id = req.params.id;
    // Due to FOREIGN KEY CASCADE, deleting the student deletes their payments
    // NOTE: SQLite PRAGMA foreign_keys = ON; needs to be enabled typically for CASCADE,
    // but we can manually delete payments first or enable the PRAGMA.
    db.run(`PRAGMA foreign_keys = ON`);
    db.run(`DELETE FROM students WHERE id = ?`, [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Student not found.' });
        res.json({ success: true, message: 'Student deleted permanently.' });
    });
});

// === ATTENDANCE API ===

// Save attendance (handles multiple students)
app.post('/api/attendance', (req, res) => {
    const { date, records } = req.body; // records: [{student_id, status, note}]
    if (!date || !records) return res.status(400).json({ error: 'Date and records are required.' });

    const stmt = db.prepare(`INSERT OR REPLACE INTO attendance (student_id, date, status, note) VALUES (?, ?, ?, ?)`);

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        records.forEach(rec => {
            stmt.run([rec.student_id, date, rec.status, rec.note || '']);
        });
        db.run("COMMIT", (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: 'Attendance saved successfully!' });
        });
    });
    stmt.finalize();
});

// Get attendance for a specific date
app.get('/api/attendance', (req, res) => {
    const date = req.query.date;
    if (!date) return res.status(400).json({ error: 'Date query param is required.' });

    db.all(`SELECT * FROM attendance WHERE date = ?`, [date], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ attendance: rows });
    });
});

// Search attendance history
app.get('/api/attendance/search', (req, res) => {
    const { student_id, start_date, end_date } = req.query;
    let query = `
        SELECT a.*, s.name as student_name 
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        WHERE 1=1
    `;
    const params = [];

    if (student_id) {
        query += ` AND a.student_id = ?`;
        params.push(student_id);
    }
    if (start_date) {
        query += ` AND a.date >= ?`;
        params.push(start_date);
    }
    if (end_date) {
        query += ` AND a.date <= ?`;
        params.push(end_date);
    }

    query += ` ORDER BY a.date DESC, s.name ASC`;

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ history: rows });
    });
});

// === PAYMENTS API ===

// Add payment
app.post('/api/payments', (req, res) => {
    const { student_id, amount, date, month, year, note } = req.body;

    // Auto-detect current year if not provided
    const payYear = year || new Date().getFullYear().toString();

    db.run(`INSERT INTO payments (student_id, amount, date, month, year, note) VALUES (?, ?, ?, ?, ?, ?)`,
        [student_id, amount, date, month, payYear, note], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: 'Payment recorded successfully!', payment_id: this.lastID });
        });
});

// Get Due Payments (Students who haven't paid for given month/year)
app.get('/api/payments/due', (req, res) => {
    const month = req.query.month;
    const year = req.query.year;

    if (!month || !year) return res.status(400).json({ error: 'Month and year are required.' });

    const query = `
        SELECT s.*, ds.status as manual_status 
        FROM students s
        LEFT JOIN due_status ds ON s.id = ds.student_id AND ds.month = ? AND ds.year = ?
        WHERE s.status = 'active'
        AND s.id NOT IN (
            SELECT student_id FROM payments 
            WHERE month = ? AND year = ?
        )
        ORDER BY s.name ASC
    `;

    db.all(query, [month, year, month, year], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ due_students: rows });
    });
});

// Update Due Status (Manual override)
app.post('/api/payments/due/status', (req, res) => {
    const { student_id, month, year, status } = req.body;
    if (!student_id || !month || !year || !status) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    db.run(`INSERT OR REPLACE INTO due_status (student_id, month, year, status) VALUES (?, ?, ?, ?)`,
        [student_id, month, year, status], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: 'Status updated.' });
        });
});

// Dashboard Stats
app.get('/api/stats', (req, res) => {
    const today = new Date().toISOString().split('T')[0];

    const queries = {
        activeStudents: "SELECT COUNT(*) as count FROM students WHERE status = 'active'",
        alumniStudents: "SELECT COUNT(*) as count FROM students WHERE status = 'old'",
        totalPayments: "SELECT COUNT(*) as count FROM payments"
    };

    const stats = {};

    db.get(queries.activeStudents, [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.totalActive = row.count;

        db.get(queries.alumniStudents, [], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            stats.totalAlumni = row.count;

            db.get(queries.totalPayments, [], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                stats.totalPayments = row.count;
                res.json(stats);
            });
        });
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
