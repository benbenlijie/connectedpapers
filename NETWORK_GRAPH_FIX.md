# 网络图生成错误修复指南

## 问题描述
在选择一篇论文来生成网络图的时候，会弹出"Edge Function returned a non-2xx status code"错误。

## 根本原因分析
经过分析，发现该错误主要由以下几个原因造成：

1. **环境变量缺失**：Edge Function需要正确配置的环境变量
2. **论文ID格式不兼容**：不同数据源的论文ID格式不统一
3. **API限制**：Semantic Scholar API的访问限制
4. **错误处理不完善**：缺乏详细的错误信息和备用方案

## 修复方案

### 1. 改进的错误处理 (`supabase/functions/fetch-paper-network/index.ts`)

- **详细的错误分类**：将不同类型的错误分类处理，提供具体的错误信息
- **环境变量检查**：在函数开始时检查所有必需的环境变量
- **多层容错机制**：添加缓存检查、API调用、数据构建等各个环节的异常处理

```typescript
// 新增的错误代码:
- INVALID_JSON: JSON解析错误
- MISSING_PAPER_ID: 缺少论文ID
- SUPABASE_CONFIG_MISSING: Supabase配置缺失
- PAPER_FETCH_FAILED: 论文获取失败
- PAPER_NOT_FOUND: 论文未找到
- NETWORK_BUILD_FAILED: 网络构建失败
```

### 2. 论文ID兼容性改进

- **智能ID识别**：自动识别DOI、arXiv ID、Semantic Scholar ID等不同格式
- **优先级策略**：优先使用Semantic Scholar ID，其次DOI，最后其他ID
- **OpenAlex备用查询**：当直接查询失败时，尝试通过OpenAlex获取DOI再查询

### 3. 前端用户体验改进 (`academic-paper-explorer/src/`)

- **详细的日志记录**：添加详细的控制台日志以便调试
- **用户友好的错误提示**：根据错误类型显示具体的解决建议
- **备用网络显示**：当无法获取完整网络时，显示单节点基础网络

### 4. 新增功能

- **基础网络备用方案**：当API调用完全失败时，创建包含单个节点的基础网络
- **警告信息显示**：在成功但有限制的情况下显示警告信息
- **环境变量模板**：提供`.env.example`文件说明所需的环境变量

## 部署和配置

### 必需的环境变量

在Supabase项目中需要配置以下环境变量：

```bash
# 可选但推荐，用于提高API访问限制
SEMANTIC_SCHOLAR_API_KEY=your_api_key_here

# 必需，Supabase项目配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 可选，用于API请求的联系邮箱
CONTACT_EMAIL=your-email@example.com
```

### 验证修复效果

1. **检查Edge Function日志**：在Supabase控制台查看函数执行日志
2. **前端控制台**：打开浏览器开发者工具查看详细的错误信息
3. **测试不同论文源**：尝试选择来自不同数据源的论文（Semantic Scholar、OpenAlex、CrossRef）

## 常见问题解决

### Q1: 仍然看到"non-2xx status code"错误
**解决方案**：
1. 检查Supabase Edge Function的环境变量配置
2. 查看Edge Function执行日志以获取具体错误信息
3. 确认Semantic Scholar API访问正常

### Q2: 网络图只显示单个节点
**解决方案**：
1. 这可能是正常的备用方案，说明该论文在Semantic Scholar中没有引用数据
2. 尝试选择被引用次数更高的论文
3. 检查是否是OpenAlex论文，系统会尝试通过DOI查找

### Q3: 某些论文无法生成网络图
**解决方案**：
1. 确认论文ID格式正确
2. 对于OpenAlex论文，确保有DOI信息
3. 尝试使用论文的DOI而不是其他ID格式

## 技术细节

### 修改的文件列表
1. `supabase/functions/fetch-paper-network/index.ts` - 主要错误处理改进
2. `academic-paper-explorer/src/hooks/useApiQueries.ts` - 前端API调用改进
3. `academic-paper-explorer/src/components/PaperList.tsx` - 论文选择逻辑改进
4. `academic-paper-explorer/src/components/NetworkGraph.tsx` - 网络图显示改进

### 新增的功能特性
- 多格式论文ID支持
- 智能错误分类和处理
- 备用网络构建方案
- 详细的调试日志
- 环境变量验证

这些修复应该显著减少"Edge Function returned a non-2xx status code"错误的发生，并在错误确实发生时提供更好的用户体验和调试信息。