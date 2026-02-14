'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getToken, getUser, logout } from '@/lib/auth';
import './globals.css';

const navItems = [
    { href: '/', icon: '📊', label: 'Dashboard' },
    { href: '/transaksi', icon: '💸', label: 'Transaksi' },
    { href: '/kategori', icon: '🏷️', label: 'Kategori' },
    { href: '/dompet', icon: '👛', label: 'Dompet' },
    { href: '/budget', icon: '🎯', label: 'Budget' },
    { href: '/chat', icon: '💬', label: 'Chat' },
    { href: '/export', icon: '📤', label: 'Export' },
];

export default function RootLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);
    const [user, setUser] = useState(null);
    const pathname = usePathname();
    const router = useRouter();

    const isAuthPage = pathname === '/login' || pathname === '/register';

    useEffect(() => {
        const token = getToken();
        const userData = getUser();
        if (!token && !isAuthPage) {
            router.push('/login');
        } else if (token && isAuthPage) {
            router.push('/');
        } else {
            setUser(userData);
            setAuthChecked(true);
        }
    }, [pathname]);

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    // Auth pages render without layout
    if (isAuthPage) {
        return (
            <html lang="id">
                <body className="bg-[#0a0a0a] m-0">{children}</body>
            </html>
        );
    }

    if (!authChecked) {
        return (
            <html lang="id">
                <body className="bg-[#0a0a0a] text-white flex items-center justify-center min-h-screen m-0">
                    <div className="text-center">
                        <div className="text-4xl mb-4 animate-pulse">💰</div>
                        <p className="text-slate-400">Memuat CuanChat...</p>
                    </div>
                </body>
            </html>
        );
    }

    const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <html lang="id">
            <body className="bg-[#0a0a0a] text-white font-sans m-0">
                {/* Mobile overlay */}
                {sidebarOpen && (
                    <div 
                        onClick={() => setSidebarOpen(false)} 
                        className="fixed inset-0 bg-black/60 z-40 md:hidden"
                    />
                )}

                {/* Sidebar */}
                <aside className={`
                    fixed top-0 left-0 bottom-0 w-[260px]
                    bg-[#0f0f19]/95 backdrop-blur-xl border-r border-white/10
                    z-50 transition-transform duration-300 ease-in-out
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}>
                    {/* Logo */}
                    <div className="px-6 py-6 mb-4">
                        <div className="text-2xl font-extrabold bg-gradient-to-br from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                            💰 CuanChat
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Smart Finance Tracker</p>
                    </div>

                    {/* Navigation */}
                    <nav className="px-3 space-y-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <a 
                                    key={item.href} 
                                    href={item.href}
                                    className={`
                                        flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 no-underline
                                        ${isActive 
                                            ? 'bg-gradient-to-br from-emerald-500/15 to-cyan-500/15 text-emerald-400 border-l-2 border-emerald-500 ' 
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-l-2 border-transparent'}
                                    `}
                                >
                                    <span className="text-xl">{item.icon}</span>
                                    <span className={`text-sm ${isActive ? 'font-semibold' : 'font-normal'}`}>{item.label}</span>
                                </a>
                            );
                        })}
                    </nav>

                    {/* User Info & Logout */}
                    <div className="absolute bottom-4 left-0 right-0 px-4">
                        <div className="bg-white/5 rounded-xl p-3 flex items-center justify-between border border-white/5">
                            <div className="overflow-hidden">
                                <div className="text-sm font-semibold text-slate-200 truncate">
                                    {user?.name || 'User'}
                                </div>
                                <div className="text-xs text-slate-500 truncate">{user?.email || ''}</div>
                            </div>
                            <button onClick={logout}
                                className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-colors"
                                title="Logout">
                                🚪
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex flex-col min-h-screen transition-[margin] duration-300 md:ml-[260px]">
                    {/* Header */}
                    <header className="sticky top-0 z-30 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5 px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {/* Mobile hamburger */}
                            <button 
                                onClick={() => setSidebarOpen(true)}
                                className="md:hidden text-2xl text-white p-1 -ml-2"
                            >
                                ☰
                            </button>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-200 m-0">
                                    {navItems.find(n => n.href === pathname)?.label || 'CuanChat'}
                                </h2>
                                <p className="text-xs text-slate-500 m-0 hidden sm:block">{today}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-400">👋 Halo, <span className="hidden sm:inline">{user?.name?.split(' ')[0] || 'User'}</span></span>
                        </div>
                    </header>

                    {/* Page content */}
                    <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    );
}
