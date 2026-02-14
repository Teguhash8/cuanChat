import { withAuth } from '@/lib/apiAuth';
import { queryOne, run } from '@/lib/db';

export const PUT = withAuth(async (req, { userId, params }) => {
    try {
        const { id } = await params;
        const { name, icon, color, type } = await req.json();
        const existing = await queryOne('SELECT * FROM categories WHERE id = $1 AND user_id = $2', [Number(id), userId]);
        if (!existing) return Response.json({ error: 'Category not found' }, { status: 404 });
        await run('UPDATE categories SET name=$1, icon=$2, color=$3, type=$4 WHERE id=$5 AND user_id=$6', [
            name || existing.name, icon || existing.icon, color || existing.color, type || existing.type,
            Number(id), userId
        ]);
        const updated = await queryOne('SELECT * FROM categories WHERE id = $1', [Number(id)]);
        return Response.json(updated);
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});

export const DELETE = withAuth(async (req, { userId, params }) => {
    try {
        const { id } = await params;
        const existing = await queryOne('SELECT * FROM categories WHERE id = $1 AND user_id = $2', [Number(id), userId]);
        if (!existing) return Response.json({ error: 'Category not found' }, { status: 404 });
        await run('UPDATE transactions SET category_id = NULL WHERE category_id = $1 AND user_id = $2', [Number(id), userId]);
        await run('DELETE FROM budgets WHERE category_id = $1 AND user_id = $2', [Number(id), userId]);
        await run('DELETE FROM categories WHERE id = $1 AND user_id = $2', [Number(id), userId]);
        return Response.json({ message: 'Category deleted' });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});
