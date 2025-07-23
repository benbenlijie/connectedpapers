# Academic Paper Explorer - 学术论文关系网络探索器

<div align="center">
  <img src="https://img.shields.io/badge/React-18.3.1-blue" alt="React Version" />
  <img src="https://img.shields.io/badge/TypeScript-5.6.2-blue" alt="TypeScript Version" />
  <img src="https://img.shields.io/badge/Vite-6.0.1-purple" alt="Vite Version" />
  <img src="https://img.shields.io/badge/Supabase-2.52.0-green" alt="Supabase Version" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4.16-cyan" alt="TailwindCSS Version" />
</div>

## 🎯 项目介绍

Academic Paper Explorer 是一个现代化的学术论文搜索和关系网络可视化平台。用户可以搜索学术论文，查看论文详情，并生成基于引用关系的交互式网络图，帮助研究者更好地理解学术领域的知识结构和论文之间的关联。

### ✨ 核心功能

- **🔍 智能论文搜索**: 支持多数据源的学术论文搜索（Semantic Scholar、OpenAlex、CrossRef）
- **📊 网络图可视化**: 基于引用关系生成交互式论文关系网络图
- **📖 论文详情展示**: 提供论文摘要、作者、发表信息、引用统计等详细信息
- **🎨 现代化UI**: 基于React和TailwindCSS的响应式设计
- **⚡ 高性能**: 使用Vite构建工具和React Query进行状态管理

### 🚀 在线体验

