import { withAuth } from '@/lib/apiAuth';
import { query, queryOne, run } from '@/lib/db';

export const GET = withAuth(async (req, { userId }) => {
    try {
        const { searchParams } = new URL(req.url);
        const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
        const budgets = await query(`
          SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
            COALESCE((
              SELECT SUM(t.amount) FROM transactions t
              WHERE t.category_id = b.category_id AND t.type = 'expense'
              AND t.user_id = b.user_id AND TO_CHAR(t.date, 'YYYY-MM') = b.month
            ), 0) as spent
          FROM budgets b JOIN categories c ON b.category_id = c.id
          WHERE b.month = $1 AND b.user_id = $2 ORDER BY c.name
        `, [month, userId]);
        return Response.json(budgets);
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});

export const POST = withAuth(async (req, { userId }) => {
    try {
        const { category_id, amount, month } = await req.json();
        if (!category_id || !amount || !month) return Response.json({ error: 'category_id, amount, and month required' }, { status: 400 });

        const existing = await queryOne('SELECT * FROM budgets WHERE category_id = $1 AND month = $2 AND user_id = $3',
            [Number(category_id), month, userId]);
        if (existing) {
            await run('UPDATE budgets SET amount = $1 WHERE id = $2', [amount, existing.id]);
        } else {
            await run('INSERT INTO budgets (category_id, amount, month, user_id) VALUES ($1, $2, $3, $4)',
                [Number(category_id), amount, month, userId]);
        }

        const budget = await queryOne(`
          SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
            COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.category_id = b.category_id
              AND t.type = 'expense' AND t.user_id = b.user_id AND TO_CHAR(t.date, 'YYYY-MM') = b.month), 0) as spent
          FROM budgets b JOIN categories c ON b.category_id = c.id
          WHERE b.category_id = $1 AND b.month = $2 AND b.user_id = $3
        `, [Number(category_id), month, userId]);
        return Response.json(budget);
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});
