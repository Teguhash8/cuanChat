const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { queryOne, run, seedDefaultData } = require('../db');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Nama, email, dan password wajib diisi.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password minimal 6 karakter.' });
        }

        // Check if email already exists
        const existing = queryOne('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
        if (existing) {
            return res.status(400).json({ error: 'Email sudah terdaftar. Silakan login.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user
        const result = run(
            'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
            [name, email.toLowerCase(), passwordHash]
        );

        const userId = result.lastInsertRowid;

        // Seed default categories & wallets for this user
        seedDefaultData(userId);

        // Generate token
        const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });

        const user = queryOne('SELECT id, name, email FROM users WHERE id = ?', [userId]);

        res.status(201).json({
            token,
            user,
            message: 'Registrasi berhasil! Selamat datang di CuanChat 🎉'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email dan password wajib diisi.' });
        }

        const user = queryOne('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
        if (!user) {
            return res.status(401).json({ error: 'Email atau password salah.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Email atau password salah.' });
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

        res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email },
            message: 'Login berhasil! 👋'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
    res.json(req.user);
});

module.exports = router;
