import { withAuth } from '@/lib/apiAuth';
import { queryOne, run } from '@/lib/db';

export const POST = withAuth(async (req, { userId }) => {
    try {
        const { transaction_id, wallet_id } = await req.json();
        const existing = await queryOne('SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [transaction_id, userId]);
        if (!existing) return Response.json({ error: 'Transaction not found' }, { status: 404 });

        if (existing.wallet_id) {
            const oldDelta = existing.type === 'income' ? -existing.amount : existing.amount;
            await run('UPDATE wallets SET balance = balance + $1 WHERE id = $2 AND user_id = $3', [oldDelta, existing.wallet_id, userId]);
        }

        await run('UPDATE transactions SET wallet_id = $1 WHERE id = $2 AND user_id = $3', [wallet_id, transaction_id, userId]);
        const newDelta = existing.type === 'income' ? existing.amount : -existing.amount;
        await run('UPDATE wallets SET balance = balance + $1 WHERE id = $2 AND user_id = $3', [newDelta, wallet_id, userId]);

        const wallet = await queryOne('SELECT * FROM wallets WHERE id = $1', [wallet_id]);
        return Response.json({ wallet_name: wallet.name, wallet_icon: wallet.icon, balance: wallet.balance });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});
