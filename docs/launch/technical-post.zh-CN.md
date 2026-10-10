# CiteDuo 是如何判断两篇论文相关的

仓库：https://github.com/benbenlijie/citeduo · 在线 Demo：https://watchdeep.net/paper-demo/

我做 CiteDuo，是因为一个反复出现的场景：同时打开两篇论文，隐约觉得它们有关，却没有任何顺手的办法问清楚这个关系到底是什么。引用图工具擅长回答的是另一个问题——这篇论文周围有什么。但当两篇论文都已经摆在我面前时，在图上连一条线并不构成回答。那条线可能是直接引用、共同祖先、共被引、推荐器的一次猜测，也可能是两段摘要的向量恰好靠得近。这些是完全不同的论断，不应该用同一种画法呈现。

`POST /api/connect` 接收两个论文 id，返回排序后的路径、每一跳的一句话说明，以及一组信号。下面写的是代码今天实际做的事，以及我仍然没把握的地方。

## 边与边不能等价看待

`server/pathfind.ts` 开头就把问题挑明了：这张关系表里混着语义完全不同的边。`reference` 与 `citation` 是来自 Semantic Scholar 的有向引用事实；`coupling` 是对称的共引文献（bibliographic coupling）；`related` 是推荐器的亲和度（S2 推荐与 OpenAlex 相关作品）；`semantic` 是 SPECTER2 的 k 近邻相似度。把这五种边当成同一种无权边来走，只会得到自信的胡话。所以代码首先给每种类型一个基础置信度 `edgeConfidence`：`reference` 1.0、`citation` 0.95、`coupling` 0.8、`related` 0.6、`semantic` 0.45。

`reference` 和 `citation` 的差别只关乎来源，不关乎含义——两者都是"引用方 → 被引方"。在 `connect.ts:absorb` 里，一篇论文自己的参考文献列表会生成 `reference` 边，它的被引列表会生成 `citation` 边。参考文献条目是引用方直接给出的断言，所以给满 1.0；从另一端点被引列表里发现的同一事实只给 0.95。这 0.05 是我的判断，不是测量结果。

其余类型的边在 `graph.ts` 与 `embeddings.ts` 里构建。`bibliographicCoupling` 在本地计算耦合，把共同参考文献的数量直接存为权重，只保留达到 `config.related.couplingMin`（2）的对；`addRelatedNodes` 用 S2 推荐和 OpenAlex 相关作品补 `related` 边，权重大致等于在列表中的位置（`recommendLimit` 与 `openalexLimit` 默认都是 10）；`semanticNeighborEdges` 构建 kNN 边，`k = embeddingK`（5）、`minSim = embeddingMinSim`（0.8），权重就是余弦相似度。

遍历时刻意不区分方向：被一篇论文引用，同样把你连进了它的脉络；`pathfind.ts` 的头注释也指出，这类图本来就会被排成无向的。这里只提一次 Connected Papers，因为 README 也是拿它作对照。代码唯一不肯丢的是方向：一个 `PathStep` 同时带着存储时的 `from`/`to`、这一跳实际到达的节点，以及一个 `forward` 标志。

## 排序：一条路径的可信度取决于它最弱的那一跳

上面五个常数只是基准，不是评分。`hopConfidence(type, weight)` 会把边自身的权重折进类型置信度：`semantic` 按余弦相似度缩放，下限 0.2；`coupling` 按 `0.75 + log10(weight + 1) / 2` 增长并封顶 1，所以共享 40 篇文献的一对比刚好卡在阈值上的那一对更可信；`related` 走一条更平缓的同类曲线。

`pathScore` 把这些单跳置信度合成 `((平均值 + 最弱值) / 2) * 100 / (hops + 1)`。只看平均值，会让一个可疑的跳藏在几个靠谱的跳后面；引入最弱值，是因为一条链的可信度不会超过它最脆弱的一环。分母的 `hops + 1` 则让质量相同时更短的路径胜出。

`rankedPaths` 最多收集 `maxPaths`（3）条互不相同的路线：每找到一条，就禁掉这条路径中间的那个内部节点，再搜一次，最多尝试 `limit * 3` 次。禁内部节点是一种很便宜的去重方式，能让答案在结构上真正不同，而不是同一路线的小幅挪动——一条耦合桥和一条引用链能同时出现在回复里，靠的就是这一步。底层的路径搜索 `bidirectionalPath` 是分层同步的双向 BFS，优先展开较浅的一侧，每侧深度上限 `ceil(maxHops / 2)`，并有 20000 个节点的 `maxVisited` 兜底。

## 从路径到成句的解释

排好序的路径本质上还只是一串节点。`explainHop` 用一个针对五种边类型的 switch，把每一跳变成一句话，比如「X 引用了 Y」「X 与 Y 存在共同引用（文献耦合）」「X 与 Y 语义相似（SPECTER2 ≈ 0.87）」。`describePath` 负责整条路径的一句话总结，两者都建立在 `classifyPath` 之上。`classifyPath` 会把路径归为六种之一：`same_paper`、`direct`、`citation_path`、`coupling`、`co_citation`、`semantic_bridge`。

