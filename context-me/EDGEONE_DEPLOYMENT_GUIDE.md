# 🎯 ContextMe EdgeOne 部署测试指南

## ✅ 重要更新 - Chrome Extension 已更新
🔧 **Chrome Extension 文件已更新为生产环境配置**:
- ✅ `background.js` - API 地址更新为 `https://context-me.edgeone.run/api`
- ✅ `content.js` - API 地址更新为 `https://context-me.edgeone.run/api`
- ✅ `popup.js` - 健康检查更新为生产地址
- ✅ `manifest.json` - 添加 EdgeOne 域名权限

**⚠️ 重要**: 请重新加载 Chrome Extension 以应用新的生产配置！

## 🚀 部署状态
✅ **部署成功！** 项目已成功部署到 EdgeOne
- 🌐 **生产环境地址**: https://context-me.edgeone.run
- 🔄 **CI/CD 状态**: GitHub Actions 自动部署已配置
- 📦 **优化状态**: 包大小已优化至 128MB 限制内

## 📋 完整测试清单

### 0. 🔧 Chrome Extension 重新加载
在开始测试前，必须重新加载 Chrome Extension：

1. 打开 Chrome 浏览器
2. 进入 `chrome://extensions/`
3. 找到 ContextMe 扩展
4. 点击 **🔄 刷新按钮** 重新加载扩展
5. 确认扩展已重新启用（没有错误图标）

### 1. 🌐 网站基础功能测试

#### 1.1 访问主页
- [ ] 访问 https://context-me.edgeone.run
- [ ] 检查页面是否正常加载（应该自动重定向到 `/dashboard`）
- [ ] 确认没有 404 或 500 错误

#### 1.2 登录功能测试
- [ ] 点击 **"Sign in with Google"** 按钮
- [ ] 完成 Google OAuth 登录流程
- [ ] 确认登录成功并重定向到 dashboard
- [ ] 检查用户信息是否正确显示（头像、姓名、邮箱）

#### 1.3 Dashboard 功能测试
- [ ] 检查用户头像和信息显示
- [ ] 测试 AI 分析开关功能
- [ ] 测试 Mock AI 开关功能
- [ ] 查看使用统计信息
- [ ] 测试个人资料编辑功能

### 2. 🔗 API 端点测试

#### 2.1 健康检查
```bash
curl https://context-me.edgeone.run/api/health
```
- [ ] 确认返回状态码 `200`
- [ ] 确认返回正确的 JSON 响应

#### 2.2 认证相关 API
```bash
# 检查会话状态
curl https://context-me.edgeone.run/api/auth/session
```
- [ ] 未登录时返回空对象
- [ ] 登录后返回用户会话信息

#### 2.3 用户资料 API
- [ ] 登录后测试 GET `/api/user/profile`
- [ ] 测试 POST `/api/user/profile` 更新资料

#### 2.4 内容分析 API
- [ ] 测试 POST `/api/content/analyze` 端点
- [ ] 测试 POST `/api/insights/generate` 端点

### 3. 🧩 Chrome Extension 测试

#### 3.1 扩展安装和启用
1. **重新加载扩展**（重要！）：
   - 打开 `chrome://extensions/`
   - 找到 ContextMe 扩展
   - 点击 🔄 刷新按钮
   - 确认扩展正常运行

2. **权限确认**：
   - [ ] 确认扩展没有权限错误
   - [ ] 检查 manifest.json 权限是否正确加载

#### 3.2 扩展弹窗测试
- [ ] 点击扩展图标打开弹窗
- [ ] 检查是否显示 "Connection established" 状态
- [ ] 测试 AI 分析开关
- [ ] 测试 Mock AI 开关
- [ ] 检查用户信息显示
- [ ] 测试设置页面功能

#### 3.3 内容脚本测试
1. **打开任意网页**（建议使用文章页面）
2. **检查扩展行为**：
   - [ ] 扩展图标应该正常显示
   - [ ] 右键菜单应该有 ContextMe 选项
   - [ ] 点击扩展或右键菜单应该显示分析界面

