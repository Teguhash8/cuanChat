import { withAuth } from '@/lib/apiAuth';
import { queryOne, run } from '@/lib/db';

export const PUT = withAuth(async (req, { userId, params }) => {
    try {
        const { id } = await params;
        const { name, icon, color, balance, is_default } = await req.json();
        const existing = await queryOne('SELECT * FROM wallets WHERE id = $1 AND user_id = $2', [Number(id), userId]);
        if (!existing) return Response.json({ error: 'Wallet not found' }, { status: 404 });
        if (is_default) await run('UPDATE wallets SET is_default = 0 WHERE user_id = $1', [userId]);
        await run('UPDATE wallets SET name=$1, icon=$2, color=$3, balance=$4, is_default=$5 WHERE id=$6 AND user_id=$7', [
            name || existing.name, icon || existing.icon, color || existing.color,
            balance !== undefined ? balance : existing.balance,
            is_default !== undefined ? is_default : existing.is_default,
            Number(id), userId
        ]);
        const updated = await queryOne('SELECT * FROM wallets WHERE id = $1', [Number(id)]);
        return Response.json(updated);
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});

export const DELETE = withAuth(async (req, { userId, params }) => {
    try {
        const { id } = await params;
        const existing = await queryOne('SELECT * FROM wallets WHERE id = $1 AND user_id = $2', [Number(id), userId]);
        if (!existing) return Response.json({ error: 'Wallet not found' }, { status: 404 });
        await run('UPDATE transactions SET wallet_id = NULL WHERE wallet_id = $1 AND user_id = $2', [Number(id), userId]);
        await run('DELETE FROM wallets WHERE id = $1 AND user_id = $2', [Number(id), userId]);
        return Response.json({ message: 'Wallet deleted' });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});
