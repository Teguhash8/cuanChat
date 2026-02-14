import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { queryOne, ensureDB } from '@/lib/db';
import { JWT_SECRET } from '@/lib/apiAuth';

export async function POST(req) {
    try {
        await ensureDB();
        const { email, password } = await req.json();

        if (!email || !password) {
            return Response.json({ error: 'Email dan password wajib diisi.' }, { status: 400 });
        }

        const user = await queryOne('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
        if (!user) {
            return Response.json({ error: 'Email atau password salah.' }, { status: 401 });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return Response.json({ error: 'Email atau password salah.' }, { status: 401 });
        }

        const token = await new SignJWT({ userId: user.id })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('30d')
            .sign(JWT_SECRET);

        return Response.json({
            token,
            user: { id: user.id, name: user.name, email: user.email },
            message: 'Login berhasil! 👋'
        });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
