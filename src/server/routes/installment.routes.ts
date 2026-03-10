import { Router } from 'express';
import { authenticate, authorize, AuthRequest } from '../middlewares/auth.middleware';
import db from '../database';
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
router.get('/my-installments', authenticate, authorize(['client']), (req: AuthRequest, res) => {
  const installments = db.prepare(`
    SELECT i.*, ct.description as contract_description, ct.pix_key
    FROM installments i
    JOIN contracts ct ON i.contract_id = ct.id
    JOIN clients c ON ct.client_id = c.id
    WHERE c.user_id = ?
    ORDER BY i.due_date ASC
  `).all(req.user!.id);
  res.json(installments);
});

// Client: Upload Proof
router.post('/:id/proof', authenticate, authorize(['client']), upload.single('proof'), (req: AuthRequest, res) => {
  const { id } = req.params;
  const proofUrl = req.file ? `/uploads/proofs/${req.file.filename}` : null;

  if (!proofUrl) return res.status(400).json({ error: 'No file uploaded' });

  try {
    // Verify ownership
    const installment = db.prepare(`
      SELECT i.id FROM installments i
      JOIN contracts ct ON i.contract_id = ct.id
      JOIN clients c ON ct.client_id = c.id
      WHERE i.id = ? AND c.user_id = ?
    `).get(id, req.user!.id);

    if (!installment) return res.status(403).json({ error: 'Unauthorized' });

    db.prepare('UPDATE installments SET proof_url = ? WHERE id = ?').run(proofUrl, id);
    res.json({ message: 'Proof uploaded successfully', proofUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Mark as Paid
router.post('/:id/pay', authenticate, authorize(['admin']), (req, res) => {
  const { id } = req.params;
  const { paidValue, paymentDate, notes } = req.body;

  try {
    const transaction = db.transaction(() => {
      db.prepare(`
        UPDATE installments 
        SET status = 'paid', paid_value = ?, payment_date = ?, notes = ?
        WHERE id = ?
      `).run(paidValue, paymentDate || new Date().toISOString(), notes, id);

      // Check if contract is fully paid
      const installment = db.prepare('SELECT contract_id FROM installments WHERE id = ?').get(id) as any;
      const pendingCount = db.prepare("SELECT COUNT(*) as count FROM installments WHERE contract_id = ? AND status != 'paid'").get(installment.contract_id) as any;

      if (pendingCount.count === 0) {
        db.prepare("UPDATE contracts SET status = 'paid' WHERE id = ?").run(installment.contract_id);
      }
    });

    transaction();
    res.json({ message: 'Installment marked as paid' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
