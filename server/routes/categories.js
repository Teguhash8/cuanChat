const express = require('express');
const router = express.Router();
const { queryAll, queryOne, run } = require('../db');

router.get('/', (req, res) => {
    try {
        const { type } = req.query;
        let query = 'SELECT * FROM categories WHERE user_id = ?';
        const params = [req.userId];
        if (type) { query += ' AND type = ?'; params.push(type); }
        query += ' ORDER BY name';
        res.json(queryAll(query, params));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', (req, res) => {
    try {
        const { name, icon, color, type = 'expense' } = req.body;
        if (!name) return res.status(400).json({ error: 'Name required' });
        const result = run('INSERT INTO categories (name, icon, color, type, user_id) VALUES (?, ?, ?, ?, ?)',
            [name, icon || '📦', color || '#10b981', type, req.userId]);
        res.status(201).json(queryOne('SELECT * FROM categories WHERE id = ?', [result.lastInsertRowid]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', (req, res) => {
    try {
        const { name, icon, color, type } = req.body;
        const existing = queryOne('SELECT * FROM categories WHERE id = ? AND user_id = ?', [Number(req.params.id), req.userId]);
        if (!existing) return res.status(404).json({ error: 'Category not found' });
        run('UPDATE categories SET name=?, icon=?, color=?, type=? WHERE id=? AND user_id=?', [
            name || existing.name, icon || existing.icon, color || existing.color, type || existing.type,
            Number(req.params.id), req.userId
        ]);
        res.json(queryOne('SELECT * FROM categories WHERE id = ?', [Number(req.params.id)]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', (req, res) => {
    try {
        const existing = queryOne('SELECT * FROM categories WHERE id = ? AND user_id = ?', [Number(req.params.id), req.userId]);
        if (!existing) return res.status(404).json({ error: 'Category not found' });
        run('UPDATE transactions SET category_id = NULL WHERE category_id = ? AND user_id = ?', [Number(req.params.id), req.userId]);
        run('DELETE FROM budgets WHERE category_id = ? AND user_id = ?', [Number(req.params.id), req.userId]);
        run('DELETE FROM categories WHERE id = ? AND user_id = ?', [Number(req.params.id), req.userId]);
        res.json({ message: 'Category deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
