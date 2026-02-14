const express = require('express');
const router = express.Router();
const { queryAll, queryOne, run } = require('../db');

router.get('/', (req, res) => {
    try {
        res.json(queryAll('SELECT * FROM wallets WHERE user_id = ? ORDER BY is_default DESC, name', [req.userId]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', (req, res) => {
    try {
        const { name, icon, color, balance = 0 } = req.body;
        if (!name) return res.status(400).json({ error: 'Name required' });
        const result = run('INSERT INTO wallets (name, icon, color, balance, user_id) VALUES (?, ?, ?, ?, ?)',
            [name, icon || '💳', color || '#3b82f6', balance, req.userId]);
        res.status(201).json(queryOne('SELECT * FROM wallets WHERE id = ?', [result.lastInsertRowid]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', (req, res) => {
    try {
        const { name, icon, color, balance, is_default } = req.body;
        const existing = queryOne('SELECT * FROM wallets WHERE id = ? AND user_id = ?', [Number(req.params.id), req.userId]);
        if (!existing) return res.status(404).json({ error: 'Wallet not found' });
        if (is_default) run('UPDATE wallets SET is_default = 0 WHERE user_id = ?', [req.userId]);
        run('UPDATE wallets SET name=?, icon=?, color=?, balance=?, is_default=? WHERE id=? AND user_id=?', [
            name || existing.name, icon || existing.icon, color || existing.color,
            balance !== undefined ? balance : existing.balance,
            is_default !== undefined ? is_default : existing.is_default,
            Number(req.params.id), req.userId
        ]);
        res.json(queryOne('SELECT * FROM wallets WHERE id = ?', [Number(req.params.id)]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', (req, res) => {
    try {
        const existing = queryOne('SELECT * FROM wallets WHERE id = ? AND user_id = ?', [Number(req.params.id), req.userId]);
        if (!existing) return res.status(404).json({ error: 'Wallet not found' });
        run('UPDATE transactions SET wallet_id = NULL WHERE wallet_id = ? AND user_id = ?', [Number(req.params.id), req.userId]);
        run('DELETE FROM wallets WHERE id = ? AND user_id = ?', [Number(req.params.id), req.userId]);
        res.json({ message: 'Wallet deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
