// EdgeOne 部署配置文件
module.exports = {
  // 项目基本信息
  name: 'context-me',
  version: '1.0.0',
  description: 'ContextMe - 智能内容洞察浏览器扩展后端服务',

  // 构建配置
  build: {
    // 构建输出目录
    outputDir: '.next',

    // 静态资源目录
    staticDir: 'public',

    // 构建命令
    buildCommand: 'npm run build',

    // 安装依赖命令
    installCommand: 'npm ci --production',
  },

  // 部署配置
  deploy: {
    // 部署区域 (EdgeOne 支持的区域)
    region: 'ap-hongkong',

    // 环境变量 (生产环境)
    env: {
      NODE_ENV: 'production',

      // 数据库配置
      DATABASE_URL: process.env.DATABASE_URL,

      // Redis 配置
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,

      // NextAuth 配置
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,

      // Google OAuth 配置
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      CHROME_CLIENT_ID: process.env.CHROME_CLIENT_ID,

      // OpenAI 配置
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      OPENAI_URL: process.env.OPENAI_URL || 'https://api.siliconflow.com/v1/chat/completions',

      // Stripe 配置
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    },
  },

  // 路由配置
  routes: [
    {
      // API 路由 - 使用边缘函数
      pattern: '/api/*',
      handler: 'edge-function',
      options: {
        runtime: 'nodejs18',
        memory: 512,
        timeout: 30,
        // 缓存配置
        cache: {
          ttl: 0, // API 响应不缓存
          vary: ['Authorization', 'Content-Type'],
        },
        // CORS 配置
        cors: {
          origin: '*',
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          headers: ['Content-Type', 'Authorization'],
        },
      },
    },
    {
      // 静态资源
      pattern: '/_next/static/*',
      handler: 'static',
      options: {
        cache: {
          ttl: 86400, // 24 小时缓存
          compress: true,
        },
      },
    },
    {
      // 图片资源
      pattern: '/images/*',
      handler: 'static',
      options: {
        cache: {
          ttl: 86400, // 24 小时缓存
          compress: true,
        },
      },
    },
    {
      // 图标文件
      pattern: '/favicon.ico',
      handler: 'static',
      options: {
        cache: {
          ttl: 86400, // 24 小时缓存
        },
      },
    },
    {
      // 根路径和所有其他路径 - SSR
      pattern: '/*',
      handler: 'ssr',
      options: {
        runtime: 'nodejs18',
        memory: 1024,
        timeout: 60,
        // 缓存配置
        cache: {
          ttl: 300, // 5 分钟缓存
          vary: ['Cookie', 'Authorization'],
        },
      },
    },
  ],

  // 域名配置
  domain: {
    // 主域名
    primary: 'api.contextme.com',

    // 备用域名
    aliases: [
      'contextme-api.edgeone.tencentcloudapi.com',
    ],

    // SSL 证书配置
    ssl: {
      autoRenew: true,
      provider: 'letsencrypt',
    },
  },

  // CDN 配置
  cdn: {
    // 全球加速节点
    regions: [
      'ap-hongkong',
      'ap-singapore',
      'ap-tokyo',
      'eu-frankfurt',
      'na-siliconvalley',
    ],

    // 缓存配置
    cache: {
      // 静态资源缓存策略
      static: {
        ttl: 86400, // 24 小时
        browserTtl: 3600, // 1 小时
      },

      // API 缓存策略
      api: {
        ttl: 0, // 不缓存
        browserTtl: 0,
      },

      // 页面缓存策略
      page: {
        ttl: 300, // 5 分钟
        browserTtl: 60, // 1 分钟
      },
    },

    // 压缩配置
    compression: {
      enabled: true,
      level: 6,
      types: [
        'text/html',
        'text/css',
        'text/javascript',
        'application/javascript',
        'application/json',
        'text/xml',
        'application/xml',
      ],
    },
  },

  // 安全配置
  security: {
    // DDoS 防护
    ddos: {
      enabled: true,
      threshold: 1000, // 每秒请求数
      burst: 2000, // 突发请求数
    },

    // WAF 规则
    waf: {
      enabled: true,
      rules: [
        'SQL_INJECTION',
        'XSS',
        'COMMAND_INJECTION',
        'DIRECTORY_TRAVERSAL',
      ],
    },

    // 频率限制
    rateLimit: {
      enabled: true,
      rules: [
        {
          pattern: '/api/*',
          limit: 100, // 每分钟请求数
          window: 60, // 时间窗口（秒）
        },
      ],
    },
  },

  // 监控和日志
  monitoring: {
    // 应用性能监控
    apm: {
      enabled: true,
      sampleRate: 0.1, // 10% 采样率
    },

    // 错误监控
    errorTracking: {
      enabled: true,
      destination: 'https://logs.contextme.com',
    },

    // 访问日志
    accessLog: {
      enabled: true,
      format: 'json',
      retention: 30, // 保留天数
    },
  },

  // 扩展功能
  features: {
    // 预渲染配置
    prerender: {
      enabled: true,
      paths: [
        '/',
        '/dashboard',
        '/login',
        '/pricing',
      ],
    },

    // 国际化
    i18n: {
      enabled: false,
      defaultLocale: 'zh-CN',
      locales: ['zh-CN', 'en-US'],
    },
  },

  // 开发和测试
  development: {
    // 本地开发端口
    port: 3000,

    // 热重载
    hotReload: true,

    // 调试模式
    debug: process.env.NODE_ENV === 'development',
  },

  // 备份和恢复
  backup: {
    // 自动备份
    enabled: true,
    schedule: '0 2 * * *', // 每天凌晨 2 点
    retention: 30, // 保留 30 天

    // 备份存储
    storage: {
      type: 'cos',
      bucket: 'contextme-backup',
      region: 'ap-hongkong',
    },
  },
};