/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  serverExternalPackages: ['msedge-tts', 'postgres', 'ioredis', 'drizzle-orm', 'bcryptjs']
}

export default nextConfig
