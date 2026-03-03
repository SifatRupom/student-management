const createTables = async () => {
  // আগের টেবিল মুছে নতুন করে তৈরি করার কমান্ড
  const query = `
    DROP TABLE IF EXISTS students; 

    CREATE TABLE students (
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
    console.log('Database Reset & Tables Re-created Successfully!');
  } catch (err) {
    console.error('Error resetting tables:', err);
  }
};