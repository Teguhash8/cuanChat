'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            router.push('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
            padding: '1rem',
        }}>
            <div style={{
                width: '100%', maxWidth: '420px',
                background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
                borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)',
                padding: '3rem 2.5rem', boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        fontSize: '3rem', marginBottom: '0.5rem',
                        background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        fontWeight: '800',
                    }}>💰 CuanChat</div>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Kelola keuangan dengan mudah</p>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1.5rem',
                        color: '#ef4444', fontSize: '0.875rem',
                    }}>⚠️ {error}</div>
                )}

                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '500' }}>Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                            placeholder="nama@email.com"
                            style={{
                                width: '100%', padding: '0.875rem 1rem', borderRadius: '12px',
                                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                                color: '#fff', fontSize: '0.95rem', outline: 'none', transition: 'border 0.2s',
                                boxSizing: 'border-box',
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#10b981'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '500' }}>Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                            placeholder="Masukkan password"
                            style={{
                                width: '100%', padding: '0.875rem 1rem', borderRadius: '12px',
                                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                                color: '#fff', fontSize: '0.95rem', outline: 'none', transition: 'border 0.2s',
                                boxSizing: 'border-box',
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#10b981'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                    </div>
                    <button type="submit" disabled={loading}
                        style={{
                            width: '100%', padding: '0.875rem', borderRadius: '12px', border: 'none',
                            background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                            color: '#fff', fontSize: '1rem', fontWeight: '600', cursor: 'pointer',
                            opacity: loading ? 0.7 : 1, transition: 'all 0.3s',
                        }}>
                        {loading ? '⏳ Masuk...' : '🚀 Masuk'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                        Belum punya akun?{' '}
                        <a href="/register" style={{ color: '#10b981', textDecoration: 'none', fontWeight: '600' }}>Daftar sekarang</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
