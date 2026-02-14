import { withAuth } from '@/lib/apiAuth';

export const GET = withAuth(async (req, { user }) => {
    return Response.json(user);
});
