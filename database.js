const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://student_db_ye9q_user:cC4dKnxghIMliQd9FLWP3D7bKHjl7wR2@dpg-d6jg14vgi27c73d4dci0-a.oregon-postgres.render.com/student_db_ye9q', 
  ssl: {
    rejectUnauthorized: false
  }
});

const createTables = async () => {
  // আপনার ফর্মের সব তথ্যের জন্য টেবিল আপডেট করা হয়েছে
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      profile_pic TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      student_id TEXT UNIQUE,
      name TEXT NOT NULL,
      guardian_name TEXT,
      phone TEXT,
      batch TEXT,
      address TEXT,
      email TEXT,
      photo_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log('PostgreSQL Tables Updated with all fields!');
  } catch (err) {
    console.error('Error updating tables:', err);
  }
};

pool.connect((err, client, release) => {
  if (err) {
    return console.error('Connection Error:', err.stack);
  }
  createTables();
  release();
  console.log('Connected to PostgreSQL successfully!');
});

module.exports = pool;