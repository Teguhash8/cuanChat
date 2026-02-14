const express = require('express');
const router = express.Router();
const { queryAll, queryOne } = require('../db');

router.get('/summary', (req, res) => {
  try {
    const userId = req.userId;
    const currentMonth = new Date().toISOString().slice(0, 7);

    const monthStats = queryOne(`
      SELECT 
        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as total_expense,
        COUNT(*) as total_transactions
      FROM transactions WHERE strftime('%Y-%m', date) = ? AND user_id = ?
    `, [currentMonth, userId]) || { total_income: 0, total_expense: 0, total_transactions: 0 };

    const walletBalance = queryOne('SELECT COALESCE(SUM(balance), 0) as total FROM wallets WHERE user_id = ?', [userId]) || { total: 0 };

    const categoryBreakdown = queryAll(`
      SELECT c.name, c.icon, c.color, COALESCE(SUM(t.amount), 0) as total
      FROM transactions t JOIN categories c ON t.category_id = c.id
      WHERE t.type = 'expense' AND strftime('%Y-%m', t.date) = ? AND t.user_id = ?
      GROUP BY c.id ORDER BY total DESC
    `, [currentMonth, userId]);

    const monthlyTrend = queryAll(`
      SELECT strftime('%Y-%m', date) as month,
        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expense
      FROM transactions WHERE date >= date('now', '-6 months') AND user_id = ?
      GROUP BY strftime('%Y-%m', date) ORDER BY month
    `, [userId]);

    const recentTransactions = queryAll(`
      SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
             w.name as wallet_name, w.icon as wallet_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN wallets w ON t.wallet_id = w.id
      WHERE t.user_id = ?
      ORDER BY t.date DESC, t.created_at DESC LIMIT 5
    `, [userId]);

    const budgetAlerts = queryAll(`
      SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
        COALESCE((SELECT SUM(t.amount) FROM transactions t
          WHERE t.category_id = b.category_id AND t.type = 'expense'
          AND t.user_id = b.user_id AND strftime('%Y-%m', t.date) = b.month), 0) as spent
      FROM budgets b JOIN categories c ON b.category_id = c.id
      WHERE b.month = ? AND b.user_id = ?
    `, [currentMonth, userId]).filter(b => b.spent >= b.amount * 0.8);

    res.json({
      total_income: monthStats.total_income,
      total_expense: monthStats.total_expense,
      total_transactions: monthStats.total_transactions,
      total_balance: walletBalance.total,
      category_breakdown: categoryBreakdown,
      monthly_trend: monthlyTrend,
      recent_transactions: recentTransactions,
      budget_alerts: budgetAlerts,
      current_month: currentMonth,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