3. **内容分析功能**：
   - [ ] 选择页面文本内容
   - [ ] 右键选择 "Analyze with ContextMe"
   - [ ] 或使用快捷键 Ctrl/Cmd + Shift + A
   - [ ] 检查是否成功提取和分析内容
   - [ ] 查看分析结果显示

#### 3.4 认证集成测试
- [ ] 在扩展中测试 Google 登录
- [ ] 确认扩展能正确获取用户 token
- [ ] 测试扩展的登录/登出功能
- [ ] 验证扩展与后端的认证同步

#### 3.5 实时分析测试
- [ ] 开启 AI 分析功能
- [ ] 浏览不同类型的网页
- [ ] 测试扩展的内容提取能力
- [ ] 验证分析结果的准确性

### 4. 🔍 连接和集成测试

#### 4.1 扩展与后端通信
- [ ] 测试扩展向 EdgeOne 后端发送请求
- [ ] 验证 API 调用是否正常工作
- [ ] 检查跨域请求是否成功
- [ ] 确认认证 token 正确传递

#### 4.2 数据同步测试
- [ ] 在网站上更新用户资料
- [ ] 检查扩展是否同步更新
- [ ] 在扩展中更新设置
- [ ] 验证网站端是否反映更改

### 5. 🚨 错误处理测试

#### 5.1 网络错误处理
- [ ] 测试断网情况下扩展的行为
- [ ] 测试 API 不可用时的降级处理
- [ ] 检查错误消息是否友好显示

#### 5.2 认证错误处理
- [ ] 测试 token 过期时的处理
- [ ] 测试无效权限时的错误提示
- [ ] 验证重新登录流程

## 🛠️ 常见问题排查

### Chrome Extension 问题

#### 扩展无法加载
1. 检查 `chrome://extensions/` 中是否有错误
2. 查看扩展的错误日志
3. 重新加载扩展
4. 检查 manifest.json 语法

#### API 连接失败
1. 确认扩展已重新加载（使用新的生产地址）
2. 检查网络连接
3. 验证 `https://context-me.edgeone.run/api/health` 是否可访问
4. 检查 CORS 配置

#### 认证问题
1. 清除浏览器缓存和扩展数据
2. 重新登录 Google 账户
3. 检查 OAuth 配置是否正确
4. 验证 token 存储

### 网站问题

#### 页面无法加载
1. 检查 EdgeOne 部署状态
2. 验证域名配置
3. 检查 SSL 证书
4. 查看 EdgeOne 日志

#### 登录失败
1. 检查 Google OAuth 配置
2. 验证环境变量设置
3. 检查 NEXTAUTH_URL 配置
4. 查看服务器日志

## 📊 测试结果记录

### 网站测试结果
- [ ] 主页加载: ✅ / ❌
- [ ] Google 登录: ✅ / ❌
- [ ] Dashboard 功能: ✅ / ❌
- [ ] API 健康检查: ✅ / ❌

### Chrome Extension 测试结果
- [ ] 扩展加载: ✅ / ❌
- [ ] 弹窗功能: ✅ / ❌
- [ ] 内容分析: ✅ / ❌
- [ ] 后端连接: ✅ / ❌
- [ ] 认证集成: ✅ / ❌

## 🎯 下一步

### 测试完成后
1. **记录所有问题**：发现的问题请详细记录
2. **性能优化**：根据测试结果进行必要的优化
3. **用户反馈收集**：准备收集早期用户反馈
4. **监控设置**：设置生产环境监控

### 联系支持
如果测试过程中遇到问题：
1. 检查 EdgeOne 控制台的部署日志
2. 查看 GitHub Actions 的构建日志
3. 检查 Chrome 开发者工具的控制台错误
4. 验证所有环境变量配置正确

---

**🎉 恭喜！ContextMe 已成功部署到 EdgeOne，现在可以开始完整测试了！**