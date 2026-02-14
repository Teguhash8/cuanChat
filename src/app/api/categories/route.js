import { withAuth } from '@/lib/apiAuth';
import { query, queryOne, run } from '@/lib/db';

export const GET = withAuth(async (req, { userId }) => {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');
        let q = 'SELECT * FROM categories WHERE user_id = $1';
        const params = [userId];
        if (type) { q += ' AND type = $2'; params.push(type); }
        q += ' ORDER BY name';
        const rows = await query(q, params);
        return Response.json(rows);
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});

export const POST = withAuth(async (req, { userId }) => {
    try {
        const { name, icon, color, type = 'expense' } = await req.json();
        if (!name) return Response.json({ error: 'Name required' }, { status: 400 });
        const rows = await run('INSERT INTO categories (name, icon, color, type, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [name, icon || '📦', color || '#10b981', type, userId]);
        const cat = await queryOne('SELECT * FROM categories WHERE id = $1', [rows[0].id]);
        return Response.json(cat, { status: 201 });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});
