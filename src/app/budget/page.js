'use client';
import { useState, useEffect } from 'react';
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
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xl">&times;</button>
                </div>
                {children}
            </div>
        </div>
    );
}

export default function BudgetPage() {
    const [budgets, setBudgets] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
    const [form, setForm] = useState({ category_id: '', amount: '' });

    const fetchBudgets = () => {
        authFetch(`/api/budgets?month=${currentMonth}`)
            .then(r => r.json())
            .then(d => { setBudgets(d); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchBudgets();
        authFetch('/api/categories?type=expense').then(r => r.json()).then(setCategories).catch(() => { });
    }, [currentMonth]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        await authFetch('/api/budgets', {
            method: 'POST',
            body: JSON.stringify({ ...form, amount: parseFloat(form.amount), month: currentMonth })
        });
        setShowModal(false);
        setForm({ category_id: '', amount: '' });
        fetchBudgets();
    };

    const handleDelete = async (id) => {
        if (!confirm('Hapus budget ini?')) return;
        await authFetch(`/api/budgets/${id}`, { method: 'DELETE' });
        fetchBudgets();
    };

    const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
    const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

    // Categories not yet budgeted
    const budgetedCategoryIds = budgets.map(b => b.category_id);
    const availableCategories = categories.filter(c => !budgetedCategoryIds.includes(c.id));

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="page-title">Budget</h1>
                    <p className="text-sm text-slate-500">Atur anggaran per kategori</p>
                </div>
                <div className="flex items-center gap-3">
                    <input type="month" className="input-field w-auto" value={currentMonth}
                        onChange={e => setCurrentMonth(e.target.value)} />
                    <button onClick={() => { setForm({ category_id: availableCategories[0]?.id || '', amount: '' }); setShowModal(true); }}
                        className="btn-primary flex items-center gap-2" disabled={availableCategories.length === 0}>
                        <span>+</span> Atur Budget
                    </button>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="stat-card">
                    <p className="text-xs text-slate-400 mb-1">Total Budget</p>
                    <p className="text-xl font-bold text-blue-400">{formatRupiah(totalBudget)}</p>
                </div>
                <div className="stat-card">
                    <p className="text-xs text-slate-400 mb-1">Total Terpakai</p>
                    <p className="text-xl font-bold text-amber-400">{formatRupiah(totalSpent)}</p>
                </div>
                <div className="stat-card">
                    <p className="text-xs text-slate-400 mb-1">Sisa Budget</p>
                    <p className={`text-xl font-bold ${totalBudget - totalSpent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatRupiah(totalBudget - totalSpent)}
                    </p>
                </div>
            </div>

            {/* Budget list */}
            {loading ? (
                <div className="flex items-center justify-center h-32">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : budgets.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <p className="text-4xl mb-3">🎯</p>
                    <p className="text-slate-400">Belum ada budget diatur untuk bulan ini</p>
                    <p className="text-sm text-slate-600 mt-1">Klik "Atur Budget" untuk mulai</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {budgets.map(b => {
                        const pct = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0;
                        const isOver = b.spent > b.amount;
                        const isWarning = pct >= 80 && !isOver;
                        let barColor = b.category_color || '#10b981';
                        if (isOver) barColor = '#ef4444';
                        else if (isWarning) barColor = '#f59e0b';

                        return (
                            <div key={b.id} className="glass-card p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                                            style={{ background: `${b.category_color}20` }}>
                                            {b.category_icon}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-200">{b.category_name}</p>
                                            <p className="text-xs text-slate-500">
                                                {formatRupiah(b.spent)} / {formatRupiah(b.amount)}
                                                {isOver && <span className="text-red-400 ml-1">⚠️ Melebihi!</span>}
                                                {isWarning && <span className="text-amber-400 ml-1">⚠️ Hampir habis</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-sm font-bold ${isOver ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}`}>
                                            {Math.round(pct)}%
                                        </span>
                                        <button onClick={() => handleDelete(b.id)}
                                            className="text-slate-600 hover:text-red-400 transition-colors">🗑️</button>
                                    </div>
                                </div>
                                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.1)' }}>
                                    <div className="h-full rounded-full transition-all duration-700" style={{ background: barColor, width: `${pct}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Atur Budget">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Kategori</label>
                        <select className="input-field" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} required>
                            <option value="">Pilih Kategori</option>
                            {availableCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Budget Bulanan (Rp)</label>
                        <input type="number" className="input-field" placeholder="e.g. 1500000"
                            value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Batal</button>
                        <button type="submit" className="btn-primary flex-1">Simpan</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
