import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Seed admin if not exists
router.post('/seed-admin', async (req, res) => {
  const adminExists = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
  if (adminExists) return res.status(400).json({ error: 'Admin already exists' });

  const id = uuidv4();
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  
  db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)')
    .run(id, 'Administrator', 'admin@example.com', hashedPassword, 'admin');

  res.json({ message: 'Admin created', credentials: { email: 'admin@example.com', password: 'admin123' } });
});

export default router;
