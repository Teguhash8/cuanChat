import { withAuth } from '@/lib/apiAuth';
import { query, queryOne, run } from '@/lib/db';

export const GET = withAuth(async (req, { userId }) => {
    try {
        const { searchParams } = new URL(req.url);
        const category_id = searchParams.get('category_id');
        const wallet_id = searchParams.get('wallet_id');
        const type = searchParams.get('type');
        const start_date = searchParams.get('start_date');
        const end_date = searchParams.get('end_date');
        const search = searchParams.get('search');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        let q = `SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
             w.name as wallet_name, w.icon as wallet_icon
             FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
             LEFT JOIN wallets w ON t.wallet_id = w.id WHERE t.user_id = $1`;
        const params = [userId];
        let idx = 2;

        if (category_id) { q += ` AND t.category_id = $${idx++}`; params.push(Number(category_id)); }
        if (wallet_id) { q += ` AND t.wallet_id = $${idx++}`; params.push(Number(wallet_id)); }
        if (type) { q += ` AND t.type = $${idx++}`; params.push(type); }
        if (start_date) { q += ` AND t.date >= $${idx++}`; params.push(start_date); }
        if (end_date) { q += ` AND t.date <= $${idx++}`; params.push(end_date); }
        if (search) { q += ` AND t.description ILIKE '%' || $${idx++} || '%'`; params.push(search); }

        q += ` ORDER BY t.date DESC, t.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
        params.push(limit, offset);
        const transactions = await query(q, params);

        let countQ = 'SELECT COUNT(*) as total FROM transactions t WHERE t.user_id = $1';
        const countParams = [userId];
        let ci = 2;
        if (category_id) { countQ += ` AND t.category_id = $${ci++}`; countParams.push(Number(category_id)); }
        if (wallet_id) { countQ += ` AND t.wallet_id = $${ci++}`; countParams.push(Number(wallet_id)); }
        if (type) { countQ += ` AND t.type = $${ci++}`; countParams.push(type); }
        if (start_date) { countQ += ` AND t.date >= $${ci++}`; countParams.push(start_date); }
        if (end_date) { countQ += ` AND t.date <= $${ci++}`; countParams.push(end_date); }
        if (search) { countQ += ` AND t.description ILIKE '%' || $${ci++} || '%'`; countParams.push(search); }
        const totalRow = await queryOne(countQ, countParams);

        return Response.json({ transactions, total: totalRow ? Number(totalRow.total) : 0 });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});

export const POST = withAuth(async (req, { userId }) => {
    try {
        const { description, amount, type = 'expense', category_id, wallet_id, date, notes, source = 'web' } = await req.json();
        if (!description || !amount) return Response.json({ error: 'Description and amount required' }, { status: 400 });

        const txDate = date || new Date().toISOString().split('T')[0];
        const rows = await run(
            'INSERT INTO transactions (description, amount, type, category_id, wallet_id, user_id, date, notes, source) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
            [description, amount, type, category_id || null, wallet_id || null, userId, txDate, notes || null, source]
        );
        const txId = rows[0].id;

        if (wallet_id) {
            const delta = type === 'income' ? amount : -amount;
            await run('UPDATE wallets SET balance = balance + $1 WHERE id = $2 AND user_id = $3', [delta, Number(wallet_id), userId]);
        }

        const transaction = await queryOne(`
          SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
                 w.name as wallet_name, w.icon as wallet_icon
          FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
          LEFT JOIN wallets w ON t.wallet_id = w.id WHERE t.id = $1`, [txId]);

        return Response.json(transaction, { status: 201 });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});
