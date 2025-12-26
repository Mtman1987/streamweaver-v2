
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'genkit': 'commonjs genkit',
        '@genkit-ai/googleai': 'commonjs @genkit-ai/googleai',
        '@genkit-ai/core': 'commonjs @genkit-ai/core',
        '@opentelemetry/exporter-jaeger': 'commonjs @opentelemetry/exporter-jaeger',
        '@genkit-ai/firebase': 'commonjs @genkit-ai/firebase',
        'handlebars': 'commonjs handlebars'
      });
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Cache-Control',
            value: 'no-store',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http://localhost:* https:; connect-src 'self' http://localhost:* https: ws://localhost:* ws://127.0.0.1:* wss://*; frame-ancestors 'self' file://* http://localhost:*",
          },
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL'
          },
        ],
      },
    ];
  },
};

export default nextConfig;
