/** @type {import('next').NextConfig} */
const nextConfig = {
  target: 'serverless',
  output: 'export',
  images: {
    unoptimized: true,
    domains: ['www.google.com'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
