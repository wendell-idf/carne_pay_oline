import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import db from '../database';

const router = Router();

// Admin: Dashboard Stats
router.get('/stats', authenticate, authorize(['admin']), (req, res) => {
  try {
    const totalClients = db.prepare('SELECT COUNT(*) as count FROM clients').get() as any;
    const totalContracts = db.prepare('SELECT COUNT(*) as count FROM contracts').get() as any;
    
    const financialStats = db.prepare(`
      SELECT 
        SUM(CASE WHEN status = 'paid' THEN paid_value ELSE 0 END) as total_received,
        SUM(CASE WHEN status = 'pending' THEN value ELSE 0 END) as total_pending,
        SUM(CASE WHEN status = 'overdue' THEN value ELSE 0 END) as total_overdue
      FROM installments
    `).get() as any;

    const currentMonthStats = db.prepare(`
      SELECT 
        SUM(CASE WHEN status = 'paid' THEN paid_value ELSE 0 END) as month_received,
        SUM(CASE WHEN status != 'paid' THEN value ELSE 0 END) as month_pending
      FROM installments
      WHERE strftime('%Y-%m', due_date) = strftime('%Y-%m', 'now')
    `).get() as any;

    const upcomingVencimentos = db.prepare(`
      SELECT i.*, u.name as client_name
      FROM installments i
      JOIN contracts ct ON i.contract_id = ct.id
      JOIN clients c ON ct.client_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE i.status = 'pending' AND i.due_date BETWEEN date('now') AND date('now', '+7 days')
      ORDER BY i.due_date ASC
    `).all();

    res.json({
      clients: totalClients.count,
      contracts: totalContracts.count,
      financial: financialStats,
      currentMonth: currentMonthStats,
      upcoming: upcomingVencimentos
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update Overdue Status (Cron-like)
router.post('/update-overdue', authenticate, authorize(['admin']), (req, res) => {
  try {
    const result = db.prepare(`
      UPDATE installments 
      SET status = 'overdue' 
      WHERE status = 'pending' AND due_date < date('now')
    `).run();
    res.json({ message: `${result.changes} installments updated to overdue` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
