/**
 * Unit tests for attachments route (file upload validation)
 */

const path = require('path');
const fs = require('fs');

describe('Attachments Upload Config', () => {
    test('uploads directory exists or can be created', () => {
        const uploadsDir = path.join(__dirname, '..', 'server', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        expect(fs.existsSync(uploadsDir)).toBe(true);
    });

    test('attachments route module exports a router', () => {
        // Mock multer to avoid actual file system operations
        jest.mock('multer', () => {
            const multerMock = () => ({
                single: () => (req, res, next) => next(),
            });
            multerMock.diskStorage = () => ({});
            return multerMock;
        });

        // Clear cache and re-require
        jest.resetModules();
        const attachmentsRouter = require('../server/routes/attachments');
        expect(attachmentsRouter).toBeDefined();
        expect(typeof attachmentsRouter).toBe('function'); // Express router is a function
    });
});

describe('Privacy & Security Checks', () => {
    test('.gitignore exists', () => {
        const gitignorePath = path.join(__dirname, '..', '.gitignore');
        expect(fs.existsSync(gitignorePath)).toBe(true);
    });

    test('.gitignore excludes database files', () => {
        const gitignore = fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf-8');
        expect(gitignore).toContain('*.db');
    });

    test('.gitignore excludes uploads directory', () => {
        const gitignore = fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf-8');
        expect(gitignore).toContain('server/uploads/');
    });

    test('.gitignore excludes node_modules', () => {
        const gitignore = fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf-8');
        expect(gitignore).toContain('node_modules/');
    });

    test('.gitignore excludes .env files', () => {
        const gitignore = fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf-8');
        expect(gitignore).toContain('.env');
    });

    test('JWT secret uses environment variable with fallback', () => {
        const authContent = fs.readFileSync(
            path.join(__dirname, '..', 'server', 'middleware', 'auth.js'), 'utf-8'
        );
        expect(authContent).toContain('process.env.JWT_SECRET');
    });

    test('no hardcoded real passwords in auth route', () => {
        const authRoute = fs.readFileSync(
            path.join(__dirname, '..', 'server', 'routes', 'auth.js'), 'utf-8'
        );
        // Should use bcrypt, not store plaintext passwords
        expect(authRoute).toContain('bcrypt');
        expect(authRoute).not.toMatch(/password\s*[:=]\s*['"][a-zA-Z0-9]+['"]/);
    });
});
