import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Use SUPABASE_DB_URL from environment variables
const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error('CRITICAL ERROR: SUPABASE_DB_URL environment variable is not set.');
  console.error('Please set it in the AI Studio Settings menu or in your .env file.');
}

const sql = postgres(connectionString || 'postgres://dummy:dummy@localhost:5432/dummy', {
  ssl: 'require',
  max: 10,
});

async function initDb() {
  if (!connectionString) {
    console.warn('SUPABASE_DB_URL is not set. Database initialization skipped.');
    return;
  }

  try {
    // Initialize tables
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT CHECK(role IN ('admin', 'client')) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        cpf TEXT UNIQUE NOT NULL,
        phone TEXT,
        address TEXT,
        status TEXT CHECK(status IN ('active', 'delinquent', 'blocked')) DEFAULT 'active',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS contracts (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        description TEXT,
        total_value REAL NOT NULL,
        down_payment REAL DEFAULT 0,
        installments_count INTEGER NOT NULL,
        installment_value REAL NOT NULL,
        first_installment_date DATE NOT NULL,
        due_day INTEGER NOT NULL,
        pix_key TEXT NOT NULL,
        status TEXT CHECK(status IN ('active', 'paid', 'cancelled')) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS installments (
        id TEXT PRIMARY KEY,
        contract_id TEXT NOT NULL,
        number INTEGER NOT NULL,
        value REAL NOT NULL,
        due_date DATE NOT NULL,
        status TEXT CHECK(status IN ('pending', 'paid', 'overdue')) DEFAULT 'pending',
        payment_date TIMESTAMP,
        paid_value REAL,
        proof_url TEXT,
        notes TEXT,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `;

    const admins = await sql`SELECT * FROM users WHERE role = 'admin' LIMIT 1`;
    if (admins.length === 0) {
      const id = uuidv4();
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      await sql`
        INSERT INTO users (id, name, email, password, role) 
        VALUES (${id}, 'Administrator', 'admin@example.com', ${hashedPassword}, 'admin')
      `;
      console.log('Default admin user created.');
    }
    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

initDb();

export default sql;
