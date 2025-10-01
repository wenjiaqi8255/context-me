import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 输出配置 - standalone 模式，但优化包大小
  output: 'standalone',

  // 环境变量配置
  env: {
    // 确保环境变量在构建时可用
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },

  // 图片配置
  images: {
    domains: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com'],
    unoptimized: true, // EdgeOne 静态托管需要这个配置
  },

  // 基础路径配置
  basePath: '',

  // 禁用某些功能以减少包大小
  experimental: {
    optimizePackageImports: ['react-icons', "lucide-react"],
    optimizeCss: true,
  },

  // 服务器组件外部包 (正确的位置)
  serverExternalPackages: [
    '@prisma/client',
    'googleapis',
    'google-auth-library',
    '@upstash/redis'
  ],

  // 重定向配置
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },

  // 头部配置
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },

  // Webpack 配置优化
  webpack: (config, { isServer, dev }) => {
    // 生产环境优化
    if (!dev) {
      // 减少包大小
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: -10,
              chunks: 'all',
            },
          },
        },
      };
    }

    if (!isServer) {
      // 客户端打包优化
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    } else {
      // 服务端优化：排除不必要的模块
      config.externals = [
        ...(config.externals || []),
        ({ request }: { request: string }, callback: (error?: Error | null, result?: string) => void) => {
          // 排除开发依赖
          const devDependencies = [
            'eslint',
            '@types',
            'tailwindcss',
            'autoprefixer',
            'postcss'
          ];

          if (devDependencies.some(dep => request.includes(dep))) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      ];
    }

    return config;
  },

  // 移除 Turbopack 以减少包大小
  // turbopack: {
  //   root: __dirname,
  // },
};

export default nextConfig;
