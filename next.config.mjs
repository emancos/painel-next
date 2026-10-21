/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['msedge-tts', 'postgres', 'ioredis']
}

export default nextConfig