项目已部署上线，可以直接访问体验：
**[https://2n1zupauauvf.space.minimax.io](https://2n1zupauauvf.space.minimax.io)**

## 🛠️ 技术栈

### 前端
- **框架**: React 18.3.1 + TypeScript 5.6.2
- **构建工具**: Vite 6.0.1
- **样式**: TailwindCSS 3.4.16 + Radix UI组件库
- **状态管理**: React Query + Zustand
- **路由**: React Router Dom
- **网络图**: vis-network
- **动画**: Framer Motion

### 后端
- **BaaS**: Supabase (数据库 + Edge Functions)
- **数据库**: PostgreSQL
- **API**: Supabase Edge Functions (Deno运行时)

### 外部API
- **Semantic Scholar API**: 获取论文详情和引用关系
- **OpenAlex API**: 备用论文数据源
- **CrossRef API**: DOI解析和元数据获取

## 📦 项目结构

```
├── academic-paper-explorer/          # 前端React应用
│   ├── src/
│   │   ├── components/              # React组件
│   │   │   ├── NetworkGraph.tsx     # 网络图可视化组件
│   │   │   ├── PaperList.tsx        # 论文列表组件
│   │   │   ├── SearchBar.tsx        # 搜索栏组件
│   │   │   └── ui/                  # UI基础组件
│   │   ├── hooks/                   # 自定义Hook
│   │   │   └── useApiQueries.ts     # API查询钩子
│   │   ├── lib/                     # 工具库
│   │   │   └── supabase.ts          # Supabase客户端配置
│   │   ├── pages/                   # 页面组件
│   │   ├── store/                   # 状态管理
│   │   │   └── useAppStore.ts       # 全局状态store
│   │   └── types/                   # TypeScript类型定义
│   ├── package.json
│   └── vite.config.ts
├── supabase/                        # 后端配置
│   ├── functions/                   # Edge Functions
│   │   ├── search-papers/           # 论文搜索函数
│   │   └── fetch-paper-network/     # 网络数据获取函数
│   └── tables/                      # 数据库表结构
│       ├── papers.sql
│       ├── authors.sql
│       ├── citations.sql
│       └── paper_networks.sql
└── README.md
```

## 🚀 快速开始

### 环境要求

- **Node.js**: 18.0.0 或更高版本
- **pnpm**: 推荐使用pnpm作为包管理器
- **Git**: 用于版本控制

### 1. 克隆项目

```bash
git clone https://github.com/benbenlijie/connectedpapers.git
cd connectedpapers
```

### 2. 安装依赖

```bash
cd academic-paper-explorer
pnpm install
```

### 3. 环境配置

项目使用Supabase作为后端服务，已配置好默认的Supabase实例。如需使用自己的Supabase项目：

1. 创建Supabase项目: [https://supabase.com](https://supabase.com)
2. 更新 `src/lib/supabase.ts` 中的配置：

```typescript
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'
```

### 4. 启动开发服务器

```bash
pnpm dev
```

项目将在 `http://localhost:5173` 启动

### 5. 构建生产版本

```bash
pnpm build
```

构建文件将输出到 `dist/` 目录

## 🔧 Supabase后端配置

### 数据库设置

1. 在Supabase控制台中执行以下SQL文件来创建必要的表：

```sql
-- 执行 supabase/tables/ 目录下的所有SQL文件
-- 顺序：papers.sql -> authors.sql -> paper_authors.sql -> citations.sql -> paper_networks.sql -> search_queries.sql
```

### Edge Functions部署

1. 安装Supabase CLI：

```bash
npm install -g supabase
```

2. 登录Supabase：

```bash
supabase login
```

3. 部署Edge Functions：

```bash
# 进入supabase目录
cd supabase

# 部署所有函数
supabase functions deploy search-papers
supabase functions deploy fetch-paper-network
```

4. 设置环境变量（在Supabase控制台的Edge Functions设置中）：

```env
SEMANTIC_SCHOLAR_API_KEY=your_api_key_here  # 可选，用于提高API限制
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🌐 部署指南

### Vercel部署（推荐）

1. 将项目推送到GitHub
2. 在Vercel中导入项目
3. 构建设置：
   - **Build Command**: `cd academic-paper-explorer && pnpm build`
   - **Output Directory**: `academic-paper-explorer/dist`
   - **Install Command**: `cd academic-paper-explorer && pnpm install`

### Netlify部署

1. 在Netlify中导入GitHub项目
2. 构建设置：
   - **Base directory**: `academic-paper-explorer`
   - **Build command**: `pnpm build`
   - **Publish directory**: `academic-paper-explorer/dist`

### 手动部署

1. 构建项目：

```bash
cd academic-paper-explorer
pnpm build
```

2. 将 `dist/` 目录中的文件部署到任何静态文件托管服务

## 🔑 API密钥配置

### Semantic Scholar API

虽然Semantic Scholar API不强制要求API密钥，但建议申请以获得更高的请求限制：

1. 访问：[https://www.semanticscholar.org/product/api](https://www.semanticscholar.org/product/api)
2. 申请API密钥
3. 在Supabase Edge Functions环境变量中设置 `SEMANTIC_SCHOLAR_API_KEY`

## 🐛 故障排除

### 常见问题

1. **"Loading failed - Edge Function returned a non-2xx status code"错误**
   - **原因**：Semantic Scholar API速率限制导致的403错误
   - **立即解决**：等待1-2分钟后重试，或选择其他论文
   - **长期解决**：申请并配置Semantic Scholar API密钥
   - **详细指南**：参见 [网络图修复指南](NETWORK_GRAPH_FIX.md)

2. **论文搜索无结果**
   - 检查网络连接
   - 确认外部API（Semantic Scholar、OpenAlex）可访问
   - 尝试使用不同的搜索关键词

3. **网络图无法生成**
   - 确认选择的论文有有效的ID（DOI、Semantic Scholar ID等）
   - 检查后端Edge Function日志
   - 尝试选择其他论文

### 调试模式

启用详细日志：

```bash
# 开发环境
VITE_DEBUG=true pnpm dev
```

查看浏览器控制台获取详细的调试信息。

## 🤝 贡献指南

1. Fork项目
2. 创建特性分支：`git checkout -b feature/AmazingFeature`
3. 提交更改：`git commit -m 'Add some AmazingFeature'`
4. 推送到分支：`git push origin feature/AmazingFeature`
5. 打开Pull Request

## 📄 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系方式

- **作者**: benbenlijie
- **GitHub**: [https://github.com/benbenlijie/connectedpapers](https://github.com/benbenlijie/connectedpapers)
- **在线演示**: [https://2n1zupauauvf.space.minimax.io](https://2n1zupauauvf.space.minimax.io)

## 🙏 致谢

- [Semantic Scholar](https://www.semanticscholar.org/) - 提供丰富的学术论文数据
- [OpenAlex](https://openalex.org/) - 开放的学术知识图谱
- [Supabase](https://supabase.com/) - 现代化的后端即服务平台
- [React](https://reactjs.org/) - 用户界面构建库
- [TailwindCSS](https://tailwindcss.com/) - 实用优先的CSS框架

---

<div align="center">
  <b>⭐ 如果这个项目对你有帮助，请给它一个星标！</b>
</div>