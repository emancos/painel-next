/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  serverExternalPackages: ['msedge-tts', 'postgres', 'ioredis']
}

export default nextConfig
