import { Router } from 'express';
import { authenticate, authorize, AuthRequest } from '../middlewares/auth.middleware';
import db from '../database';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { addMonths, format, parseISO } from 'date-fns';

const router = Router();

// Admin: Register Client
router.post('/', authenticate, authorize(['admin']), (req: AuthRequest, res) => {
  const { name, email, password, cpf, phone, address } = req.body;

  try {
    const userId = uuidv4();
    const clientId = uuidv4();
    const hashedPassword = bcrypt.hashSync(password || 'cliente123', 10);

    const transaction = db.transaction(() => {
      db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)')
        .run(userId, name, email, hashedPassword, 'client');
      
      db.prepare('INSERT INTO clients (id, user_id, cpf, phone, address) VALUES (?, ?, ?, ?, ?)')
        .run(clientId, userId, cpf, phone, address);
    });

    transaction();
    res.status(201).json({ id: clientId, message: 'Client registered successfully' });
  } catch (error: any) {
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Email or CPF already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update Client and Contract
router.put('/:id', authenticate, authorize(['admin']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const { 
    name, email, password, cpf, phone, address,
    totalValue, installmentsCount, installmentValue, firstInstallmentDate, pixKey
  } = req.body;

  try {
    const client = db.prepare('SELECT user_id FROM clients WHERE id = ?').get(id) as any;
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const transaction = db.transaction(() => {
      // Update User
      if (password) {
        const hashedPassword = bcrypt.hashSync(password, 10);
        db.prepare('UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?')
          .run(name, email, hashedPassword, client.user_id);
      } else {
        db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?')
          .run(name, email, client.user_id);
      }

      // Update Client
      db.prepare('UPDATE clients SET cpf = ?, phone = ?, address = ? WHERE id = ?')
        .run(cpf, phone, address, id);

      // Handle Contract if provided
      if (totalValue && installmentsCount && installmentValue && firstInstallmentDate) {
        const existingContract = db.prepare('SELECT id FROM contracts WHERE client_id = ? LIMIT 1').get(id) as any;
        
        if (existingContract) {
          // Update existing contract
          db.prepare(`
            UPDATE contracts SET 
              total_value = ?, installments_count = ?, installment_value = ?, first_installment_date = ?, pix_key = ?
            WHERE id = ?
          `).run(totalValue, installmentsCount, installmentValue, firstInstallmentDate, pixKey || '62991374935', existingContract.id);

          // Delete existing pending installments
          db.prepare("DELETE FROM installments WHERE contract_id = ? AND status = 'pending'").run(existingContract.id);

          // Calculate remaining installments
          const paidInstallments = db.prepare("SELECT COUNT(*) as count FROM installments WHERE contract_id = ? AND status = 'paid'").get(existingContract.id) as any;
          const paidCount = paidInstallments.count;

          const remainingCount = installmentsCount - paidCount;
          if (remainingCount > 0) {
            const startDate = parseISO(firstInstallmentDate);
            for (let i = 1; i <= remainingCount; i++) {
              const installmentNumber = paidCount + i;
              const dueDate = addMonths(startDate, installmentNumber - 1);
              db.prepare(`
                INSERT INTO installments (id, contract_id, number, value, due_date)
                VALUES (?, ?, ?, ?, ?)
              `).run(uuidv4(), existingContract.id, installmentNumber, installmentValue, format(dueDate, 'yyyy-MM-dd'));
            }
          }
        } else {
          // Create new contract
          const contractId = uuidv4();
          db.prepare(`
            INSERT INTO contracts (
              id, client_id, description, total_value, down_payment, 
              installments_count, installment_value, first_installment_date, 
              due_day, pix_key
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            contractId, id, 'Contrato Padrão', totalValue, 0, 
            installmentsCount, installmentValue, firstInstallmentDate, 
            15, pixKey || '62991374935'
          );

          const startDate = parseISO(firstInstallmentDate);
          for (let i = 1; i <= installmentsCount; i++) {
            const dueDate = addMonths(startDate, i - 1);
            db.prepare(`
              INSERT INTO installments (id, contract_id, number, value, due_date)
              VALUES (?, ?, ?, ?, ?)
            `).run(uuidv4(), contractId, i, installmentValue, format(dueDate, 'yyyy-MM-dd'));
          }
        }
      }
    });

    transaction();
    res.json({ message: 'Client updated successfully' });
  } catch (error: any) {
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Email or CPF already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Admin: List Clients
router.get('/', authenticate, authorize(['admin']), (req, res) => {
  const clients = db.prepare(`
    SELECT c.*, u.name, u.email, u.created_at,
           ct.total_value, ct.installments_count, ct.installment_value, ct.first_installment_date
    FROM clients c 
    JOIN users u ON c.user_id = u.id
    LEFT JOIN contracts ct ON ct.client_id = c.id
  `).all();
  res.json(clients);
});

// Admin: Get Client Details
router.get('/:id', authenticate, authorize(['admin']), (req, res) => {
  const client = db.prepare(`
    SELECT c.*, u.name, u.email, u.created_at,
           ct.total_value, ct.installments_count, ct.installment_value, ct.first_installment_date
    FROM clients c 
    JOIN users u ON c.user_id = u.id
    LEFT JOIN contracts ct ON ct.client_id = c.id
    WHERE c.id = ?
  `).get(req.params.id);

  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json(client);
});

export default router;
