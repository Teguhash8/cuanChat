import { withAuth } from '@/lib/apiAuth';
import { query, queryOne, run } from '@/lib/db';

export const GET = withAuth(async (req, { userId }) => {
    try {
        const rows = await query('SELECT * FROM wallets WHERE user_id = $1 ORDER BY is_default DESC, name', [userId]);
        return Response.json(rows);
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});

export const POST = withAuth(async (req, { userId }) => {
    try {
        const { name, icon, color, balance = 0 } = await req.json();
        if (!name) return Response.json({ error: 'Name required' }, { status: 400 });
        const rows = await run('INSERT INTO wallets (name, icon, color, balance, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [name, icon || '💳', color || '#3b82f6', balance, userId]);
        const wallet = await queryOne('SELECT * FROM wallets WHERE id = $1', [rows[0].id]);
        return Response.json(wallet, { status: 201 });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});
