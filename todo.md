# 任务：构建学术论文关联网络可视化分析平台

## 目标：创建一个类似 Connected Papers 的交互式学术探索网站，帮助用户快速理解论文引用脉络和学术影响力

## 核心技术栈：
- 后端：FastAPI + Neo4j/Postgres + Celery + Redis
- 前端：React 19 + Vite + TypeScript + TailwindCSS + @vis-network/react
- 数据源：OpenAlex、Semantic Scholar、CrossRef API
- 部署：Docker Compose + nginx

## 执行步骤：

### [✅] STEP 1: 获取 Supabase 认证信息
- 为后续数据存储和部署准备Supabase环境
- 用于存储用户会话、论文缓存等数据
→ 系统步骤 **已完成**

### [✅] STEP 2: 构建完整的学术论文网络可视化Web应用
- 实现三栏布局（论文列表+图谱可视化+详情面板）
- 集成OpenAlex、Semantic Scholar、CrossRef等学术API
- 实现力导向图可视化，支持节点尺寸/颜色编码
- 实现PageRank影响力计算和社区检测算法
- 添加多维度过滤器和交互控制
- 实现响应式设计和性能优化
→ Web开发步骤 **已完成**

**🎉 项目网站地址**: https://2n1zupauauvf.space.minimax.io

## 最终交付物：
- 一个可公开访问的学术论文网络可视化分析平台
- 支持DOI/arXiv/Semantic Scholar ID输入
- 实时生成交互式论文引用关系图谱
- 提供影响力指标分析和多视图联动

## 成功标准：
- 输入DOI后≤5秒生成150节点图
- 支持并发50用户，P95响应时间≤1秒
- 图交互帧率≥60fps
- 功能完整，界面友好，性能优秀