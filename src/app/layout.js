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

    // Auth pages render without layout
    if (isAuthPage) {
        return (
            <html lang="id"><body style={{ margin: 0, background: '#0a0a0a' }}>{children}</body></html>
        );
    }

    if (!authChecked) {
        return (
            <html lang="id"><body style={{ margin: 0, background: '#0a0a0a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'pulse 1.5s infinite' }}>💰</div>
                    <p style={{ color: '#94a3b8' }}>Memuat CuanChat...</p>
                </div>
            </body></html>
        );
    }

    const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <html lang="id">
            <body style={{ margin: 0, background: '#0a0a0a', color: '#fff', fontFamily: "'Inter', system-ui, sans-serif" }}>
                {/* Mobile overlay */}
                {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }} />}

                {/* Sidebar */}
                <aside style={{
                    position: 'fixed', top: 0, left: 0, bottom: 0, width: '260px',
                    background: 'rgba(15,15,25,0.95)', backdropFilter: 'blur(20px)',
                    borderRight: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem 0',
                    zIndex: 50, transition: 'transform 0.3s ease',
                    transform: sidebarOpen ? 'translateX(0)' : (typeof window !== 'undefined' && window.innerWidth < 768 ? 'translateX(-100%)' : 'translateX(0)'),
                }}>
                    {/* Logo */}
                    <div style={{ padding: '0 1.5rem', marginBottom: '2rem' }}>
                        <div style={{
                            fontSize: '1.5rem', fontWeight: '800',
                            background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>💰 CuanChat</div>
                        <p style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.25rem' }}>Smart Finance Tracker</p>
                    </div>

                    {/* Navigation */}
                    <nav style={{ padding: '0 0.75rem' }}>
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <a key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        padding: '0.75rem 1rem', borderRadius: '12px', marginBottom: '0.25rem',
                                        textDecoration: 'none', transition: 'all 0.2s',
                                        background: isActive ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.15))' : 'transparent',
                                        color: isActive ? '#10b981' : '#94a3b8',
                                        borderLeft: isActive ? '3px solid #10b981' : '3px solid transparent',
                                    }}>
                                    <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: isActive ? '600' : '400' }}>{item.label}</span>
                                </a>
                            );
                        })}
                    </nav>

                    {/* User Info & Logout */}
                    <div style={{ position: 'absolute', bottom: '1rem', left: 0, right: 0, padding: '0 1rem' }}>
                        <div style={{
                            background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.75rem 1rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#e2e8f0' }}>
                                    {user?.name || 'User'}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{user?.email || ''}</div>
                            </div>
                            <button onClick={logout}
                                style={{
                                    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.2)',
                                    borderRadius: '8px', padding: '0.4rem 0.6rem', cursor: 'pointer',
                                    color: '#ef4444', fontSize: '0.8rem',
                                }}
                                title="Logout">🚪</button>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <div style={{ marginLeft: '260px', minHeight: '100vh' }}>
                    {/* Header */}
                    <header style={{
                        position: 'sticky', top: 0, zIndex: 30,
                        background: 'rgba(10,10,10,0.8)', backdropFilter: 'blur(15px)',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.75rem 1.5rem',
                    }}>
                        {/* Mobile hamburger */}
                        <button onClick={() => setSidebarOpen(true)}
                            className="mobile-only"
                            style={{
                                display: 'none', background: 'none', border: 'none', color: '#fff',
                                fontSize: '1.5rem', cursor: 'pointer', padding: '0.25rem',
                            }}>☰</button>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#e2e8f0' }}>
                                {navItems.find(n => n.href === pathname)?.label || 'CuanChat'}
                            </h2>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{today}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>👋 Halo, {user?.name?.split(' ')[0] || 'User'}</span>
                        </div>
                    </header>

                    {/* Page content */}
                    <main style={{ padding: '1.5rem' }}>{children}</main>
                </div>

                <style>{`
          @media (max-width: 768px) {
            .mobile-only { display: block !important; }
            body > div:last-child > div { margin-left: 0 !important; }
          }
        `}</style>
            </body>
        </html>
    );
}
