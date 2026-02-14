/**
 * Unit tests for auth middleware (JWT token validation)
 */

const jwt = require('jsonwebtoken');

// Mock the DB module
jest.mock('../server/db', () => ({
    queryOne: jest.fn((sql, params) => {
        if (params[0] === 1) return { id: 1, name: 'Test User', email: 'test@example.com' };
        return null;
    }),
}));

const { authMiddleware, JWT_SECRET } = require('../server/middleware/auth');

// Helper to create mock req/res/next
function createMocks(authHeader) {
    const req = { headers: { authorization: authHeader } };
    const res = {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.body = data; return this; },
    };
    const next = jest.fn();
    return { req, res, next };
}

describe('Auth Middleware', () => {
    test('rejects request without Authorization header', () => {
        const { req, res, next } = createMocks(undefined);
        authMiddleware(req, res, next);
        expect(res.statusCode).toBe(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('rejects request without Bearer prefix', () => {
        const { req, res, next } = createMocks('Basic sometoken');
        authMiddleware(req, res, next);
        expect(res.statusCode).toBe(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('rejects invalid JWT token', () => {
        const { req, res, next } = createMocks('Bearer invalidtoken123');
        authMiddleware(req, res, next);
        expect(res.statusCode).toBe(401);
        expect(res.body.error).toContain('tidak valid');
    });

    test('rejects expired JWT token', () => {
        const expiredToken = jwt.sign({ userId: 1 }, JWT_SECRET, { expiresIn: '-1s' });
        const { req, res, next } = createMocks(`Bearer ${expiredToken}`);
        authMiddleware(req, res, next);
        expect(res.statusCode).toBe(401);
    });

    test('accepts valid JWT token and sets userId', () => {
        const validToken = jwt.sign({ userId: 1 }, JWT_SECRET, { expiresIn: '1h' });
        const { req, res, next } = createMocks(`Bearer ${validToken}`);
        authMiddleware(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.userId).toBe(1);
        expect(req.user).toEqual({ id: 1, name: 'Test User', email: 'test@example.com' });
    });

    test('rejects valid token but user not found in DB', () => {
        const tokenForMissingUser = jwt.sign({ userId: 999 }, JWT_SECRET, { expiresIn: '1h' });
        const { req, res, next } = createMocks(`Bearer ${tokenForMissingUser}`);
        authMiddleware(req, res, next);
        expect(res.statusCode).toBe(401);
        expect(res.body.error).toContain('tidak ditemukan');
        expect(next).not.toHaveBeenCalled();
    });
});
