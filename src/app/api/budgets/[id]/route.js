import { withAuth } from '@/lib/apiAuth';
import { run } from '@/lib/db';

export const DELETE = withAuth(async (req, { userId, params }) => {
    try {
        const { id } = await params;
        await run('DELETE FROM budgets WHERE id = $1 AND user_id = $2', [Number(id), userId]);
        return Response.json({ message: 'Budget deleted' });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});
