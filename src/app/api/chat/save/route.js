import { withAuth } from '@/lib/apiAuth';
import { query, queryOne, run } from '@/lib/db';

export const POST = withAuth(async (req, { userId }) => {
    try {
        const { description, amount, type = 'expense', category_id, wallet_id } = await req.json();
        const txDate = new Date().toISOString().split('T')[0];
        const rows = await run(
            "INSERT INTO transactions (description, amount, type, category_id, wallet_id, user_id, date, source) VALUES ($1, $2, $3, $4, $5, $6, $7, 'chat') RETURNING id",
            [description, amount, type, category_id, wallet_id, userId, txDate]
        );
        const txId = rows[0].id;

        if (wallet_id) {
            const delta = type === 'income' ? amount : -amount;
            await run('UPDATE wallets SET balance = balance + $1 WHERE id = $2 AND user_id = $3', [delta, wallet_id, userId]);
        }

        const transaction = await queryOne(`
          SELECT t.*, c.name as category_name, c.icon as category_icon, w.name as wallet_name, w.icon as wallet_icon
          FROM transactions t LEFT JOIN categories c ON t.category_id = c.id LEFT JOIN wallets w ON t.wallet_id = w.id WHERE t.id = $1
        `, [txId]);

        let walletBalance = null;
        if (wallet_id) {
            const w = await queryOne('SELECT balance FROM wallets WHERE id = $1', [wallet_id]);
            walletBalance = w ? w.balance : null;
        }

        return Response.json({ transaction, wallet_balance: walletBalance }, { status: 201 });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});
