# ContextMe - 智能内容洞察浏览器扩展

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue)](https://chrome.google.com/webstore)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

ContextMe 是一个智能浏览器扩展，为用户提供基于个人档案的实时网页内容洞察。无论您在浏览课程、工作职位、技术文档还是任何其他内容，ContextMe 都能根据您的背景和目标提供个性化的解释和建议。

## ✨ 核心功能

- 🧠 **智能内容分析**: 自动识别并分析网页核心内容
- 👤 **个性化洞察**: 基于用户档案生成定制化内容解释
- ⚡ **实时展示**: 在浏览任何网页时即时显示相关洞察
- 🔄 **智能缓存**: 多层缓存策略，提升响应速度，降低API调用成本
- 🔐 **Google OAuth**: 安全便捷的用户认证系统
- 💳 **订阅模式**: 灵活的免费和付费订阅选项

## 🏗️ 技术架构

### 前端技术栈
- **Chrome Extension**: Manifest V3，支持现代浏览器API
- **React**: 19.1.0，用于用户界面构建
- **TypeScript**: 5.x，提供类型安全和更好的开发体验
- **Tailwind CSS**: 4.x，快速构建美观的用户界面

### 后端技术栈
- **Next.js**: 15.5.4 (App Router)，现代React全栈框架
- **Prisma ORM**: 6.16.2，类型安全的数据库访问
- **Neon PostgreSQL**: 无服务器数据库，自动扩缩容
- **Upstash Redis**: 全球分布的边缘缓存服务
- **NextAuth.js**: 4.24.11，完整的身份验证解决方案

### 第三方集成
- **Google OAuth**: 用户身份认证
- **OpenAI API**: AI驱动的内容分析和洞察生成
- **Stripe**: 订阅和支付处理

## 📁 项目结构

```
contextMe/
├── context-me/                    # Next.js 后端应用
│   ├── prisma/
│   │   └── schema.prisma         # 数据库模型定义
│   ├── src/
│   │   ├── app/                  # App Router 页面和API
│   │   ├── components/           # React 组件
│   │   └── lib/                  # 工具函数和配置
│   ├── extension/                # Chrome 扩展
│   │   ├── manifest.json         # 扩展配置
│   │   ├── background.js         # 后台服务脚本
│   │   ├── content.js           # 内容注入脚本
│   │   ├── popup.html/js        # 弹出窗口界面
│   │   └── icons/               # 扩展图标
│   ├── package.json
│   ├── next.config.ts
│   └── tsconfig.json
├── doc.md                        # 详细技术文档
└── debugging-analysis.md         # 调试分析记录
```

## 🚀 快速开始

### 环境要求
- Node.js 18.x 或更高版本
- npm 或 yarn 包管理器
- PostgreSQL 数据库 (推荐使用 Neon)
- Redis 缓存服务 (推荐使用 Upstash)
- Google OAuth 应用
- OpenAI API 密钥

### 1. 克隆项目
```bash
git clone https://github.com/yourusername/contextMe.git
cd contextMe/context-me
```

### 2. 安装依赖
```bash
npm install
```

### 3. 环境配置
创建 `.env.local` 文件并配置以下环境变量：

```bash
# 数据库配置
DATABASE_URL="postgresql://username:password@host:port/database"

# Redis 配置
UPSTASH_REDIS_REST_URL="https://your-redis-url.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-redis-token"

# Google OAuth 配置
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"

# Chrome Extension OAuth (无需 secret)
CHROME_CLIENT_ID="your-chrome-extension-client-id"

# OpenAI 配置
OPENAI_API_KEY="your-openai-api-key"

# Stripe 配置
STRIPE_SECRET_KEY="your-stripe-secret-key"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="your-stripe-publishable-key"
STRIPE_WEBHOOK_SECRET="your-stripe-webhook-secret"
```

### 4. 数据库设置
```bash
# 生成 Prisma 客户端
npx prisma generate

# 推送数据库 schema 到数据库
npx prisma db push

# (可选) 查看数据库
npx prisma studio
```

### 5. 启动开发服务器
```bash
# 启动 Next.js 开发服务器
npm run dev

# 在另一个终端窗口中，稍后启动扩展开发
```

### 6. 安装 Chrome 扩展
1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `context-me/extension` 文件夹

## 📊 数据库模型

### User (用户)
- 基本信息：邮箱、姓名、头像
- OAuth 集成：Google ID、访问令牌
- 订阅管理：Stripe 客户ID、订阅状态
- 活跃状态：登录状态、最后活跃时间

### UserProfile (用户档案)
- 档案数据：JSON 格式的结构化用户信息
- 版本控制：支持档案变更历史追踪
- 关联用户：与用户表的一对多关系

### ContentFingerprint (内容指纹)
- 内容识别：基于内容的哈希值
- 元数据：URL、标题、内容类型
- 提取数据：结构化的内容分析结果

### UsageLog (使用日志)
- 使用记录：用户操作类型和时间
- 成本追踪：AI API 调用的令牌使用量
- 关联数据：关联内容指纹和用户

### Subscription (订阅)
- 订阅管理：Stripe 订阅ID和状态
- 计费周期：当前周期的开始和结束时间
- 价格信息：关联的价格计划

## 🔧 API 端点

### 认证相关
- `GET /api/auth/signin` - 登录页面
- `GET /api/auth/signout` - 退出登录
- `POST /api/auth/google-extension` - Chrome 扩展 OAuth 回调

### 用户档案
- `GET /api/profile` - 获取用户档案
- `POST /api/profile` - 创建用户档案
- `PUT /api/profile` - 更新用户档案

### 内容分析
- `POST /api/content/analyze` - 分析页面内容
- `POST /api/insights/generate` - 生成个性化洞察

### 计费和订阅
- `POST /api/billing/create-checkout-session` - 创建支付会话
- `POST /api/billing/webhook` - Stripe Webhook 处理

### 系统监控
- `GET /api/health` - 健康检查
- `GET /api/usage/stats` - 使用统计

## 💰 订阅计划

### 免费版 (Free)
- 每日 10 次洞察生成
- 每月 50 次 AI 调用
- 基础功能访问

### 专业版 (Pro) - $9.99/月
- 每日 100 次洞察生成
- 每月 1000 次 AI 调用
- 高级功能和优先支持

### 企业版 (Enterprise) - $29.99/月
- 无限洞察生成
- 无限 AI 调用
- 所有高级功能
- 优先客户支持

## 🚀 部署

### 开发环境
```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run lint         # 代码检查
```

### 生产部署 (推荐 EdgeOne)
1. **构建应用**
   ```bash
   npm run build
   ```

2. **环境变量配置**
   - 在 EdgeOne 控制台配置生产环境变量
   - 确保 DATABASE_URL 和其他密钥正确配置

3. **数据库迁移**
   ```bash
   npx prisma migrate deploy
   ```

4. **部署到 EdgeOne**
   ```bash
   # 使用 EdgeOne CLI 或控制台上传构建文件
   edgeone-cli deploy --config edgeone.config.js
   ```

5. **CI/CD 自动部署（推荐）**
   ```bash
   # 代码推送到 GitHub
   git add .
   git commit -m "Deploy to EdgeOne"
   git push origin master

   # GitHub Actions 会自动构建和部署
   ```

#### 🎉 当前部署状态
✅ **已成功部署到 EdgeOne**
- **生产环境地址**: https://context-me.edgeone.run
- **部署状态**: 所有功能正常运行
- **Chrome Extension**: 已更新为生产配置

#### 📋 部署后测试
部署完成后，请参考 [EDGEONE_DEPLOYMENT_GUIDE.md](./context-me/EDGEONE_DEPLOYMENT_GUIDE.md) 进行完整测试：
- 🌐 网站功能测试（登录、Dashboard）
- 🔗 API 端点验证（健康检查、用户资料）
- 🧩 Chrome Extension 集成测试（重新加载扩展后）
- 🔐 认证流程测试（Google OAuth）

**重要提醒**: Chrome Extension 已更新为生产环境配置，请重新加载扩展以应用新设置。

## 🔍 Chrome 扩展使用

### 安装后设置
1. 点击浏览器工具栏中的 ContextMe 图标
2. 使用 Google 账号登录
3. 完善个人档案（背景、兴趣、目标）
4. 开始浏览网页，享受个性化洞察

### 核心使用场景
- **课程学习**: 获取课程内容与个人学习目标的关联分析
- **求职浏览**: 分析职位要求与个人技能的匹配度
- **技术文档**: 基于技术背景提供定制化解释
- **产品浏览**: 根据需求和偏好提供产品分析

## 🛠️ 开发指南

### 代码规范
- 使用 TypeScript 严格模式
- 遵循 ESLint 和 Prettier 配置
- 组件采用函数式编程
- API 路由使用 Edge Runtime

### 调试技巧
1. **Chrome 扩展调试**
   - 使用 `chrome://extensions/` 检查扩展状态
   - 右键点击扩展图标选择"检查弹出内容"
   - 在网页上右键选择"检查"查看 Content Script

2. **后端调试**
   - 查看 Next.js 开发服务器日志
   - 使用 Prisma Studio 检查数据库状态
   - 检查 Upstash Redis 缓存内容

### 常见问题解决
- **OAuth 登录失败**: 检查客户端ID和重定向URI配置
- **数据库连接错误**: 验证 DATABASE_URL 格式和权限
- **API 调用超时**: 检查网络连接和服务状态
- **扩展不工作**: 确认 manifest.json 权限配置

## 📈 性能优化

### 缓存策略
- **L1 缓存**: Chrome 本地存储 (用户档案)
- **L2 缓存**: Background Worker 内存 (会话数据)
- **L3 缓存**: Upstash Redis (分布式缓存)
- **L4 缓存**: EdgeOne CDN (静态资源)

### 监控指标
- API 响应时间 < 2秒
- 缓存命中率 > 70%
- AI 调用成功率 > 95%
- 用户洞察展示时间 < 500ms (缓存命中)

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 开发流程
1. Fork 项目仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 贡献类型
- 🐛 Bug 修复
- ✨ 新功能开发
- 📝 文档改进
- 🎨 UI/UX 优化
- ⚡ 性能提升
- 🧪 测试覆盖

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系我们

- 📧 Email: support@contextme.com
- 🐛 问题反馈: [GitHub Issues](https://github.com/yourusername/contextMe/issues)
- 💬 讨论: [GitHub Discussions](https://github.com/yourusername/contextMe/discussions)

## 🙏 致谢

感谢以下开源项目和服务提供商：
- [Next.js](https://nextjs.org/) - React 全栈框架
- [Prisma](https://www.prisma.io/) - 现代数据库工具包
- [Neon](https://neon.tech/) - 无服务器 PostgreSQL
- [Upstash](https://upstash.com/) - 全球分布式 Redis
- [OpenAI](https://openai.com/) - AI 模型服务
- [Stripe](https://stripe.com/) - 支付处理平台

---

**ContextMe** - 让每一次浏览都充满洞察 🚀