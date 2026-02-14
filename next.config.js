/** @type {import('next').NextConfig} */
const nextConfig = {
    serverExternalPackages: ['jsonwebtoken', 'bcryptjs', '@neondatabase/serverless'],
};

module.exports = nextConfig;
