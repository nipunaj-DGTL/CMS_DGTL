import type { NextConfig } from 'next'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const cmsURL = new URL(process.env.CMS_URL ?? 'http://localhost:3000')
const dirname = path.dirname(fileURLToPath(import.meta.url))

const config: NextConfig = {
  images: {
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        hostname: cmsURL.hostname,
        pathname: '/api/dgtl/public/v1/sites/**/media/**',
        port: cmsURL.port,
        protocol: cmsURL.protocol.replace(':', '') as 'http' | 'https',
      },
    ],
  },
  output: 'standalone',
  poweredByHeader: false,
  transpilePackages: ['@dgtl/cms-client', '@dgtl/content-contracts'],
  turbopack: { root: path.resolve(dirname, '../..') },
}

export default config
