'use client';
import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/auth';

function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

const WALLET_ICONS = ['💵', '🏦', '💳', '🟣', '🟢', '🟠', '🔵', '🟡', '📱', '💎'];
const COLOR_OPTIONS = ['#22c55e', '#0066AE', '#4C2A86', '#00AED6', '#EE4D2D', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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

export default function DompetPage() {
    const [wallets, setWallets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [privacyMode, setPrivacyMode] = useState(false);
    const [form, setForm] = useState({ name: '', icon: '💳', color: '#3b82f6', balance: 0 });

    const fetchWallets = () => {
        authFetch('/api/wallets').then(r => r.json()).then(d => { setWallets(d); setLoading(false); }).catch(() => setLoading(false));
    };

    useEffect(() => { fetchWallets(); }, []);

    const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

    const openAdd = () => {
        setEditing(null);
        setForm({ name: '', icon: '💳', color: '#3b82f6', balance: 0 });
        setShowModal(true);
    };

    const openEdit = (w) => {
        setEditing(w);
        setForm({ name: w.name, icon: w.icon, color: w.color, balance: w.balance });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = editing ? `/api/wallets/${editing.id}` : '/api/wallets';
        const method = editing ? 'PUT' : 'POST';
        await authFetch(url, { method, body: JSON.stringify({ ...form, balance: parseFloat(form.balance) }) });
        setShowModal(false);
        fetchWallets();
    };

    const handleDelete = async (id) => {
        if (!confirm('Hapus dompet ini?')) return;
        await authFetch(`/api/wallets/${id}`, { method: 'DELETE' });
        fetchWallets();
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="page-title">Dompet</h1>
                    <p className="text-sm text-slate-500">Kelola multi-wallet kamu</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setPrivacyMode(!privacyMode)}
                        className={`btn-secondary flex items-center gap-2 text-xs ${privacyMode ? 'ring-1 ring-emerald-500' : ''}`}>
                        {privacyMode ? '🔒' : '👁️'} {privacyMode ? 'Mode Privasi ON' : 'Mode Privasi'}
                    </button>
                    <button onClick={openAdd} className="btn-primary flex items-center gap-2">
                        <span>+</span> Tambah Dompet
                    </button>
                </div>
            </div>

            {/* Total Balance */}
            <div className="glass-card gradient-border p-6 text-center">
                <p className="text-sm text-slate-400 mb-1">Total Saldo Semua Dompet</p>
                <p className={`text-3xl font-bold text-emerald-400 ${privacyMode ? 'privacy-blur' : ''}`}>
                    {formatRupiah(totalBalance)}
                </p>
            </div>

            {/* Wallet Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-32">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {wallets.map(w => (
                        <div key={w.id} className="glass-card-hover p-5 cursor-pointer" onClick={() => openEdit(w)}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                                        style={{ background: `${w.color}20` }}>
                                        {w.icon}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-200">{w.name}</p>
                                        {w.is_default === 1 && (
                                            <span className="text-[10px] font-medium text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded-full">Default</span>
                                        )}
                                    </div>
                                </div>
                                <button onClick={e => { e.stopPropagation(); handleDelete(w.id); }}
                                    className="text-slate-600 hover:text-red-400 transition-colors">🗑️</button>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Saldo</p>
                                <p className={`text-xl font-bold ${w.balance >= 0 ? 'text-emerald-400' : 'text-red-400'} ${privacyMode ? 'privacy-blur' : ''}`}>
                                    {formatRupiah(w.balance)}
                                </p>
                            </div>
                            <div className="mt-3 w-full h-1 rounded-full overflow-hidden" style={{ background: `${w.color}20` }}>
                                <div className="h-full rounded-full transition-all duration-500"
                                    style={{ background: w.color, width: totalBalance > 0 ? `${Math.max(5, (w.balance / totalBalance) * 100)}%` : '5%' }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Dompet' : 'Tambah Dompet'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Nama Dompet</label>
                        <input type="text" className="input-field" placeholder="e.g. DANA"
                            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Saldo Awal (Rp)</label>
                        <input type="number" className="input-field" placeholder="0"
                            value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-2 block">Icon</label>
                        <div className="flex flex-wrap gap-2">
                            {WALLET_ICONS.map(icon => (
                                <button key={icon} type="button" onClick={() => setForm({ ...form, icon })}
                                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all
                    ${form.icon === icon ? 'ring-2 ring-emerald-400 bg-emerald-900/30' : 'bg-slate-800/50 hover:bg-slate-700/50'}`}>
                                    {icon}
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
