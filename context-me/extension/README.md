# ContextMe Chrome Extension

## 安装说明

1. 打开Chrome浏览器
2. 进入 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择此文件夹

## 功能说明

### 核心功能
- **页面内容分析**: 自动分析当前页面的主要内容
- **个性化洞察**: 基于用户档案生成定制化的内容洞察
- **实时展示**: 在浏览任何网页时即时显示相关洞察
- **智能缓存**: 提高响应速度，降低API调用成本

### 用户档案设置
- 个人信息和背景
- 兴趣爱好标签
- 目标和技能设定
- 语言和风格偏好

### 使用统计
- 今日使用次数
- 总计使用次数
- 连接状态监控

## API集成

需要后端API服务运行在 `http://localhost:3000`

### 主要接口
- `GET /api/health` - 健康检查
- `POST /api/content/analyze` - 内容分析
- `POST /api/insights/generate` - 洞察生成
- `GET/POST/PUT /api/profile` - 用户档案管理

## 文件结构

```
extension/
├── manifest.json          # 扩展清单配置
├── background.js          # 后台服务脚本
├── content.js            # 内容注入脚本
├── content.css           # 样式文件
├── popup.html            # 弹出窗口界面
├── popup.js              # 弹出窗口逻辑
├── icons/                # 图标文件夹
└── README.md             # 说明文档
```

## 技术特性

- Manifest V3 兼容
- 响应式设计
- 深色模式支持
- SPA页面变化监听
- 本地缓存管理
- 错误处理和重试机制