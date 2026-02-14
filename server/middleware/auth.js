const jwt = require('jsonwebtoken');
const { queryOne } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'cuanchat-secret-key-2024-change-in-production';

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token diperlukan. Silakan login terlebih dahulu.' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = queryOne('SELECT id, name, email FROM users WHERE id = ?', [decoded.userId]);
        if (!user) {
            return res.status(401).json({ error: 'User tidak ditemukan.' });
        }
        req.userId = user.id;
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token tidak valid atau sudah kadaluarsa.' });
    }
}

module.exports = { authMiddleware, JWT_SECRET };
