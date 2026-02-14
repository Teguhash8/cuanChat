const express = require('express');
const router = express.Router();
const { queryAll, queryOne, run } = require('../db');

function parseMessage(message, userId) {
    const msg = message.toLowerCase().trim();
    if (msg.includes('sisa budget') || msg.includes('sisa anggaran') || msg.includes('budget')) return handleBudgetQuery(msg, userId);
    if (msg.includes('total pengeluaran') || msg.includes('total bulan ini') || msg.includes('berapa pengeluaran')) return handleSummaryQuery(userId);
    if (msg.includes('saldo') || msg.includes('balance') || msg.includes('cek saldo')) return handleBalanceQuery(userId);
    return handleTransactionParse(msg, message, userId);
}

function handleBudgetQuery(msg, userId) {
    const categories = queryAll("SELECT * FROM categories WHERE type = ? AND user_id = ?", ['expense', userId]);
    const currentMonth = new Date().toISOString().slice(0, 7);
    let targetCategory = null;
    for (const cat of categories) {
        if (msg.includes(cat.name.toLowerCase()) || msg.includes(cat.name.split(' ')[0].toLowerCase())) { targetCategory = cat; break; }
    }
    const catMap = {
        'makan': 'Makanan & Minuman', 'makanan': 'Makanan & Minuman', 'food': 'Makanan & Minuman',
        'transport': 'Transportasi', 'transportasi': 'Transportasi',
        'belanja': 'Belanja', 'hiburan': 'Hiburan', 'tagihan': 'Tagihan', 'listrik': 'Tagihan',
    };
    if (!targetCategory) {
        for (const [key, catName] of Object.entries(catMap)) {
            if (msg.includes(key)) { targetCategory = categories.find(c => c.name === catName); break; }
        }
    }
    if (targetCategory) {
        const budget = queryOne(`
      SELECT b.amount, COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.category_id = b.category_id AND t.type='expense' AND t.user_id = ? AND strftime('%Y-%m', t.date) = b.month), 0) as spent
      FROM budgets b WHERE b.category_id = ? AND b.month = ? AND b.user_id = ?
    `, [userId, targetCategory.id, currentMonth, userId]);
        if (budget) {
            const sisa = budget.amount - budget.spent;
            return { type: 'query', response: `💰 Budget ${targetCategory.name} bulan ini:\n\nAnggaran: Rp${Number(budget.amount).toLocaleString('id-ID')}\nTerpakai: Rp${Number(budget.spent).toLocaleString('id-ID')}\nSisa: Rp${Number(sisa).toLocaleString('id-ID')}${sisa < budget.amount * 0.2 ? '\n\n⚠️ Budget hampir habis!' : ''}` };
        }
        return { type: 'query', response: `ℹ️ Belum ada budget untuk kategori ${targetCategory.name} bulan ini. Atur di menu Budget.` };
    }
    return { type: 'query', response: '❓ Kategori mana yang ingin kamu cek? Contoh: "Sisa budget makan?"' };
}

function handleSummaryQuery(userId) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const stats = queryOne(`
    SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expense
    FROM transactions WHERE strftime('%Y-%m', date) = ? AND user_id = ?
  `, [currentMonth, userId]) || { income: 0, expense: 0 };
    return { type: 'query', response: `📊 Ringkasan bulan ini:\n\n💚 Pemasukan: Rp${Number(stats.income).toLocaleString('id-ID')}\n❤️ Pengeluaran: Rp${Number(stats.expense).toLocaleString('id-ID')}\n📌 Selisih: Rp${Number(stats.income - stats.expense).toLocaleString('id-ID')}` };
}

function handleBalanceQuery(userId) {
    const wallets = queryAll('SELECT * FROM wallets WHERE user_id = ? ORDER BY is_default DESC', [userId]);
    let response = '💳 Saldo Dompet:\n\n';
    let total = 0;
    for (const w of wallets) { response += `${w.icon} ${w.name}: Rp${Number(w.balance).toLocaleString('id-ID')}\n`; total += w.balance; }
    response += `\n💰 Total: Rp${Number(total).toLocaleString('id-ID')}`;
    return { type: 'query', response };
}

