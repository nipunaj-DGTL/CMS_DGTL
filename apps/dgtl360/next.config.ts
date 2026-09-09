import type { NextConfig } from 'next';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = dirname(dirname(projectRoot));
const cmsURL = new URL(process.env.CMS_URL?.trim() || 'http://localhost:3000');
const cmsIsLocal = cmsURL.hostname === 'localhost' || cmsURL.hostname === '127.0.0.1';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  images: {
    dangerouslyAllowLocalIP: cmsIsLocal,
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: cmsURL.protocol.replace(':', '') as 'http' | 'https',
        hostname: cmsURL.hostname,
        port: cmsURL.port,
        pathname: '/api/dgtl/public/v1/sites/**',
      },
    ],
  },
  output: 'standalone',
  poweredByHeader: false,
  transpilePackages: ['@dgtl/cms-client', '@dgtl/content-contracts'],
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