分类依据的是形状，而不是存储时的类型标签。两跳引用性质的边如果都指向同一个节点，就是耦合；如果都从同一个节点出发，就是共被引。单独一条已存的 `coupling` 汇总行，绝不会被包装成"A 引用了 B"；全语义的路线永远是语义桥。前端把每种类型映射成一枚标签——直接引用、文献耦合、共被引、语义相似——让人先看到论断，再读解释。

这里要纠正我自己 README 里的一句话：README 说单跳结论会直接按边类型命名。对 `reference`、`citation`、`coupling` 来说没错，但单独一条 `related` 或 `semantic` 跳会被归类为 `semantic_bridge`，因为相似度的猜测不应该被当作引用陈述。要改的话，我改 README 那句话，不改函数。

备选路径会折叠在「其他 N 条路径」下面，每条同样带类型标签和一句话总结。如果最佳路径是一条耦合桥，备选是一条语义桥，第三条是两跳引用链，你就能看出：关系是真实的，但具体走法并不唯一；或者所有结论其实都压在同一种证据上。一条路径都找不到时，下面的信号本身就是答案，而不是安慰奖。

## 四层策略，由廉到贵

`connect.ts` 是照着一个成本模型写的。

第一层：一次批量 Semantic Scholar 调用同时抓取两个端点。请求的字段里已经内嵌了各自的参考文献与被引列表，足够立刻发现直接引用、耦合与共被引。这一层是尽力而为：失败时置上 `upstreamUnavailable`，退回 SQLite 里已有的数据。

第二层：`loadLocalEdges` 读出 `paper_relations` 的全部行，再把 `citations` 表当作权重为 1 的 `reference` 边一起读进来。这一层不花任何网络开销；对你之前探索过的论文，它往往已经包含答案。

第三层：实时雪球抓取，只在前两层都没找到时才启动。循环条件是 `while (batches < maxExpansions && Date.now() - started < maxExecutionMs)`；`pickFrontier` 选出下一批尚未见过的候选，`absorb` 为每篇展开的论文最多取 `refLimit`（40）篇参考文献和 `citeLimit`（25）篇被引文献，然后重新搜索一次。找到第一条路径就退出，某一批抓取失败也退出，并把已经收集到的结果留下。

第四层：向量兜底。`loadVectors` 先读缓存的 SPECTER2 向量，只对缺失的部分发一次尽力而为的批量请求。接着 `findSemanticBridge` 在最多 200 个已知节点里，挑出使 `min(sim(A, Z), sim(Z, B))` 最大、且高于 `semanticMinSim`（0.75）的那篇中间文献；如果没有这样的桥，但两个端点自身的余弦相似度越过了同一道线，就输出一条单跳语义边。桥之所以用对称的最小值，是一种刻意的保守：只和其中一端像、和另一端无关的文献，不构成任何证据。

旋钮都在 `server/config.ts` 里，也都能用环境变量覆盖：`CONNECT_MAX_EXPANSIONS`（6）、`CONNECT_MAX_MS`（25000）、`CONNECT_BATCH_SIZE`（30）、`CONNECT_FRONTIER_LIMIT`（60）、`CONNECT_REF_LIMIT`（40）、`CONNECT_CITE_LIMIT`（25）、`CONNECT_MAX_HOPS`（6）、`CONNECT_MAX_PATHS`（3）、`CONNECT_SEMANTIC_MIN_SIM`（0.75）以及 `CONNECT_LOCAL_ONLY`。请求里的 `max_hops` 会在 `routes/connect.ts` 里被夹到 1–8。第一层的代价是一次请求，第三层可能是六批抓取加 25 秒。默认策略是：便宜的答案没穷尽之前，一分钱都不花。

还有一个我挺喜欢的细节：`search()` 第一次构建邻接表时会把 coupling 边过滤掉，只有在这次严格搜索什么都没找到时，才会把它们放回来重搜一次。已存的 coupling 行是一份反规范化（denormalized）的摘要；直接走它会用一条单跳捷径，恰好把用户想看的那几篇共同文献藏起来。保留兜底那一轮，是为了应对底层引用行从未被缓存的情况。

## 路径之外的信号

除了路径，`findConnection` 还会返回 `sharedReferences` 与 `sharedCiters`（两个端点各自列表的交集，各最多 10 条）、`semanticSimilarity`（保留三位小数）、`sharedFields` 以及 `sharedAuthors`（最多 8 个）。它们很便宜，和第一层共用同一份 payload，也因此只和那一份响应一样完整。

## 本地优先是工程约束，不是口号

