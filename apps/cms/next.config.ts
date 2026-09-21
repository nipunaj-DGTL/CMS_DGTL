import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  output: 'standalone',
  poweredByHeader: false,
  transpilePackages: ['@dgtl/content-contracts'],
  async rewrites() {
    return {
      afterFiles: [],
      beforeFiles: [
        {
          // Payload owns a broad /api/[...slug] route. Resolve the versioned
          // delivery API in a separate internal namespace before filesystem
          // and dynamic-route matching so Payload cannot shadow nested paths.
          destination: '/dgtl-public-api/v1/sites/:path*',
          source: '/api/dgtl/public/v1/sites/:path*',
        },
      ],
      fallback: [],
    }
  },
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname, '../..'),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
