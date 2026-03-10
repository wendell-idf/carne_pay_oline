import { Router } from 'express';
import { authenticate, authorize, AuthRequest } from '../middlewares/auth.middleware';
import sql from '../database';
import { v4 as uuidv4 } from 'uuid';
import { addMonths, format, parseISO } from 'date-fns';

const router = Router();

// Admin: Create Contract
router.post('/', authenticate, authorize(['admin']), async (req, res) => {
  const { 
    clientId, description, totalValue, downPayment, 
    installmentsCount, installmentValue, firstInstallmentDate, 
    dueDay, pixKey 
  } = req.body;

  try {
    const contractId = uuidv4();
    
    await sql.begin(async (tx: any) => {
      // Insert Contract
      await tx`
        INSERT INTO contracts (
          id, client_id, description, total_value, down_payment, 
          installments_count, installment_value, first_installment_date, 
          due_day, pix_key
        ) VALUES (
          ${contractId}, ${clientId}, ${description}, ${totalValue}, ${downPayment}, 
          ${installmentsCount}, ${installmentValue}, ${firstInstallmentDate}, 
          ${dueDay}, ${pixKey || '62991374935'}
        )
      `;

      // Generate Installments
      const startDate = parseISO(firstInstallmentDate);
      for (let i = 1; i <= installmentsCount; i++) {
        const dueDate = addMonths(startDate, i - 1);
        // Adjust to dueDay if needed, but here we use the firstInstallmentDate as base
        await tx`
          INSERT INTO installments (id, contract_id, number, value, due_date)
          VALUES (${uuidv4()}, ${contractId}, ${i}, ${installmentValue}, ${format(dueDate, 'yyyy-MM-dd')})
        `;
      }
    });

    res.status(201).json({ id: contractId, message: 'Contract and installments created' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update Contract
router.put('/:id', authenticate, authorize(['admin']), async (req, res) => {
  const { id } = req.params;
  const { 
    clientId, description, totalValue, downPayment, 
    installmentsCount, installmentValue, firstInstallmentDate, 
    dueDay, pixKey 
  } = req.body;

  try {
    await sql.begin(async (tx: any) => {
      // Update Contract
      await tx`
        UPDATE contracts SET 
          client_id = ${clientId}, description = ${description}, total_value = ${totalValue}, down_payment = ${downPayment}, 
          installments_count = ${installmentsCount}, installment_value = ${installmentValue}, first_installment_date = ${firstInstallmentDate}, 
          due_day = ${dueDay}, pix_key = ${pixKey || '62991374935'}
        WHERE id = ${id}
      `;

      // Delete existing pending installments
      await tx`DELETE FROM installments WHERE contract_id = ${id} AND status = 'pending'`;

      // We need to figure out how many installments are already paid
      const paidInstallments = await tx`SELECT COUNT(*) as count FROM installments WHERE contract_id = ${id} AND status = 'paid'`;
      const paidCount = Number(paidInstallments[0].count);

      // Generate new pending installments for the remaining count
      const remainingCount = installmentsCount - paidCount;
      if (remainingCount > 0) {
        const startDate = parseISO(firstInstallmentDate);
        for (let i = 1; i <= remainingCount; i++) {
          const installmentNumber = paidCount + i;
          const dueDate = addMonths(startDate, installmentNumber - 1);
          await tx`
            INSERT INTO installments (id, contract_id, number, value, due_date)
            VALUES (${uuidv4()}, ${id}, ${installmentNumber}, ${installmentValue}, ${format(dueDate, 'yyyy-MM-dd')})
          `;
        }
      }
    });

    res.json({ message: 'Contract updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Delete Contract
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    await sql`DELETE FROM contracts WHERE id = ${id}`;
    res.json({ message: 'Contract deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: List Contracts
router.get('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const contracts = await sql`
      SELECT ct.*, u.name as client_name 
      FROM contracts ct
      JOIN clients c ON ct.client_id = c.id
      JOIN users u ON c.user_id = u.id
    `;
    res.json(contracts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Client: Get My Contracts
router.get('/my-contracts', authenticate, authorize(['client']), async (req: AuthRequest, res) => {
  try {
    const contracts = await sql`
      SELECT ct.* 
      FROM contracts ct
      JOIN clients c ON ct.client_id = c.id
      WHERE c.user_id = ${req.user!.id}
    `;
    res.json(contracts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
