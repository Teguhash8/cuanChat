'use client';
import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { authFetch } from '@/lib/auth';

function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

const ACCENT_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

function StatCard({ icon, label, value, color, delay }) {
    return (
        <div className="stat-card" style={{ animationDelay: `${delay}ms` }}>
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                    style={{ background: `${color}20` }}>
                    {icon}
                </div>
                <p className="text-xs text-slate-400 font-medium">{label}</p>
            </div>
            <p className="text-xl font-bold" style={{ color }}>{value}</p>
        </div>
    );
}

function CustomTooltip({ active, payload, label }) {
    if (active && payload && payload.length) {
        return (
            <div className="glass-card p-3 text-xs">
                <p className="text-slate-400 mb-1">{label}</p>
                {payload.map((entry, i) => (
                    <p key={i} style={{ color: entry.color }}>
                        {entry.name}: {formatRupiah(entry.value)}
                    </p>
                ))}
            </div>
        );
    }
    return null;
}

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        authFetch('/api/dashboard/summary')
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!data) {
        return <div className="text-center text-slate-400 py-20">Gagal memuat data</div>;
    }

    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const trendData = data.monthly_trend.map(m => ({
        ...m,
        name: monthNames[parseInt(m.month.split('-')[1]) - 1]?.substring(0, 3) || m.month,
    }));

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="page-title">Dashboard</h1>
                <p className="text-sm text-slate-500">Ringkasan keuangan bulan ini</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon="💰" label="Total Saldo" value={formatRupiah(data.total_balance)} color="#10b981" delay={0} />
                <StatCard icon="📈" label="Pemasukan" value={formatRupiah(data.total_income)} color="#22c55e" delay={50} />
                <StatCard icon="📉" label="Pengeluaran" value={formatRupiah(data.total_expense)} color="#ef4444" delay={100} />
                <StatCard icon="📝" label="Transaksi" value={data.total_transactions} color="#3b82f6" delay={150} />
            </div>

            {/* Budget Alerts */}
            {data.budget_alerts && data.budget_alerts.length > 0 && (
                <div className="glass-card p-4 border-l-4" style={{ borderLeftColor: '#f59e0b' }}>
                    <div className="flex items-center gap-2 mb-2">
                        <span>⚠️</span>
                        <span className="text-sm font-semibold text-amber-400">Budget Alert</span>
                    </div>
                    {data.budget_alerts.map((alert, i) => (
                        <p key={i} className="text-sm text-slate-300">
                            {alert.category_icon} {alert.category_name}: {formatRupiah(alert.spent)} / {formatRupiah(alert.amount)} ({Math.round(alert.spent / alert.amount * 100)}%)
                        </p>
                    ))}
                </div>
            )}

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <div className="glass-card p-5">
                    <h3 className="section-title">Pengeluaran per Kategori</h3>
                    {data.category_breakdown.length === 0 ? (
                        <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
                            Belum ada transaksi bulan ini
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="w-48 h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data.category_breakdown}
                                            dataKey="total"
                                            nameKey="name"
                                            cx="50%" cy="50%"
                                            innerRadius={40} outerRadius={80}
                                            paddingAngle={3}
                                            stroke="none"
                                        >
                                            {data.category_breakdown.map((entry, i) => (
                                                <Cell key={i} fill={entry.color || ACCENT_COLORS[i % ACCENT_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex-1 space-y-2">
                                {data.category_breakdown.map((cat, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ background: cat.color || ACCENT_COLORS[i] }} />
                                            <span className="text-slate-300">{cat.icon} {cat.name}</span>
                                        </div>
                                        <span className="text-slate-400 font-medium">{formatRupiah(cat.total)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Line Chart */}
                <div className="glass-card p-5">
                    <h3 className="section-title">Tren Bulanan</h3>
                    {trendData.length === 0 ? (
                        <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
                            Belum ada data tren
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                                <Line type="monotone" dataKey="income" name="Pemasukan" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 4 }} />
                                <Line type="monotone" dataKey="expense" name="Pengeluaran" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="section-title mb-0">Transaksi Terbaru</h3>
                    <a href="/transaksi" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                        Lihat Semua →
                    </a>
                </div>
                {data.recent_transactions.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">Belum ada transaksi. Mulai catat di menu Chat! 💬</p>
                ) : (
                    <div className="space-y-3">
                        {data.recent_transactions.map((tx) => (
                            <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                                    style={{ background: `${tx.category_color || '#64748b'}20` }}>
                                    {tx.category_icon || '📦'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-200 truncate">{tx.description}</p>
                                    <p className="text-xs text-slate-500">
                                        {tx.category_name || 'Uncategorized'} • {tx.wallet_icon} {tx.wallet_name || '-'} • {tx.date}
                                    </p>
                                </div>
                                <p className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
