/**
 * Unit tests for chat message parsing (transaction detection)
 * Tests the core NLP-like parsing logic that converts natural language to transactions
 */

// Mock the database module before requiring chat
jest.mock('../server/db', () => {
    const mockCategories = [
        { id: 1, name: 'Makanan & Minuman', icon: '🍔', color: '#ef4444', type: 'expense' },
        { id: 2, name: 'Transportasi', icon: '🚕', color: '#f59e0b', type: 'expense' },
        { id: 3, name: 'Belanja', icon: '🛒', color: '#8b5cf6', type: 'expense' },
        { id: 4, name: 'Hiburan', icon: '🎮', color: '#ec4899', type: 'expense' },
        { id: 5, name: 'Tagihan', icon: '📄', color: '#06b6d4', type: 'expense' },
        { id: 6, name: 'Kesehatan', icon: '💊', color: '#14b8a6', type: 'expense' },
        { id: 7, name: 'Pendidikan', icon: '📚', color: '#6366f1', type: 'expense' },
        { id: 8, name: 'Lainnya', icon: '📦', color: '#64748b', type: 'expense' },
        { id: 9, name: 'Gaji', icon: '💰', color: '#10b981', type: 'income' },
    ];
    const mockWallets = [
        { id: 1, name: 'Tunai', icon: '💵', balance: 500000, is_default: 1 },
        { id: 2, name: 'BCA', icon: '🏦', balance: 2500000, is_default: 0 },
        { id: 3, name: 'OVO', icon: '🟣', balance: 350000, is_default: 0 },
        { id: 4, name: 'GoPay', icon: '🟢', balance: 200000, is_default: 0 },
        { id: 5, name: 'ShopeePay', icon: '🟠', balance: 150000, is_default: 0 },
    ];

    return {
        queryAll: jest.fn((sql, params) => {
            if (sql.includes('categories')) return mockCategories.filter(c => c.type === params[0]);
            if (sql.includes('wallets')) return mockWallets;
            return [];
        }),
        queryOne: jest.fn((sql, params) => {
            if (sql.includes('budgets')) {
                return { amount: 1000000, spent: 600000 };
            }
            if (sql.includes('SUM')) {
                return { income: 5000000, expense: 3000000 };
            }
            return null;
        }),
        run: jest.fn(() => ({ lastInsertRowid: 1 })),
    };
});

const { handleTransactionParse, parseMessage, handleBudgetQuery, handleSummaryQuery, handleBalanceQuery } = require('../server/routes/chat');