function handleTransactionParse(msg, originalMsg, userId) {
    let amount = 0;
    const patterns = [/(\d+(?:[.,]\d+)?)\s*(?:ribu|rb|k)/i, /(\d+(?:[.,]\d+)?)\s*(?:juta|jt)/i, /rp\.?\s*(\d+(?:[.,]\d+)*)/i, /(\d{4,})/, /(\d+(?:[.,]\d+)?)\s*(?:rbu)/i];
    for (let i = 0; i < patterns.length; i++) {
        const match = msg.match(patterns[i]);
        if (match) {
            let num = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
            if (i === 0 || i === 4) num *= 1000;
            if (i === 1) num *= 1000000;
            amount = num; break;
        }
    }
    if (amount === 0) return { type: 'error', response: '❌ Nominal tidak terdeteksi. Contoh: "Nasi goreng 15rb" atau "Kopi Rp25.000"' };

    const categoryKeywords = {
        'Makanan & Minuman': ['makan', 'nasi', 'ayam', 'bakso', 'mie', 'kopi', 'teh', 'jus', 'snack', 'sarapan', 'minum', 'siang', 'resto', 'cafe', 'warteg', 'indomie', 'pizza', 'burger', 'sate', 'soto', 'gofood', 'grabfood'],
        'Transportasi': ['grab', 'gojek', 'taxi', 'taksi', 'bensin', 'bbm', 'parkir', 'tol', 'bus', 'kereta', 'ojek', 'ojol', 'pertalite', 'pertamax'],
        'Belanja': ['belanja', 'beli', 'indomaret', 'alfamart', 'supermarket', 'toko', 'mall', 'tokped', 'shopee', 'lazada'],
        'Hiburan': ['nonton', 'bioskop', 'game', 'netflix', 'spotify', 'main', 'karaoke'],
        'Tagihan': ['listrik', 'air', 'internet', 'wifi', 'pulsa', 'kuota', 'token', 'pln', 'tagihan'],
        'Kesehatan': ['obat', 'dokter', 'apotek', 'vitamin', 'klinik'],
        'Pendidikan': ['buku', 'kursus', 'les', 'sekolah', 'kuliah', 'udemy'],
    };
    let detectedCategory = null;
    const categories = queryAll("SELECT * FROM categories WHERE type = ? AND user_id = ?", ['expense', userId]);
    for (const [catName, keywords] of Object.entries(categoryKeywords)) {
        for (const kw of keywords) { if (msg.includes(kw)) { detectedCategory = categories.find(c => c.name === catName); break; } }
        if (detectedCategory) break;
    }
    if (!detectedCategory) detectedCategory = categories.find(c => c.name === 'Lainnya');

    const walletKeywords = { 'Tunai': ['tunai', 'cash'], 'BCA': ['bca', 'bank', 'transfer', 'tf'], 'OVO': ['ovo'], 'GoPay': ['gopay'], 'ShopeePay': ['shopeepay', 'spay'] };
    let detectedWallet = null;
    const wallets = queryAll('SELECT * FROM wallets WHERE user_id = ?', [userId]);
    for (const [wName, keywords] of Object.entries(walletKeywords)) {
        for (const kw of keywords) { if (msg.includes(kw)) { detectedWallet = wallets.find(w => w.name === wName); break; } }
        if (detectedWallet) break;
    }
    if (!detectedWallet) detectedWallet = wallets.find(w => w.is_default) || wallets[0];

    let description = originalMsg.replace(/\d+(?:[.,]\d+)?\s*(?:ribu|rb|k|juta|jt|rbu)/gi, '').trim();
    description = description.replace(/rp\.?\s*\d+(?:[.,]\d+)*/gi, '').trim();
    description = description.replace(/\d{4,}/g, '').trim();
    description = description.replace(/\b(pake|pakai|via|dari|lewat|di)\s+\w+/gi, '').trim();
    description = description.replace(/\s+/g, ' ').trim();
    if (!description) description = originalMsg.substring(0, 50);
    description = description.charAt(0).toUpperCase() + description.slice(1);

    return {
        type: 'transaction',
        data: {
            description, amount, type: 'expense',
            category_id: detectedCategory?.id, category_name: detectedCategory?.name, category_icon: detectedCategory?.icon,
            wallet_id: detectedWallet?.id, wallet_name: detectedWallet?.name, wallet_icon: detectedWallet?.icon,
        },
    };
}

router.post('/parse', (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Message required' });
        res.json(parseMessage(message, req.userId));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/save', (req, res) => {
    try {
        const userId = req.userId;
        const { description, amount, type = 'expense', category_id, wallet_id } = req.body;
        const txDate = new Date().toISOString().split('T')[0];
        const result = run("INSERT INTO transactions (description, amount, type, category_id, wallet_id, user_id, date, source) VALUES (?, ?, ?, ?, ?, ?, ?, 'chat')",
            [description, amount, type, category_id, wallet_id, userId, txDate]);
        if (wallet_id) {
            const delta = type === 'income' ? amount : -amount;
            run('UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?', [delta, wallet_id, userId]);
        }
        const transaction = queryOne(`SELECT t.*, c.name as category_name, c.icon as category_icon, w.name as wallet_name, w.icon as wallet_icon
      FROM transactions t LEFT JOIN categories c ON t.category_id = c.id LEFT JOIN wallets w ON t.wallet_id = w.id WHERE t.id = ?`, [result.lastInsertRowid]);
        let walletBalance = null;
        if (wallet_id) { const w = queryOne('SELECT balance FROM wallets WHERE id = ?', [wallet_id]); walletBalance = w ? w.balance : null; }
        res.status(201).json({ transaction, wallet_balance: walletBalance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/update-wallet', (req, res) => {
    try {
        const userId = req.userId;
        const { transaction_id, wallet_id } = req.body;
        const existing = queryOne('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [transaction_id, userId]);
        if (!existing) return res.status(404).json({ error: 'Transaction not found' });
        if (existing.wallet_id) {
            const oldDelta = existing.type === 'income' ? -existing.amount : existing.amount;
            run('UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?', [oldDelta, existing.wallet_id, userId]);
        }
        run('UPDATE transactions SET wallet_id = ? WHERE id = ? AND user_id = ?', [wallet_id, transaction_id, userId]);
        const newDelta = existing.type === 'income' ? existing.amount : -existing.amount;
        run('UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?', [newDelta, wallet_id, userId]);
        const wallet = queryOne('SELECT * FROM wallets WHERE id = ?', [wallet_id]);
        res.json({ wallet_name: wallet.name, wallet_icon: wallet.icon, balance: wallet.balance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
module.exports.parseMessage = parseMessage;
module.exports.handleTransactionParse = handleTransactionParse;
module.exports.handleBudgetQuery = handleBudgetQuery;
module.exports.handleSummaryQuery = handleSummaryQuery;
module.exports.handleBalanceQuery = handleBalanceQuery;
