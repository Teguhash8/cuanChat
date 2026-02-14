const express = require('express');
const router = express.Router();
const { queryAll, queryOne, run } = require('../db');

// GET all transactions with filters
router.get('/', (req, res) => {
    try {
        const userId = req.userId;
        const { category_id, wallet_id, type, start_date, end_date, search, limit = 50, offset = 0 } = req.query;

        let query = `
      SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
             w.name as wallet_name, w.icon as wallet_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN wallets w ON t.wallet_id = w.id
      WHERE t.user_id = ?
    `;
        const params = [userId];

        if (category_id) { query += ' AND t.category_id = ?'; params.push(Number(category_id)); }
        if (wallet_id) { query += ' AND t.wallet_id = ?'; params.push(Number(wallet_id)); }
        if (type) { query += ' AND t.type = ?'; params.push(type); }
        if (start_date) { query += ' AND t.date >= ?'; params.push(start_date); }
        if (end_date) { query += ' AND t.date <= ?'; params.push(end_date); }
        if (search) { query += " AND t.description LIKE '%' || ? || '%'"; params.push(search); }

        query += ' ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const transactions = queryAll(query, params);

        let countQuery = 'SELECT COUNT(*) as total FROM transactions t WHERE t.user_id = ?';
        const countParams = [userId];
        if (category_id) { countQuery += ' AND t.category_id = ?'; countParams.push(Number(category_id)); }
        if (wallet_id) { countQuery += ' AND t.wallet_id = ?'; countParams.push(Number(wallet_id)); }
        if (type) { countQuery += ' AND t.type = ?'; countParams.push(type); }
        if (start_date) { countQuery += ' AND t.date >= ?'; countParams.push(start_date); }
        if (end_date) { countQuery += ' AND t.date <= ?'; countParams.push(end_date); }
        if (search) { countQuery += " AND t.description LIKE '%' || ? || '%'"; countParams.push(search); }
        const totalRow = queryOne(countQuery, countParams);

        res.json({ transactions, total: totalRow ? totalRow.total : 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single transaction
router.get('/:id', (req, res) => {
    try {
        const transaction = queryOne(`
      SELECT t.*, c.name as category_name, c.icon as category_icon,
             w.name as wallet_name, w.icon as wallet_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN wallets w ON t.wallet_id = w.id
      WHERE t.id = ? AND t.user_id = ?
    `, [Number(req.params.id), req.userId]);
        if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
        res.json(transaction);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create transaction
router.post('/', (req, res) => {
    try {
        const userId = req.userId;
        const { description, amount, type = 'expense', category_id, wallet_id, date, notes, source = 'web' } = req.body;
        if (!description || !amount) return res.status(400).json({ error: 'Description and amount required' });

        const txDate = date || new Date().toISOString().split('T')[0];
        const result = run(
            'INSERT INTO transactions (description, amount, type, category_id, wallet_id, user_id, date, notes, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [description, amount, type, category_id || null, wallet_id || null, userId, txDate, notes || null, source]
        );

        if (wallet_id) {
            const delta = type === 'income' ? amount : -amount;
            run('UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?', [delta, Number(wallet_id), userId]);
        }

        const transaction = queryOne(`
      SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
             w.name as wallet_name, w.icon as wallet_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN wallets w ON t.wallet_id = w.id
      WHERE t.id = ?
    `, [result.lastInsertRowid]);

        res.status(201).json(transaction);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update transaction
router.put('/:id', (req, res) => {
    try {
        const userId = req.userId;
        const existing = queryOne('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [Number(req.params.id), userId]);
        if (!existing) return res.status(404).json({ error: 'Transaction not found' });

        const { description, amount, type, category_id, wallet_id, date, notes } = req.body;

        if (existing.wallet_id) {
            const oldDelta = existing.type === 'income' ? -existing.amount : existing.amount;
            run('UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?', [oldDelta, existing.wallet_id, userId]);
        }

        run(
            'UPDATE transactions SET description=?, amount=?, type=?, category_id=?, wallet_id=?, date=?, notes=? WHERE id = ? AND user_id = ?',
            [
                description || existing.description, amount || existing.amount, type || existing.type,
                category_id !== undefined ? category_id : existing.category_id,
                wallet_id !== undefined ? wallet_id : existing.wallet_id,
                date || existing.date, notes !== undefined ? notes : existing.notes,
                Number(req.params.id), userId
            ]
        );

        const newWalletId = wallet_id !== undefined ? wallet_id : existing.wallet_id;
        const newAmount = amount || existing.amount;
        const newType = type || existing.type;
        if (newWalletId) {
            const newDelta = newType === 'income' ? newAmount : -newAmount;
            run('UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?', [newDelta, newWalletId, userId]);
        }

        const updated = queryOne(`
      SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
             w.name as wallet_name, w.icon as wallet_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN wallets w ON t.wallet_id = w.id
      WHERE t.id = ?
    `, [Number(req.params.id)]);

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE transaction
router.delete('/:id', (req, res) => {
    try {
        const userId = req.userId;
        const existing = queryOne('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [Number(req.params.id), userId]);
        if (!existing) return res.status(404).json({ error: 'Transaction not found' });

        if (existing.wallet_id) {
            const delta = existing.type === 'income' ? -existing.amount : existing.amount;
            run('UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?', [delta, existing.wallet_id, userId]);
        }

        run('DELETE FROM transactions WHERE id = ? AND user_id = ?', [Number(req.params.id), userId]);
        res.json({ message: 'Transaction deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
