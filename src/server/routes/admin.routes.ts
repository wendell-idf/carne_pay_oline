import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import sql from '../database';

const router = Router();

// Admin: Dashboard Stats
router.get('/stats', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const totalClientsResult = await sql`SELECT COUNT(*) as count FROM clients`;
    const totalContractsResult = await sql`SELECT COUNT(*) as count FROM contracts`;
    
    const financialStatsResult = await sql`
      SELECT 
        SUM(CASE WHEN status = 'paid' THEN paid_value ELSE 0 END) as total_received,
        SUM(CASE WHEN status = 'pending' THEN value ELSE 0 END) as total_pending,
        SUM(CASE WHEN status = 'overdue' THEN value ELSE 0 END) as total_overdue
      FROM installments
    `;

    const currentMonthStatsResult = await sql`
      SELECT 
        SUM(CASE WHEN status = 'paid' THEN paid_value ELSE 0 END) as month_received,
        SUM(CASE WHEN status != 'paid' THEN value ELSE 0 END) as month_pending
      FROM installments
      WHERE TO_CHAR(due_date, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    `;

    const upcomingVencimentos = await sql`
      SELECT i.*, u.name as client_name
      FROM installments i
      JOIN contracts ct ON i.contract_id = ct.id
      JOIN clients c ON ct.client_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE i.status = 'pending' AND i.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      ORDER BY i.due_date ASC
    `;

    res.json({
      clients: Number(totalClientsResult[0].count),
      contracts: Number(totalContractsResult[0].count),
      financial: financialStatsResult[0],
      currentMonth: currentMonthStatsResult[0],
      upcoming: upcomingVencimentos
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update Overdue Status (Cron-like)
router.post('/update-overdue', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const result = await sql`
      UPDATE installments 
      SET status = 'overdue' 
      WHERE status = 'pending' AND due_date < CURRENT_DATE
    `;
    res.json({ message: `${result.count} installments updated to overdue` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
