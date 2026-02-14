import { withAuth } from '@/lib/apiAuth';
import { queryOne, run } from '@/lib/db';

export const GET = withAuth(async (req, { userId, params }) => {
    try {
        const { id } = await params;
        const transaction = await queryOne(`
          SELECT t.*, c.name as category_name, c.icon as category_icon,
                 w.name as wallet_name, w.icon as wallet_icon
          FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
          LEFT JOIN wallets w ON t.wallet_id = w.id WHERE t.id = $1 AND t.user_id = $2`, [Number(id), userId]);
        if (!transaction) return Response.json({ error: 'Transaction not found' }, { status: 404 });
        return Response.json(transaction);
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});

export const PUT = withAuth(async (req, { userId, params }) => {
    try {
        const { id } = await params;
        const existing = await queryOne('SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [Number(id), userId]);
        if (!existing) return Response.json({ error: 'Transaction not found' }, { status: 404 });

        const { description, amount, type, category_id, wallet_id, date, notes } = await req.json();

        if (existing.wallet_id) {
            const oldDelta = existing.type === 'income' ? -existing.amount : existing.amount;
            await run('UPDATE wallets SET balance = balance + $1 WHERE id = $2 AND user_id = $3', [oldDelta, existing.wallet_id, userId]);
        }

        await run(
            'UPDATE transactions SET description=$1, amount=$2, type=$3, category_id=$4, wallet_id=$5, date=$6, notes=$7 WHERE id=$8 AND user_id=$9',
            [
                description || existing.description, amount || existing.amount, type || existing.type,
                category_id !== undefined ? category_id : existing.category_id,
                wallet_id !== undefined ? wallet_id : existing.wallet_id,
                date || existing.date, notes !== undefined ? notes : existing.notes,
                Number(id), userId
            ]
        );

        const newWalletId = wallet_id !== undefined ? wallet_id : existing.wallet_id;
        const newAmount = amount || existing.amount;
        const newType = type || existing.type;
        if (newWalletId) {
            const newDelta = newType === 'income' ? newAmount : -newAmount;
            await run('UPDATE wallets SET balance = balance + $1 WHERE id = $2 AND user_id = $3', [newDelta, newWalletId, userId]);
        }

        const updated = await queryOne(`
          SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
                 w.name as wallet_name, w.icon as wallet_icon
          FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
          LEFT JOIN wallets w ON t.wallet_id = w.id WHERE t.id = $1`, [Number(id)]);

        return Response.json(updated);
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});

export const DELETE = withAuth(async (req, { userId, params }) => {
    try {
        const { id } = await params;
        const existing = await queryOne('SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [Number(id), userId]);
        if (!existing) return Response.json({ error: 'Transaction not found' }, { status: 404 });

        if (existing.wallet_id) {
            const delta = existing.type === 'income' ? -existing.amount : existing.amount;
            await run('UPDATE wallets SET balance = balance + $1 WHERE id = $2 AND user_id = $3', [delta, existing.wallet_id, userId]);
        }

        await run('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [Number(id), userId]);
        return Response.json({ message: 'Transaction deleted' });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});