describe('Chat Transaction Parsing', () => {
    const userId = 1;

    // ── Amount Detection ──
    describe('Amount Detection', () => {
        test('detects "rb" suffix (ribu)', () => {
            const result = handleTransactionParse('nasi goreng 15rb', 'Nasi goreng 15rb', userId);
            expect(result.type).toBe('transaction');
            expect(result.data.amount).toBe(15000);
        });

        test('detects "k" suffix', () => {
            const result = handleTransactionParse('grab 24k', 'Grab 24k', userId);
            expect(result.type).toBe('transaction');
            expect(result.data.amount).toBe(24000);
        });

        test('detects "ribu" suffix', () => {
            const result = handleTransactionParse('kopi 25 ribu', 'Kopi 25 ribu', userId);
            expect(result.type).toBe('transaction');
            expect(result.data.amount).toBe(25000);
        });

        test('detects "jt" / "juta" suffix', () => {
            // Indonesian uses comma as decimal: 1,5jt = 1.500.000
            const result = handleTransactionParse('bayar 1,5jt', 'Bayar 1,5jt', userId);
            expect(result.type).toBe('transaction');
            expect(result.data.amount).toBe(1500000);
        });

        test('detects "Rp" prefix format', () => {
            const result = handleTransactionParse('makan rp25.000', 'Makan Rp25.000', userId);
            expect(result.type).toBe('transaction');
            expect(result.data.amount).toBe(25000);
        });

        test('detects raw large number (4+ digits)', () => {
            const result = handleTransactionParse('makan 50000', 'Makan 50000', userId);
            expect(result.type).toBe('transaction');
            expect(result.data.amount).toBe(50000);
        });

        test('returns error when no amount found', () => {
            const result = handleTransactionParse('halo apa kabar', 'Halo apa kabar', userId);
            expect(result.type).toBe('error');
            expect(result.response).toContain('Nominal tidak terdeteksi');
        });
    });

    // ── Category Detection ──
    describe('Category Detection', () => {
        test('detects food category from keyword "nasi"', () => {
            const result = handleTransactionParse('nasi goreng 15rb', 'Nasi goreng 15rb', userId);
            expect(result.data.category_name).toBe('Makanan & Minuman');
        });

        test('detects food category from keyword "kopi"', () => {
            const result = handleTransactionParse('kopi 25rb', 'Kopi 25rb', userId);
            expect(result.data.category_name).toBe('Makanan & Minuman');
        });

        test('detects transport category from keyword "grab"', () => {
            const result = handleTransactionParse('grab 24k', 'Grab 24k', userId);
            expect(result.data.category_name).toBe('Transportasi');
        });

        test('detects transport category from keyword "bensin"', () => {
            const result = handleTransactionParse('bensin pertalite 50rb', 'Bensin pertalite 50rb', userId);
            expect(result.data.category_name).toBe('Transportasi');
        });

        test('detects shopping category from keyword "belanja"', () => {
            const result = handleTransactionParse('belanja 100rb', 'Belanja 100rb', userId);
            expect(result.data.category_name).toBe('Belanja');
        });

        test('detects bill category from keyword "listrik"', () => {
            const result = handleTransactionParse('listrik 200rb', 'Listrik 200rb', userId);
            expect(result.data.category_name).toBe('Tagihan');
        });

        test('falls back to "Lainnya" when no keyword matched', () => {
            const result = handleTransactionParse('random 50rb', 'Random 50rb', userId);
            expect(result.data.category_name).toBe('Lainnya');
        });
    });

    // ── Wallet Detection ──
    describe('Wallet Detection', () => {
        test('detects GoPay wallet', () => {
            const result = handleTransactionParse('makan 15rb gopay', 'Makan 15rb gopay', userId);
            expect(result.data.wallet_name).toBe('GoPay');
        });

        test('detects OVO wallet', () => {
            const result = handleTransactionParse('kopi 25rb ovo', 'Kopi 25rb ovo', userId);
            expect(result.data.wallet_name).toBe('OVO');
        });

        test('detects Tunai/cash wallet', () => {
            const result = handleTransactionParse('makan 15rb tunai', 'Makan 15rb tunai', userId);
            expect(result.data.wallet_name).toBe('Tunai');
        });

        test('detects BCA from "transfer" keyword', () => {
            const result = handleTransactionParse('bayar 100rb transfer', 'Bayar 100rb transfer', userId);
            expect(result.data.wallet_name).toBe('BCA');
        });

        test('defaults to default wallet when no wallet keyword found', () => {
            const result = handleTransactionParse('makan 15rb', 'Makan 15rb', userId);
            expect(result.data.wallet_name).toBe('Tunai'); // is_default = 1
        });
    });

    // ── Description Extraction ──
    describe('Description Extraction', () => {
        test('extracts description from message', () => {
            const result = handleTransactionParse('nasi goreng 15rb', 'Nasi goreng 15rb', userId);
            expect(result.data.description).toBeTruthy();
            expect(result.data.description.length).toBeGreaterThan(0);
        });

        test('capitalizes first letter of description', () => {
            const result = handleTransactionParse('kopi susu 25rb', 'kopi susu 25rb', userId);
            expect(result.data.description[0]).toMatch(/[A-Z]/);
        });
    });

    // ── Transaction Type ──
    describe('Transaction Type', () => {
        test('defaults to expense type', () => {
            const result = handleTransactionParse('makan 15rb', 'Makan 15rb', userId);
            expect(result.data.type).toBe('expense');
        });
    });
});

// ── Query Detection (parseMessage routing) ──
describe('Chat Message Routing', () => {
    const userId = 1;

    test('routes budget query correctly', () => {
        const result = parseMessage('sisa budget makan?', userId);
        expect(result.type).toBe('query');
        expect(result.response).toContain('Budget');
    });

    test('routes summary query correctly', () => {
        const result = parseMessage('total pengeluaran bulan ini', userId);
        expect(result.type).toBe('query');
        expect(result.response).toContain('Ringkasan');
    });

    test('routes balance query correctly', () => {
        const result = parseMessage('cek saldo', userId);
        expect(result.type).toBe('query');
        expect(result.response).toContain('Saldo');
    });

    test('routes transaction message correctly', () => {
        const result = parseMessage('Nasi goreng 15rb', userId);
        expect(result.type).toBe('transaction');
    });
});

// ── Budget Query ──
describe('Budget Query', () => {
    const userId = 1;

    test('returns budget info for matched category', () => {
        const result = handleBudgetQuery('sisa budget makan', userId);
        expect(result.type).toBe('query');
        expect(result.response).toContain('Budget');
        expect(result.response).toContain('Anggaran');
    });

    test('asks for category when none specified', () => {
        const result = handleBudgetQuery('sisa budget', userId);
        expect(result.type).toBe('query');
        expect(result.response).toContain('Kategori mana');
    });
});

// ── Summary Query ──
describe('Summary Query', () => {
    const userId = 1;

    test('returns monthly summary', () => {
        const result = handleSummaryQuery(userId);
        expect(result.type).toBe('query');
        expect(result.response).toContain('Ringkasan');
        expect(result.response).toContain('Pemasukan');
        expect(result.response).toContain('Pengeluaran');
    });
});

// ── Balance Query ──
describe('Balance Query', () => {
    const userId = 1;

    test('returns wallet balances', () => {
        const result = handleBalanceQuery(userId);
        expect(result.type).toBe('query');
        expect(result.response).toContain('Saldo');
        expect(result.response).toContain('Total');
    });
});
