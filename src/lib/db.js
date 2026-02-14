import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

// ── Query Helpers ──

export async function query(text, params = []) {
    const rows = await sql(text, params);
    return rows;
}

export async function queryOne(text, params = []) {
    const rows = await sql(text, params);
    return rows[0] || null;
}

export async function run(text, params = []) {
    const rows = await sql(text, params);
    return rows;
}

// ── Database Initialization ──

export async function initDB() {
    await sql`
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

    await sql`
    CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(10) DEFAULT '📦',
        color VARCHAR(20) DEFAULT '#10b981',
        type VARCHAR(10) DEFAULT 'expense',
        user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

    await sql`
    CREATE TABLE IF NOT EXISTS wallets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(10) DEFAULT '💳',
        color VARCHAR(20) DEFAULT '#3b82f6',
        balance NUMERIC DEFAULT 0,
        is_default INTEGER DEFAULT 0,
        user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

    await sql`
    CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        description TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        type VARCHAR(10) DEFAULT 'expense',
        category_id INTEGER REFERENCES categories(id),
        wallet_id INTEGER REFERENCES wallets(id),
        user_id INTEGER REFERENCES users(id),
        date DATE DEFAULT CURRENT_DATE,
        notes TEXT,
        source VARCHAR(50) DEFAULT 'web',
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

    await sql`
    CREATE TABLE IF NOT EXISTS budgets (
        id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES categories(id),
        amount NUMERIC NOT NULL,
        month VARCHAR(7) NOT NULL,
        user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(category_id, month, user_id)
    )`;
}

// ── Seed Default Data ──

export async function seedDefaultData(userId) {
    const defaultCategories = [
        { name: 'Makanan & Minuman', icon: '🍔', color: '#ef4444', type: 'expense' },
        { name: 'Transportasi', icon: '🚕', color: '#f59e0b', type: 'expense' },
        { name: 'Belanja', icon: '🛒', color: '#8b5cf6', type: 'expense' },
        { name: 'Hiburan', icon: '🎮', color: '#ec4899', type: 'expense' },
        { name: 'Tagihan', icon: '📄', color: '#06b6d4', type: 'expense' },
        { name: 'Kesehatan', icon: '💊', color: '#14b8a6', type: 'expense' },
        { name: 'Pendidikan', icon: '📚', color: '#6366f1', type: 'expense' },
        { name: 'Lainnya', icon: '📦', color: '#64748b', type: 'expense' },
        { name: 'Gaji', icon: '💰', color: '#10b981', type: 'income' },
        { name: 'Freelance', icon: '💻', color: '#3b82f6', type: 'income' },
        { name: 'Investasi', icon: '📈', color: '#f59e0b', type: 'income' },
        { name: 'Lainnya', icon: '💵', color: '#64748b', type: 'income' },
    ];

    for (const cat of defaultCategories) {
        await sql`INSERT INTO categories (name, icon, color, type, user_id) VALUES (${cat.name}, ${cat.icon}, ${cat.color}, ${cat.type}, ${userId})`;
    }

    const defaultWallets = [
        { name: 'Tunai', icon: '💵', color: '#10b981', balance: 0, is_default: 1 },
        { name: 'Bank BCA', icon: '🏦', color: '#3b82f6', balance: 0, is_default: 0 },
        { name: 'OVO', icon: '🟣', color: '#7c3aed', balance: 0, is_default: 0 },
        { name: 'GoPay', icon: '🟢', color: '#22c55e', balance: 0, is_default: 0 },
        { name: 'ShopeePay', icon: '🟠', color: '#f97316', balance: 0, is_default: 0 },
    ];

    for (const w of defaultWallets) {
        await sql`INSERT INTO wallets (name, icon, color, balance, is_default, user_id) VALUES (${w.name}, ${w.icon}, ${w.color}, ${w.balance}, ${w.is_default}, ${userId})`;
    }
}

// Auto-init on first import
let initialized = false;
export async function ensureDB() {
    if (!initialized) {
        await initDB();
        initialized = true;
    }
}
