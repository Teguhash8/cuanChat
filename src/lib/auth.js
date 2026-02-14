// Auth helper - used across all pages to attach JWT token to API requests
export function getToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
}

export function getUser() {
    if (typeof window === 'undefined') return null;
    try {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    } catch { return null; }
}

export function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

// Wrapper around fetch that adds auth header
export async function authFetch(url, options = {}) {
    const token = getToken();
    if (!token) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
    }
    const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
        logout();
        throw new Error('Session expired');
    }
    return res;
}
