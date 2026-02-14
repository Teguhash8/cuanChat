'use client';
import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/auth';

function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors text-xl">&times;</button>
                </div>
                {children}
            </div>
        </div>
    );
}

export default function TransaksiPage() {
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [wallets, setWallets] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTx, setEditingTx] = useState(null);
    const [filters, setFilters] = useState({ search: '', category_id: '', wallet_id: '', type: '' });
    const [form, setForm] = useState({
        description: '', amount: '', type: 'expense', category_id: '', wallet_id: '', date: new Date().toISOString().split('T')[0], notes: ''
    });

    const fetchTransactions = useCallback(() => {
        const params = new URLSearchParams();
        if (filters.search) params.set('search', filters.search);
        if (filters.category_id) params.set('category_id', filters.category_id);
        if (filters.wallet_id) params.set('wallet_id', filters.wallet_id);
        if (filters.type) params.set('type', filters.type);
        params.set('limit', '100');

        authFetch(`/api/transactions?${params}`)
            .then(r => r.json())
            .then(d => { setTransactions(d.transactions || []); setTotal(d.total || 0); setLoading(false); })
            .catch(() => setLoading(false));
    }, [filters]);

    useEffect(() => {
        fetchTransactions();
        authFetch('/api/categories').then(r => r.json()).then(setCategories).catch(() => { });
        authFetch('/api/wallets').then(r => r.json()).then(setWallets).catch(() => { });
    }, [fetchTransactions]);

    const openAddModal = () => {
        setEditingTx(null);
        setForm({ description: '', amount: '', type: 'expense', category_id: '', wallet_id: '', date: new Date().toISOString().split('T')[0], notes: '' });
        setShowModal(true);
    };

    const openEditModal = (tx) => {
        setEditingTx(tx);
        setForm({
            description: tx.description, amount: tx.amount, type: tx.type,
            category_id: tx.category_id || '', wallet_id: tx.wallet_id || '',
            date: tx.date, notes: tx.notes || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const body = { ...form, amount: parseFloat(form.amount), category_id: form.category_id || null, wallet_id: form.wallet_id || null };
        const url = editingTx ? `/api/transactions/${editingTx.id}` : '/api/transactions';
        const method = editingTx ? 'PUT' : 'POST';
        await authFetch(url, { method, body: JSON.stringify(body) });
        setShowModal(false);
        fetchTransactions();
    };

    const handleDelete = async (id) => {
        if (!confirm('Hapus transaksi ini?')) return;
        await authFetch(`/api/transactions/${id}`, { method: 'DELETE' });
        fetchTransactions();
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="page-title">Transaksi</h1>
                    <p className="text-sm text-slate-500">{total} transaksi ditemukan</p>
                </div>
                <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
                    <span>+</span> Tambah Transaksi
                </button>
            </div>

            {/* Filters */}
            <div className="glass-card p-4 flex flex-wrap gap-3">
                <input
                    type="text" placeholder="🔍 Cari transaksi..."
                    className="input-field flex-1 min-w-[200px]"
                    value={filters.search}
                    onChange={e => setFilters({ ...filters, search: e.target.value })}
                />
                <select className="input-field w-auto min-w-[140px]" value={filters.type}
                    onChange={e => setFilters({ ...filters, type: e.target.value })}>
                    <option value="">Semua Tipe</option>
                    <option value="expense">Pengeluaran</option>
                    <option value="income">Pemasukan</option>
                </select>
                <select className="input-field w-auto min-w-[160px]" value={filters.category_id}
                    onChange={e => setFilters({ ...filters, category_id: e.target.value })}>
                    <option value="">Semua Kategori</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
                <select className="input-field w-auto min-w-[140px]" value={filters.wallet_id}
                    onChange={e => setFilters({ ...filters, wallet_id: e.target.value })}>
                    <option value="">Semua Dompet</option>
                    {wallets.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
                </select>
            </div>

            {/* Transaction list */}
            {loading ? (
                <div className="flex items-center justify-center h-32">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : transactions.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <p className="text-4xl mb-3">📝</p>
                    <p className="text-slate-400">Belum ada transaksi</p>
                    <p className="text-sm text-slate-600 mt-1">Mulai dengan menambahkan transaksi pertamamu</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {transactions.map(tx => (
                        <div key={tx.id} className="glass-card-hover p-4 flex items-center gap-3 cursor-pointer" onClick={() => openEditModal(tx)}>
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                                style={{ background: `${tx.category_color || '#64748b'}20` }}>
                                {tx.category_icon || '📦'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-200 truncate">{tx.description}</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {tx.category_name || '-'} • {tx.wallet_icon || '💳'} {tx.wallet_name || '-'} • {tx.date}
                                    {tx.source === 'chat' && <span className="ml-1 text-emerald-500">💬</span>}
                                </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className={`text-sm font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                                </p>
                            </div>
                            <button onClick={e => { e.stopPropagation(); handleDelete(tx.id); }}
                                className="text-slate-600 hover:text-red-400 transition-colors p-1 flex-shrink-0" title="Hapus">
                                🗑️
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingTx ? 'Edit Transaksi' : 'Tambah Transaksi'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Deskripsi</label>
                        <input type="text" className="input-field" placeholder="e.g. Nasi goreng"
                            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Nominal (Rp)</label>
                            <input type="number" className="input-field" placeholder="0"
                                value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Tipe</label>
                            <select className="input-field" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                <option value="expense">Pengeluaran</option>
                                <option value="income">Pemasukan</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Kategori</label>
                            <select className="input-field" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                                <option value="">Pilih Kategori</option>
                                {categories.filter(c => c.type === form.type).map(c =>
                                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                )}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Dompet</label>
                            <select className="input-field" value={form.wallet_id} onChange={e => setForm({ ...form, wallet_id: e.target.value })}>
                                <option value="">Pilih Dompet</option>
                                {wallets.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Tanggal</label>
                        <input type="date" className="input-field" value={form.date}
                            onChange={e => setForm({ ...form, date: e.target.value })} />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Catatan (opsional)</label>
                        <input type="text" className="input-field" placeholder="Catatan tambahan"
                            value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Batal</button>
                        <button type="submit" className="btn-primary flex-1">{editingTx ? 'Simpan' : 'Tambah'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
