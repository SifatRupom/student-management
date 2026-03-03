const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('./database'); // এখানে 'pool' ব্যবহার করা হয়েছে
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
    if (!username || !password) return res.status(400).json({ error: 'Username and Password are required.' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // db.run এর বদলে pool.query ব্যবহার করা হয়েছে
        await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [username, hashedPassword]);
        res.json({ success: true, message: 'User registered successfully!' });
    } catch (err) {
        console.error(err);
        if (err.code === '23505') return res.status(400).json({ error: 'Username already exists.' });
        res.status(500).json({ error: err.message });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and Password are required.' });

    try {
        // SQLite এর db.get এর বদলে pool.query ব্যবহার করা হয়েছে
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) return res.status(400).json({ error: 'Invalid username or password.' });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ error: 'Invalid username or password.' });

        res.json({
            success: true,
            message: 'Login successful!',
            user: { id: user.id, username: user.username, profilePic: user.profile_pic }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === STUDENTS API ===

// Get all students
app.get('/api/students', (req, res) => {
    const status = req.query.status || 'active';
    // batch = $1 দিয়ে ফিল্টার করা হচ্ছে
    pool.query('SELECT * FROM students WHERE batch = $1 ORDER BY created_at DESC', [status], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database Error' });
        res.json({ students: result.rows });
    });
});

// Add a new student
app.post('/api/students', async (req, res) => {
    const { id, name, guardian_name, phone, address, batch, profile_pic } = req.body;
    if (!id || !name) return res.status(400).json({ error: 'ID and Name are required.' });

    try {
        const query = 'INSERT INTO students (student_id, name, guardian_name, phone, address, batch, profile_pic) VALUES ($1, $2, $3, $4, $5, $6, $7)';
        await pool.query(query, [id, name, guardian_name, phone, address, batch, profile_pic || null]);
        res.json({ success: true, message: 'Student added successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Dashboard Stats
app.get('/api/stats', async (req, res) => {
    try {
        const activeRes = await pool.query("SELECT COUNT(*) FROM students WHERE batch = 'active'");
        const alumniRes = await pool.query("SELECT COUNT(*) FROM students WHERE batch = 'old'");
        const paymentRes = await pool.query("SELECT COUNT(*) FROM payments");

        res.json({
            totalActive: activeRes.rows[0].count,
            totalAlumni: alumniRes.rows[0].count,
            totalPayments: paymentRes.rows[0].count
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});