import { Router } from 'express';
import { authenticate, authorize, AuthRequest } from '../middlewares/auth.middleware';
import db from '../database';
import { v4 as uuidv4 } from 'uuid';
import { addMonths, format, parseISO } from 'date-fns';

const router = Router();

// Admin: Create Contract
router.post('/', authenticate, authorize(['admin']), (req, res) => {
  const { 
    clientId, description, totalValue, downPayment, 
    installmentsCount, installmentValue, firstInstallmentDate, 
    dueDay, pixKey 
  } = req.body;

  try {
    const contractId = uuidv4();
    
    const transaction = db.transaction(() => {
      // Insert Contract
      db.prepare(`
        INSERT INTO contracts (
          id, client_id, description, total_value, down_payment, 
          installments_count, installment_value, first_installment_date, 
          due_day, pix_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        contractId, clientId, description, totalValue, downPayment, 
        installmentsCount, installmentValue, firstInstallmentDate, 
        dueDay, pixKey || '62991374935'
      );

      // Generate Installments
      const startDate = parseISO(firstInstallmentDate);
      for (let i = 1; i <= installmentsCount; i++) {
        const dueDate = addMonths(startDate, i - 1);
        // Adjust to dueDay if needed, but here we use the firstInstallmentDate as base
        db.prepare(`
          INSERT INTO installments (id, contract_id, number, value, due_date)
          VALUES (?, ?, ?, ?, ?)
        `).run(uuidv4(), contractId, i, installmentValue, format(dueDate, 'yyyy-MM-dd'));
      }
    });

    transaction();
    res.status(201).json({ id: contractId, message: 'Contract and installments created' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update Contract
router.put('/:id', authenticate, authorize(['admin']), (req, res) => {
  const { id } = req.params;
  const { 
    clientId, description, totalValue, downPayment, 
    installmentsCount, installmentValue, firstInstallmentDate, 
    dueDay, pixKey 
  } = req.body;

  try {
    const transaction = db.transaction(() => {
      // Update Contract
      db.prepare(`
        UPDATE contracts SET 
          client_id = ?, description = ?, total_value = ?, down_payment = ?, 
          installments_count = ?, installment_value = ?, first_installment_date = ?, 
          due_day = ?, pix_key = ?
        WHERE id = ?
      `).run(
        clientId, description, totalValue, downPayment, 
        installmentsCount, installmentValue, firstInstallmentDate, 
        dueDay, pixKey || '62991374935', id
      );

      // Delete existing pending installments
      db.prepare("DELETE FROM installments WHERE contract_id = ? AND status = 'pending'").run(id);

      // We need to figure out how many installments are already paid
      const paidInstallments = db.prepare("SELECT COUNT(*) as count FROM installments WHERE contract_id = ? AND status = 'paid'").get(id) as any;
      const paidCount = paidInstallments.count;

      // Generate new pending installments for the remaining count
      const remainingCount = installmentsCount - paidCount;
      if (remainingCount > 0) {
        const startDate = parseISO(firstInstallmentDate);
        for (let i = 1; i <= remainingCount; i++) {
          const installmentNumber = paidCount + i;
          const dueDate = addMonths(startDate, installmentNumber - 1);
          db.prepare(`
            INSERT INTO installments (id, contract_id, number, value, due_date)
            VALUES (?, ?, ?, ?, ?)
          `).run(uuidv4(), id, installmentNumber, installmentValue, format(dueDate, 'yyyy-MM-dd'));
        }
      }
    });

    transaction();
    res.json({ message: 'Contract updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Delete Contract
router.delete('/:id', authenticate, authorize(['admin']), (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM contracts WHERE id = ?').run(id);
    res.json({ message: 'Contract deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: List Contracts
router.get('/', authenticate, authorize(['admin']), (req, res) => {
  const contracts = db.prepare(`
    SELECT ct.*, u.name as client_name 
    FROM contracts ct
    JOIN clients c ON ct.client_id = c.id
    JOIN users u ON c.user_id = u.id
  `).all();
  res.json(contracts);
});

// Client: Get My Contracts
router.get('/my-contracts', authenticate, authorize(['client']), (req: AuthRequest, res) => {
  const contracts = db.prepare(`
    SELECT ct.* 
    FROM contracts ct
    JOIN clients c ON ct.client_id = c.id
    WHERE c.user_id = ?
  `).all(req.user!.id);
  res.json(contracts);
});

export default router;
