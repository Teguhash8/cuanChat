import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { queryOne, run, ensureDB, seedDefaultData } from '@/lib/db';
import { JWT_SECRET } from '@/lib/apiAuth';

export async function POST(req) {
    try {
        await ensureDB();
        const { name, email, password } = await req.json();

        if (!name || !email || !password) {
            return Response.json({ error: 'Nama, email, dan password wajib diisi.' }, { status: 400 });
        }
        if (password.length < 6) {
            return Response.json({ error: 'Password minimal 6 karakter.' }, { status: 400 });
        }

        const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (existing) {
            return Response.json({ error: 'Email sudah terdaftar. Silakan login.' }, { status: 400 });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const rows = await run(
            'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
            [name, email.toLowerCase(), passwordHash]
        );
        const userId = rows[0].id;

        await seedDefaultData(userId);

        const token = await new SignJWT({ userId })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('30d')
            .sign(JWT_SECRET);

        const user = await queryOne('SELECT id, name, email FROM users WHERE id = $1', [userId]);

        return Response.json({ token, user, message: 'Registrasi berhasil! Selamat datang di CuanChat 🎉' }, { status: 201 });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
