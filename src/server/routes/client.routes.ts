import { Router } from 'express';
import { authenticate, authorize, AuthRequest } from '../middlewares/auth.middleware';
import sql from '../database';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { addMonths, format, parseISO } from 'date-fns';

const router = Router();

// Admin: Register Client
router.post('/', authenticate, authorize(['admin']), async (req: AuthRequest, res) => {
  const { name, email, password, cpf, phone, address } = req.body;

  try {
    const userId = uuidv4();
    const clientId = uuidv4();
    const hashedPassword = bcrypt.hashSync(password || 'cliente123', 10);

    await sql.begin(async (tx: any) => {
      await tx`
        INSERT INTO users (id, name, email, password, role) 
        VALUES (${userId}, ${name}, ${email}, ${hashedPassword}, 'client')
      `;
      
      await tx`
        INSERT INTO clients (id, user_id, cpf, phone, address) 
        VALUES (${clientId}, ${userId}, ${cpf}, ${phone}, ${address})
      `;
    });

    res.status(201).json({ id: clientId, message: 'Client registered successfully' });
  } catch (error: any) {
    if (error.message.includes('UNIQUE') || error.message.includes('unique constraint')) {
      return res.status(400).json({ error: 'Email or CPF already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update Client and Contract
router.put('/:id', authenticate, authorize(['admin']), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { 
    name, email, password, cpf, phone, address,
    totalValue, installmentsCount, installmentValue, firstInstallmentDate, pixKey
  } = req.body;

  try {
    const clients = await sql`SELECT user_id FROM clients WHERE id = ${id}`;
    const client = clients[0];
    if (!client) return res.status(404).json({ error: 'Client not found' });

    await sql.begin(async (tx: any) => {
      // Update User
      if (password) {
        const hashedPassword = bcrypt.hashSync(password, 10);
        await tx`UPDATE users SET name = ${name}, email = ${email}, password = ${hashedPassword} WHERE id = ${client.user_id}`;
      } else {
        await tx`UPDATE users SET name = ${name}, email = ${email} WHERE id = ${client.user_id}`;
      }

      // Update Client
      await tx`UPDATE clients SET cpf = ${cpf}, phone = ${phone}, address = ${address} WHERE id = ${id}`;

      // Handle Contract if provided
      if (totalValue && installmentsCount && installmentValue && firstInstallmentDate) {
        const existingContracts = await tx`SELECT id FROM contracts WHERE client_id = ${id} LIMIT 1`;
        const existingContract = existingContracts[0];
        
        if (existingContract) {
          // Update existing contract
          await tx`
            UPDATE contracts SET 
              total_value = ${totalValue}, installments_count = ${installmentsCount}, 
              installment_value = ${installmentValue}, first_installment_date = ${firstInstallmentDate}, 
              pix_key = ${pixKey || '62991374935'}
            WHERE id = ${existingContract.id}
          `;

          // Delete existing pending installments
          await tx`DELETE FROM installments WHERE contract_id = ${existingContract.id} AND status = 'pending'`;

          // Calculate remaining installments
          const paidInstallments = await tx`SELECT COUNT(*) as count FROM installments WHERE contract_id = ${existingContract.id} AND status = 'paid'`;
          const paidCount = Number(paidInstallments[0].count);

          const remainingCount = installmentsCount - paidCount;
          if (remainingCount > 0) {
            const startDate = parseISO(firstInstallmentDate);
            for (let i = 1; i <= remainingCount; i++) {
              const installmentNumber = paidCount + i;
              const dueDate = addMonths(startDate, installmentNumber - 1);
              await tx`
                INSERT INTO installments (id, contract_id, number, value, due_date)
                VALUES (${uuidv4()}, ${existingContract.id}, ${installmentNumber}, ${installmentValue}, ${format(dueDate, 'yyyy-MM-dd')})
              `;
            }
          }
        } else {
          // Create new contract
          const contractId = uuidv4();
          await tx`
            INSERT INTO contracts (
              id, client_id, description, total_value, down_payment, 
              installments_count, installment_value, first_installment_date, 
              due_day, pix_key
            ) VALUES (
              ${contractId}, ${id}, 'Contrato Padrão', ${totalValue}, 0, 
              ${installmentsCount}, ${installmentValue}, ${firstInstallmentDate}, 
              15, ${pixKey || '62991374935'}
            )
          `;

          const startDate = parseISO(firstInstallmentDate);
          for (let i = 1; i <= installmentsCount; i++) {
            const dueDate = addMonths(startDate, i - 1);
            await tx`
              INSERT INTO installments (id, contract_id, number, value, due_date)
              VALUES (${uuidv4()}, ${contractId}, ${i}, ${installmentValue}, ${format(dueDate, 'yyyy-MM-dd')})
            `;
          }
        }
      }
    });

    res.json({ message: 'Client updated successfully' });
  } catch (error: any) {
    if (error.message.includes('UNIQUE') || error.message.includes('unique constraint')) {
      return res.status(400).json({ error: 'Email or CPF already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Admin: List Clients
router.get('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const clients = await sql`
      SELECT c.*, u.name, u.email, u.created_at,
             ct.total_value, ct.installments_count, ct.installment_value, ct.first_installment_date
      FROM clients c 
      JOIN users u ON c.user_id = u.id
      LEFT JOIN contracts ct ON ct.client_id = c.id
    `;
    res.json(clients);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get Client Details
router.get('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const clients = await sql`
      SELECT c.*, u.name, u.email, u.created_at,
             ct.total_value, ct.installments_count, ct.installment_value, ct.first_installment_date
      FROM clients c 
      JOIN users u ON c.user_id = u.id
      LEFT JOIN contracts ct ON ct.client_id = c.id
      WHERE c.id = ${req.params.id}
    `;

    const client = clients[0];
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
