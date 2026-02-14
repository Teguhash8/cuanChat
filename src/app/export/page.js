'use client';
import { useState } from 'react';
import { authFetch } from '@/lib/auth';

function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

export default function ExportPage() {
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await authFetch(`/api/transactions?start_date=${startDate}&end_date=${endDate}&limit=1000`);
            const data = await res.json();
            setPreview(data.transactions || []);
        } catch {
            alert('Gagal memuat data');
        }
        setLoading(false);
    };

    const exportCSV = () => {
        if (!preview || preview.length === 0) return;

        const headers = ['Tanggal', 'Deskripsi', 'Tipe', 'Kategori', 'Dompet', 'Nominal', 'Catatan'];
        const rows = preview.map(tx => [
            tx.date,
            `"${tx.description}"`,
            tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
            tx.category_name || '-',
            tx.wallet_name || '-',
            tx.amount,
            `"${tx.notes || ''}"`,
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const bom = '\uFEFF';
        const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CuanChat_${startDate}_${endDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const totalIncome = (preview || []).filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = (preview || []).filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="page-title">Export Data</h1>
                <p className="text-sm text-slate-500">Download laporan transaksi ke CSV</p>
            </div>

            {/* Filter */}
            <div className="glass-card p-5">
                <h3 className="section-title">Pilih Rentang Tanggal</h3>
                <div className="flex flex-wrap gap-3 items-end">
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Dari</label>
                        <input type="date" className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Sampai</label>
                        <input type="date" className="input-field" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                    <button onClick={fetchData} className="btn-primary flex items-center gap-2" disabled={loading}>
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : '🔍'} Preview Data
                    </button>
                </div>
            </div>

            {/* Preview */}
            {preview && (
                <>
                    {/* Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="stat-card">
                            <p className="text-xs text-slate-400 mb-1">Total Transaksi</p>
                            <p className="text-xl font-bold text-blue-400">{preview.length}</p>
                        </div>
                        <div className="stat-card">
                            <p className="text-xs text-slate-400 mb-1">Total Pemasukan</p>
                            <p className="text-xl font-bold text-emerald-400">{formatRupiah(totalIncome)}</p>
                        </div>
                        <div className="stat-card">
                            <p className="text-xs text-slate-400 mb-1">Total Pengeluaran</p>
                            <p className="text-xl font-bold text-red-400">{formatRupiah(totalExpense)}</p>
                        </div>
                    </div>

                    {/* Export button */}
                    <div className="flex justify-end">
                        <button onClick={exportCSV} className="btn-primary flex items-center gap-2" disabled={preview.length === 0}>
                            📥 Download CSV ({preview.length} transaksi)
                        </button>
                    </div>

                    {/* Table preview */}
                    {preview.length === 0 ? (
                        <div className="glass-card p-12 text-center">
                            <p className="text-4xl mb-3">📭</p>
                            <p className="text-slate-400">Tidak ada transaksi dalam rentang ini</p>
                        </div>
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                                            <th className="text-left p-3 text-slate-400 font-medium">Tanggal</th>
                                            <th className="text-left p-3 text-slate-400 font-medium">Deskripsi</th>
                                            <th className="text-left p-3 text-slate-400 font-medium">Kategori</th>
                                            <th className="text-left p-3 text-slate-400 font-medium">Dompet</th>
                                            <th className="text-right p-3 text-slate-400 font-medium">Nominal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.slice(0, 20).map(tx => (
                                            <tr key={tx.id} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                                                <td className="p-3 text-slate-300">{tx.date}</td>
                                                <td className="p-3 text-slate-200">{tx.description}</td>
                                                <td className="p-3 text-slate-300">{tx.category_icon} {tx.category_name || '-'}</td>
                                                <td className="p-3 text-slate-300">{tx.wallet_icon} {tx.wallet_name || '-'}</td>
                                                <td className={`p-3 text-right font-medium ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {preview.length > 20 && (
                                    <p className="text-xs text-slate-500 p-3 text-center">
                                        Menampilkan 20 dari {preview.length} transaksi. Download CSV untuk data lengkap.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
