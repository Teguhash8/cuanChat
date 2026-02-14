const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve uploaded files (images, audio)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize DB then start server
const { initDb } = require('./db');

initDb().then(() => {
    const { authMiddleware } = require('./middleware/auth');

    // Public routes
    const authRouter = require('./routes/auth');
    app.use('/api/auth', authRouter);

    // Protected routes (require JWT)
    const transactionsRouter = require('./routes/transactions');
    const categoriesRouter = require('./routes/categories');
    const walletsRouter = require('./routes/wallets');
    const budgetsRouter = require('./routes/budgets');
    const dashboardRouter = require('./routes/dashboard');
    const chatRouter = require('./routes/chat');
    const attachmentsRouter = require('./routes/attachments');

    app.use('/api/transactions', authMiddleware, transactionsRouter);
    app.use('/api/categories', authMiddleware, categoriesRouter);
    app.use('/api/wallets', authMiddleware, walletsRouter);
    app.use('/api/budgets', authMiddleware, budgetsRouter);
    app.use('/api/dashboard', authMiddleware, dashboardRouter);
    app.use('/api/chat', authMiddleware, chatRouter);
    app.use('/api/attachments', authMiddleware, attachmentsRouter);

    app.listen(PORT, () => {
        console.log(`🚀 CuanChat API running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
