import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'database.sqlite'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'client')) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    phone TEXT,
    address TEXT,
    status TEXT CHECK(status IN ('active', 'delinquent', 'blocked')) DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS installments (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL,
    number INTEGER NOT NULL,
    value REAL NOT NULL,
    due_date DATE NOT NULL,
    status TEXT CHECK(status IN ('pending', 'paid', 'overdue')) DEFAULT 'pending',
    payment_date DATETIME,
    paid_value REAL,
    proof_url TEXT,
    notes TEXT,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );
`);

const adminExists = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
if (!adminExists) {
  const id = uuidv4();
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)')
    .run(id, 'Administrator', 'admin@example.com', hashedPassword, 'admin');
}

export default db;
