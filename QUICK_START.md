# ⚡ 快速启动指南

只需几分钟即可运行Academic Paper Explorer项目！

## 🎯 最快开始方式

### 在线体验（0分钟）
直接访问在线演示：**[https://2n1zupauauvf.space.minimax.io](https://2n1zupauauvf.space.minimax.io)**

### 本地运行（5分钟）

```bash
# 1. 克隆项目
git clone https://github.com/benbenlijie/connectedpapers.git
cd connectedpapers

# 2. 进入前端目录
cd academic-paper-explorer

# 3. 安装依赖并启动（自动安装pnpm）
npm run dev
```

访问 `http://localhost:5173` 即可使用！

## 🛠️ 环境要求

- **Node.js**: 18.0+ （推荐使用18.x LTS版本）
- **包管理器**: npm/pnpm/yarn（项目会自动处理pnpm安装）

## 📝 验证安装

启动后应该能够：
- ✅ 搜索学术论文
- ✅ 查看论文详情
- ✅ 生成网络关系图

## 🐛 遇到问题？

### 常见解决方案

1. **Node.js版本过低**:
   ```bash
   # 使用nvm安装Node.js 18
   nvm install 18
   nvm use 18
   ```

2. **网络连接问题**:
   ```bash
   # 使用国内镜像
   npm config set registry https://registry.npmmirror.com
   ```

3. **权限问题（Windows）**:
   以管理员身份运行命令行

4. **端口占用**:
   项目会自动寻找可用端口，或手动指定：
   ```bash
   npm run dev -- --port 3000
   ```

## 🚀 下一步

- 📖 查看 [完整README](README.md) 了解详细功能
- 🔧 查看 [部署指南](DEPLOYMENT_GUIDE.md) 部署到生产环境
- 🐛 遇到问题查看 [故障排除指南](README.md#🐛-故障排除)

---

💡 **提示**: 项目使用已配置好的Supabase后端，无需额外配置即可使用所有功能！

## 常见问题解决

### 问题：点击论文后出现"Loading failed - Edge Function returned a non-2xx status code"错误

**原因**：这个错误通常是由于Semantic Scholar API的速率限制导致的403 Forbidden错误。

**立即解决方案**：
1. **等待重试**：等待1-2分钟后重新尝试
2. **选择其他论文**：尝试点击不同的论文
3. **避免高峰时段**：在非高峰时段（如深夜或清晨）使用

**长期解决方案**：
1. **配置API密钥**（推荐）：
   - 访问 [Semantic Scholar API页面](https://www.semanticscholar.org/product/api)申请API密钥
   - 在Supabase控制台配置`SEMANTIC_SCHOLAR_API_KEY`环境变量
   - 详细步骤请参考 [网络图修复指南](NETWORK_GRAPH_FIX.md)

2. **检查错误详情**：
   - 打开浏览器开发者工具（F12）
   - 查看控制台标签页获取详细错误信息

### 问题：搜索没有结果

**解决方案**：
1. 检查搜索关键词拼写
2. 尝试使用英文关键词
3. 使用更具体或更宽泛的搜索词

### 问题：网络图加载缓慢

**解决方案**：
1. 选择引用数较少的论文
2. 减少网络深度设置
3. 确保网络连接稳定