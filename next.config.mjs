/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  },
};

export default nextConfig;
