import { Router } from 'express';
import { authenticate, authorize, AuthRequest } from '../middlewares/auth.middleware';
import sql from '../database';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const storage = multer.diskStorage({
  destination: 'uploads/proofs/',
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

// Client: List My Installments
router.get('/my-installments', authenticate, authorize(['client']), async (req: AuthRequest, res) => {
  try {
    const installments = await sql`
      SELECT i.*, ct.description as contract_description, ct.pix_key
      FROM installments i
      JOIN contracts ct ON i.contract_id = ct.id
      JOIN clients c ON ct.client_id = c.id
      WHERE c.user_id = ${req.user!.id}
      ORDER BY i.due_date ASC
    `;
    res.json(installments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Client: Upload Proof
router.post('/:id/proof', authenticate, authorize(['client']), upload.single('proof'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const proofUrl = req.file ? `/uploads/proofs/${req.file.filename}` : null;

  if (!proofUrl) return res.status(400).json({ error: 'No file uploaded' });

  try {
    // Verify ownership
    const installments = await sql`
      SELECT i.id FROM installments i
      JOIN contracts ct ON i.contract_id = ct.id
      JOIN clients c ON ct.client_id = c.id
      WHERE i.id = ${id} AND c.user_id = ${req.user!.id}
    `;

    if (installments.length === 0) return res.status(403).json({ error: 'Unauthorized' });

    await sql`UPDATE installments SET proof_url = ${proofUrl} WHERE id = ${id}`;
    res.json({ message: 'Proof uploaded successfully', proofUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Mark as Paid
router.post('/:id/pay', authenticate, authorize(['admin']), async (req, res) => {
  const { id } = req.params;
  const { paidValue, paymentDate, notes } = req.body;

  try {
    await sql.begin(async (tx: any) => {
      await tx`
        UPDATE installments 
        SET status = 'paid', paid_value = ${paidValue}, payment_date = ${paymentDate || new Date().toISOString()}, notes = ${notes}
        WHERE id = ${id}
      `;

      // Check if contract is fully paid
      const installments = await tx`SELECT contract_id FROM installments WHERE id = ${id}`;
      const installment = installments[0];
      
      const pendingCounts = await tx`SELECT COUNT(*) as count FROM installments WHERE contract_id = ${installment.contract_id} AND status != 'paid'`;
      const pendingCount = Number(pendingCounts[0].count);

      if (pendingCount === 0) {
        await tx`UPDATE contracts SET status = 'paid' WHERE id = ${installment.contract_id}`;
      }
    });

    res.json({ message: 'Installment marked as paid' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
