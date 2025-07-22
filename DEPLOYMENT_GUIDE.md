# 📚 详细部署指南

本文档提供Academic Paper Explorer项目的详细部署指南，包括前端和后端的完整部署流程。

## 🎯 部署概览

项目包含两个主要部分：
- **前端**: React应用（部署到Vercel/Netlify等静态托管服务）
- **后端**: Supabase项目（数据库 + Edge Functions）

## 🔥 一键部署（推荐新手）

### 使用已配置的Supabase实例

项目已经配置好了一个可用的Supabase实例，可以直接部署前端：

1. **Fork项目到你的GitHub**
2. **部署到Vercel**:
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/benbenlijie/connectedpapers)
3. **配置构建设置**:
   - Build Command: `cd academic-paper-explorer && pnpm build`
   - Output Directory: `academic-paper-explorer/dist`
   - Install Command: `cd academic-paper-explorer && pnpm install`

## 🏗️ 自定义Supabase部署

如果你想使用自己的Supabase项目：

### 步骤1: 创建Supabase项目

1. 访问 [supabase.com](https://supabase.com)
2. 点击 "New Project"
3. 填写项目信息并创建

### 步骤2: 设置数据库表

在Supabase SQL编辑器中依次执行以下文件：

```sql
-- 1. 创建papers表
CREATE TABLE papers (
    id VARCHAR PRIMARY KEY,
    semantic_scholar_id VARCHAR,
    openalex_id VARCHAR,
    title TEXT NOT NULL,
    abstract TEXT,
    publication_year INTEGER,
    citation_count INTEGER DEFAULT 0,
    authors TEXT,
    venue TEXT,
    journal TEXT,
    url TEXT,
    doi VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 创建authors表
CREATE TABLE authors (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    semantic_scholar_id VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 创建paper_authors关联表
CREATE TABLE paper_authors (
    paper_id VARCHAR REFERENCES papers(id),
    author_id INTEGER REFERENCES authors(id),
    PRIMARY KEY (paper_id, author_id)
);

-- 4. 创建citations表
CREATE TABLE citations (
    citing_paper_id VARCHAR REFERENCES papers(id),
    cited_paper_id VARCHAR REFERENCES papers(id),
    PRIMARY KEY (citing_paper_id, cited_paper_id)
);

-- 5. 创建paper_networks表
CREATE TABLE paper_networks (
    id SERIAL PRIMARY KEY,
    root_paper_id VARCHAR NOT NULL,
    network_data JSONB,
    depth INTEGER DEFAULT 1,
    max_nodes INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. 创建search_queries表
CREATE TABLE search_queries (
    id SERIAL PRIMARY KEY,
    query TEXT NOT NULL,
    results_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 步骤3: 部署Edge Functions

1. **安装Supabase CLI**:
```bash
npm install -g supabase
```

2. **初始化项目**:
```bash
supabase login
supabase init
```

3. **部署函数**:
```bash
# 部署搜索函数
supabase functions deploy search-papers --project-ref YOUR_PROJECT_REF

# 部署网络获取函数
supabase functions deploy fetch-paper-network --project-ref YOUR_PROJECT_REF
```

### 步骤4: 配置环境变量

在Supabase控制台的"Edge Functions"页面设置环境变量：

```env
SEMANTIC_SCHOLAR_API_KEY=your_optional_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 步骤5: 更新前端配置

修改 `academic-paper-explorer/src/lib/supabase.ts`:

```typescript
const supabaseUrl = 'https://your-project.supabase.co'
const supabaseAnonKey = 'your_anon_public_key'
```

## 🌐 前端部署选项

### 选项1: Vercel（推荐）

1. **连接GitHub仓库**
2. **配置构建设置**:
   - Framework Preset: `Other`
   - Build Command: `cd academic-paper-explorer && pnpm build`
   - Output Directory: `academic-paper-explorer/dist`
   - Install Command: `cd academic-paper-explorer && pnpm install`
   - Node.js Version: `18.x`

3. **部署**:
   点击"Deploy"，Vercel将自动构建和部署

### 选项2: Netlify

1. **连接GitHub仓库**
2. **配置构建设置**:
   - Base directory: `academic-paper-explorer`
   - Build command: `pnpm build`
   - Publish directory: `academic-paper-explorer/dist`

### 选项3: GitHub Pages

1. **创建GitHub Actions工作流**:

创建 `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install pnpm
      uses: pnpm/action-setup@v2
      with:
        version: latest
        
    - name: Install dependencies
      run: cd academic-paper-explorer && pnpm install
      
    - name: Build
      run: cd academic-paper-explorer && pnpm build
      
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./academic-paper-explorer/dist
```

2. **启用GitHub Pages**:
   - 在仓库设置中启用GitHub Pages
   - 选择"GitHub Actions"作为源

## 🔧 高级配置

### 自定义域名

1. **Vercel**:
   - 在项目设置中添加域名
   - 配置DNS记录指向Vercel

2. **Netlify**:
   - 在站点设置中添加域名
   - 配置DNS记录指向Netlify

### HTTPS和安全

所有推荐的部署平台都自动提供HTTPS证书。

### 性能优化

1. **启用压缩**: 平台默认启用Gzip/Brotli压缩
2. **缓存策略**: 配置静态资源缓存
3. **CDN**: 平台自动提供全球CDN

## 🐛 常见部署问题

### 1. 构建失败

**问题**: Node.js版本不兼容
**解决**: 确保使用Node.js 18+

**问题**: pnpm命令未找到
**解决**: 在构建命令前添加pnpm安装:
```bash
npm install -g pnpm && cd academic-paper-explorer && pnpm install && pnpm build
```

### 2. Edge Functions错误

**问题**: 函数部署失败
**解决**: 
- 检查Supabase CLI版本
- 确认项目权限
- 验证函数代码语法

**问题**: 环境变量未生效
**解决**: 
- 在Supabase控制台重新设置
- 重新部署函数

### 3. 网络请求失败

**问题**: CORS错误
**解决**: Edge Functions已配置CORS，检查Supabase URL配置

**问题**: API限制
**解决**: 
- 申请Semantic Scholar API密钥
- 实现请求重试机制

## 📊 监控和日志

### Supabase监控

1. **函数日志**: 在Supabase控制台查看Edge Functions日志
2. **数据库监控**: 查看查询性能和资源使用

### 前端监控

1. **Vercel Analytics**: 启用内置分析
2. **错误追踪**: 集成Sentry等错误监控服务

## 🔄 CI/CD自动化

### GitHub Actions示例

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    - uses: pnpm/action-setup@v2
    - name: Install and test
      run: |
        cd academic-paper-explorer
        pnpm install
        pnpm build
        
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - name: Deploy to Vercel
      # 使用Vercel部署Action
```

## 🎉 部署完成检查

部署完成后，验证以下功能：

- [ ] 首页正常加载
- [ ] 搜索功能正常工作
- [ ] 论文详情展示正确
- [ ] 网络图生成功能正常
- [ ] 响应式设计在移动端正常
- [ ] 控制台无错误信息

## 📞 获取帮助

如果在部署过程中遇到问题：

1. 检查本文档的故障排除部分
2. 查看GitHub Issues
3. 在项目仓库提交Issue
4. 联系项目维护者

---

🎯 **提示**: 推荐先使用默认配置的Supabase实例进行快速部署，熟悉流程后再考虑自定义配置。