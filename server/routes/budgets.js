const express = require('express');
const router = express.Router();
const { queryAll, queryOne, run } = require('../db');

router.get('/', (req, res) => {
  try {
    const { month } = req.query;
    const currentMonth = month || new Date().toISOString().slice(0, 7);
    const budgets = queryAll(`
      SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
        COALESCE((
          SELECT SUM(t.amount) FROM transactions t
          WHERE t.category_id = b.category_id AND t.type = 'expense'
          AND t.user_id = b.user_id AND strftime('%Y-%m', t.date) = b.month
        ), 0) as spent
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE b.month = ? AND b.user_id = ?
      ORDER BY c.name
    `, [currentMonth, req.userId]);
    res.json(budgets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { category_id, amount, month } = req.body;
    if (!category_id || !amount || !month) return res.status(400).json({ error: 'category_id, amount, and month required' });
    const existing = queryOne('SELECT * FROM budgets WHERE category_id = ? AND month = ? AND user_id = ?',
      [Number(category_id), month, req.userId]);
    if (existing) {
      run('UPDATE budgets SET amount = ? WHERE id = ?', [amount, existing.id]);
    } else {
      run('INSERT INTO budgets (category_id, amount, month, user_id) VALUES (?, ?, ?, ?)',
        [Number(category_id), amount, month, req.userId]);
    }
    const budget = queryOne(`
      SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
        COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.category_id = b.category_id
          AND t.type = 'expense' AND t.user_id = b.user_id AND strftime('%Y-%m', t.date) = b.month), 0) as spent
      FROM budgets b JOIN categories c ON b.category_id = c.id
      WHERE b.category_id = ? AND b.month = ? AND b.user_id = ?
    `, [Number(category_id), month, req.userId]);
    res.json(budget);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    run('DELETE FROM budgets WHERE id = ? AND user_id = ?', [Number(req.params.id), req.userId]);
    res.json({ message: 'Budget deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
