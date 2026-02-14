import { jwtVerify } from 'jose';
import { queryOne, ensureDB } from './db';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'cuanchat-secret-key-2024-change-in-production';
export const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

/**
 * Wraps a Next.js API route handler with JWT authentication.
 * Injects `userId` and `user` into the request context.
 */
export function withAuth(handler) {
    return async (req, context) => {
        try {
            await ensureDB();

            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return Response.json({ error: 'Token tidak ditemukan. Silakan login.' }, { status: 401 });
            }

            const token = authHeader.split(' ')[1];
            let payload;
            try {
                const result = await jwtVerify(token, JWT_SECRET);
                payload = result.payload;
            } catch (err) {
                return Response.json({ error: 'Token tidak valid atau sudah expired.' }, { status: 401 });
            }

            const user = await queryOne('SELECT id, name, email FROM users WHERE id = $1', [payload.userId]);
            if (!user) {
                return Response.json({ error: 'User tidak ditemukan.' }, { status: 401 });
            }

            return handler(req, { ...context, userId: user.id, user });
        } catch (err) {
            return Response.json({ error: err.message }, { status: 500 });
        }
    };
}
