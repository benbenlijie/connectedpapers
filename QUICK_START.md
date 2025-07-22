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