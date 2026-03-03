const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://student_db_ye9q_user:cC4dKnxghIMliQd9FLWP3D7bKHjl7wR2@dpg-d6jg14vgi27c73d4dci0-a.oregon-postgres.render.com/student_db_ye9q', 
  ssl: {
    rejectUnauthorized: false
  }
});

const createTables = async () => {
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
      name TEXT NOT NULL,
      batch TEXT,
      phone TEXT,
      email TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log('PostgreSQL Tables Ready!');
  } catch (err) {
    console.error('Error creating tables:', err);
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