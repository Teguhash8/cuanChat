'use client';
import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/auth';

const EMOJI_OPTIONS = ['🍔', '🚕', '🛒', '🎮', '📄', '💊', '📚', '📦', '💰', '💻', '📈', '🏠', '👕', '🐶', '🎵', '⚽', '✈️', '💡', '🎨', '🔧'];
const COLOR_OPTIONS = ['#ef4444', '#f59e0b', '#22c55e', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b'];

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

export default function KategoriPage() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', icon: '📦', color: '#10b981', type: 'expense' });

    const fetchCategories = () => {
        authFetch('/api/categories').then(r => r.json()).then(d => { setCategories(d); setLoading(false); }).catch(() => setLoading(false));
    };

    useEffect(() => { fetchCategories(); }, []);

    const openAdd = () => {
        setEditing(null);
        setForm({ name: '', icon: '📦', color: '#10b981', type: 'expense' });
        setShowModal(true);
    };

    const openEdit = (cat) => {
        setEditing(cat);
        setForm({ name: cat.name, icon: cat.icon, color: cat.color, type: cat.type });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = editing ? `/api/categories/${editing.id}` : '/api/categories';
        const method = editing ? 'PUT' : 'POST';
        await authFetch(url, { method, body: JSON.stringify(form) });
        setShowModal(false);
        fetchCategories();
    };

    const handleDelete = async (id) => {
        if (!confirm('Hapus kategori ini? Transaksi terkait akan menjadi uncategorized.')) return;
        await authFetch(`/api/categories/${id}`, { method: 'DELETE' });
        fetchCategories();
    };

    const expenseCategories = categories.filter(c => c.type === 'expense');
    const incomeCategories = categories.filter(c => c.type === 'income');

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="page-title">Kategori</h1>
                    <p className="text-sm text-slate-500">Kelola kategori pengeluaran & pemasukan</p>
                </div>
                <button onClick={openAdd} className="btn-primary flex items-center gap-2">
                    <span>+</span> Tambah Kategori
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-32">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* Expense categories */}
                    <div>
                        <h3 className="section-title">💸 Pengeluaran</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {expenseCategories.map(cat => (
                                <div key={cat.id} className="glass-card-hover p-4 flex items-center gap-3 cursor-pointer" onClick={() => openEdit(cat)}>
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                                        style={{ background: `${cat.color}20` }}>
                                        {cat.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-200 truncate">{cat.name}</p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <div className="w-3 h-3 rounded-full" style={{ background: cat.color }} />
                                            <span className="text-xs text-slate-500">{cat.type}</span>
                                        </div>
                                    </div>
                                    <button onClick={e => { e.stopPropagation(); handleDelete(cat.id); }}
                                        className="text-slate-600 hover:text-red-400 transition-colors p-1">🗑️</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Income categories */}
                    <div>
                        <h3 className="section-title">💰 Pemasukan</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {incomeCategories.map(cat => (
                                <div key={cat.id} className="glass-card-hover p-4 flex items-center gap-3 cursor-pointer" onClick={() => openEdit(cat)}>
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                                        style={{ background: `${cat.color}20` }}>
                                        {cat.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-200 truncate">{cat.name}</p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <div className="w-3 h-3 rounded-full" style={{ background: cat.color }} />
                                            <span className="text-xs text-slate-500">{cat.type}</span>
                                        </div>
                                    </div>
                                    <button onClick={e => { e.stopPropagation(); handleDelete(cat.id); }}
                                        className="text-slate-600 hover:text-red-400 transition-colors p-1">🗑️</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Kategori' : 'Tambah Kategori'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Nama Kategori</label>
                        <input type="text" className="input-field" placeholder="e.g. Hobi Gundam"
                            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Tipe</label>
                        <select className="input-field" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                            <option value="expense">Pengeluaran</option>
                            <option value="income">Pemasukan</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-2 block">Icon</label>
                        <div className="flex flex-wrap gap-2">
                            {EMOJI_OPTIONS.map(emoji => (
                                <button key={emoji} type="button" onClick={() => setForm({ ...form, icon: emoji })}
                                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all
                    ${form.icon === emoji ? 'ring-2 ring-emerald-400 bg-emerald-900/30' : 'bg-slate-800/50 hover:bg-slate-700/50'}`}>
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-2 block">Warna</label>
                        <div className="flex flex-wrap gap-2">
                            {COLOR_OPTIONS.map(color => (
                                <button key={color} type="button" onClick={() => setForm({ ...form, color })}
                                    className={`w-8 h-8 rounded-full transition-all ${form.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110' : 'hover:scale-105'}`}
                                    style={{ background: color }} />
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Batal</button>
                        <button type="submit" className="btn-primary flex-1">{editing ? 'Simpan' : 'Tambah'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