整个应用就是一个 Bun 进程加一个 SQLite 文件（`data/app.db`，开启 WAL 与 foreign keys）。没有账号，没有云。每次关联搜索结束都会调用 `persistLearned`——写论文 stub、为 reference 边调 `upsertCitation`、再用 `persistRelations` 写入完整边表，全部是尽力而为——所以今天建的一张图，会让明天同一对论文的搜索更丰富。`stats.source` 取 `'local'` 或 `'live'`；前端分别显示「来自本地缓存」和「含联网扩展」；第一层抓取失败时，结果照样返回，只是带上一条琥珀色的「上游不可用」提示。设 `CONNECT_LOCAL_ONLY=1`，或请求里带 `live: false`，就用 SQLite 里已有的知识立刻作答。离线不是事后补上的降级模式，它就是前两层。

## 我不确定的地方

上游限流对设计的影响比我愿意承认的更大。S2 的限流器在匿名状态下把请求间隔拉到 1000ms，有 key 时 100ms；而共享配额对相当大比例的请求直接回 429，所以批量调用改成从 300ms 起退避重试三次，而不是在一个交互请求里先睡满 8.4 秒。即便如此，雪球仍可能中途撞上 `CONNECT_MAX_MS` 并返回一张残缺的图，`stats.truncated` 会把这种情况标出来。某一批抓取失败时，循环是直接退出，而不是让整个请求失败——本地什么都没有的时候，现在会返回 503 让你稍后重试，而不是伪装成"找不到这篇论文"。

结论的质量上限就是上游元数据的质量，这是我想得最多的一条限制。每条路径都要经过被我们截断到每次展开 40 篇参考文献、25 篇被引文献的列表；耦合则至少要共享 2 篇文献才算数。如果真正的连接点是某篇在上游参考文献列表为空的论文，再多的本地搜索也补不回来。诚实的说法是：CiteDuo 是在一份残缺的公开记录上推理的，这一点应该比现在说得更响。

排序 tiebreak 的第一版其实没生效，而且是靠秒表才发现的。`orderReferences` 先把共同文献排在前面，再按 `citationCount` 排序；`pickFrontier` 也按引用数排序——但 `server/s2.ts` 里的 `FIELDS` 并没有请求嵌套参考文献上的引用数，于是两个比较器读到的都是 `undefined`，"引用最多优先"完全空转。同一个请求里还藏着两笔开销：它把每篇论文的完整被引列表（最多 1000 条、约 200KB/篇）塞进响应，而调用方只留 25 条；学到的边又是逐条提交，约 4500 次。结果是：在已经有缓存的库上，一次查询要 10-15 秒。把被引侧改成单独限量抓取、把学到的边放进一个事务、再缩短重试退避之后，同一个查询降到约 1 秒。我留下的教训是：比较器读到 `undefined` 不会报错，只有实测才能让它露出来。

解释层只有中文。`explainHop` 返回的是硬编码的中文字符串，面板上的标签也是中文，关系解释背后没有 i18n 层。`forward` 被计算、被序列化、也进了 schema 校验，但面板只渲染 `hop.text`，这个字段是为一个还不存在的界面准备的。

单进程有它的边界。建图走的是数据库里的 jobs 表，启动时有 `recoverJobs()`，但没有 worker 池，也没有并发控制。而 `/api/connect` 根本不是一个 job：路由注释里说它是全应用等待最久的端点，客户端只能转圈，不做轮询。我不敢保证这个简化在真正慢的上游面前还站得住。缓存失效的粒度也很粗：一改 `graphVersion`，所有缓存网络同时作废；网络缓存 TTL 24 小时、论文 168 小时，关系行没有 TTL，所以纯本地的答案可能自信地过期。Demo 用的是快照数据库，限流更严、没有配置 LLM，那里返回的关系结论反映的是那份快照，而不是实时上游。

为了至少有一个我能核实的具体数字，我跑了后端测试：`bun run test:server` 报告 214 项通过、479 次 `expect()`。前端测试数量我在这里不引用，因为我没能在自己的环境里复现 README 里的数字。

## 什么情况下我会改变设计

如果 Semantic Scholar 或 OpenAlex 能给出一个经过校准、确实靠得住的成对相关度分数，那这里的大部分工作就退化成展示问题。我目前还没见过一个我会让它压过耦合信号的分数。

如果有正经研究证明向量桥和文献耦合一样有信息量，我会把 `semantic` 提到 `related` 之上，甚至更靠近 `coupling`。我的 0.45 是先验，不是标定结果；带人工一致性标注的论文对能推动这个数字，我更希望有人告诉我错了，而不是守着一个自己辩护不了的权重。

如果查询全局图足够便宜——比如预先算好的引用语料 CSR 加缓存向量——我会用一个真正的索引替掉这场有预算的雪球，顺手删掉截断逻辑。四层结构之所以存在，是因为我没有那个索引，不是因为它优雅。

就现在而言，`pathfind.ts` 是一个跑在 `Map<string, Traversal[]>` 上的纯函数，里面没有数据库，也没有网络；`connect.ts` 是唯一关心成本的地方。这个分工是我最愿意为之辩护的部分，因为排序规则可以在没有限流干扰的情况下被讨论、被测试。
