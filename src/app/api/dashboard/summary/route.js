import { withAuth } from '@/lib/apiAuth';
import { query, queryOne } from '@/lib/db';

export const GET = withAuth(async (req, { userId }) => {
    try {
        const currentMonth = new Date().toISOString().slice(0, 7);

        const monthStats = await queryOne(`
          SELECT
            COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as total_income,
            COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as total_expense,
            COUNT(*) as total_transactions
          FROM transactions WHERE TO_CHAR(date, 'YYYY-MM') = $1 AND user_id = $2
        `, [currentMonth, userId]) || { total_income: 0, total_expense: 0, total_transactions: 0 };

        const walletBalance = await queryOne('SELECT COALESCE(SUM(balance), 0) as total FROM wallets WHERE user_id = $1', [userId]) || { total: 0 };

        const categoryBreakdown = await query(`
          SELECT c.name, c.icon, c.color, COALESCE(SUM(t.amount), 0) as total
          FROM transactions t JOIN categories c ON t.category_id = c.id
          WHERE t.type = 'expense' AND TO_CHAR(t.date, 'YYYY-MM') = $1 AND t.user_id = $2
          GROUP BY c.id, c.name, c.icon, c.color ORDER BY total DESC
        `, [currentMonth, userId]);

        const monthlyTrend = await query(`
          SELECT TO_CHAR(date, 'YYYY-MM') as month,
            COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income,
            COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expense
          FROM transactions WHERE date >= CURRENT_DATE - INTERVAL '6 months' AND user_id = $1
          GROUP BY TO_CHAR(date, 'YYYY-MM') ORDER BY month
        `, [userId]);

        const recentTransactions = await query(`
          SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
                 w.name as wallet_name, w.icon as wallet_icon
          FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
          LEFT JOIN wallets w ON t.wallet_id = w.id WHERE t.user_id = $1
          ORDER BY t.date DESC, t.created_at DESC LIMIT 5
        `, [userId]);

        const allBudgets = await query(`
          SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
            COALESCE((SELECT SUM(t.amount) FROM transactions t
              WHERE t.category_id = b.category_id AND t.type = 'expense'
              AND t.user_id = b.user_id AND TO_CHAR(t.date, 'YYYY-MM') = b.month), 0) as spent
          FROM budgets b JOIN categories c ON b.category_id = c.id
          WHERE b.month = $1 AND b.user_id = $2
        `, [currentMonth, userId]);
        const budgetAlerts = allBudgets.filter(b => Number(b.spent) >= Number(b.amount) * 0.8);

        return Response.json({
            total_income: Number(monthStats.total_income),
            total_expense: Number(monthStats.total_expense),
            total_transactions: Number(monthStats.total_transactions),
            total_balance: Number(walletBalance.total),
            category_breakdown: categoryBreakdown,
            monthly_trend: monthlyTrend,
            recent_transactions: recentTransactions,
            budget_alerts: budgetAlerts,
            current_month: currentMonth,
        });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});
