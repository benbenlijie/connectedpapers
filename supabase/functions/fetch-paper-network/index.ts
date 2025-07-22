Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const { paper_id, depth = 1, max_nodes = 200 } = await req.json();

        if (!paper_id) {
            throw new Error('论文ID不能为空');
        }

        console.log('开始构建论文网络:', { paper_id, depth, max_nodes });

        // 获取环境变量
        const semanticScholarApiKey = Deno.env.get('SEMANTIC_SCHOLAR_API_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase配置缺失');
        }

        // 生成查询哈希，用于缓存
        const queryHash = await generateQueryHash(paper_id, depth, max_nodes);

        // 检查缓存
        const cachedNetwork = await getCachedNetwork(queryHash, supabaseUrl, serviceRoleKey);
        if (cachedNetwork) {
            console.log('返回缓存的网络数据');
            return new Response(JSON.stringify({
                data: cachedNetwork,
                cached: true
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 获取根论文信息
        const rootPaper = await fetchPaperDetails(paper_id, semanticScholarApiKey);
        if (!rootPaper) {
            throw new Error('找不到指定的论文');
        }

        // 构建论文网络
        const networkData = await buildPaperNetwork(rootPaper, depth, max_nodes, semanticScholarApiKey);

        // 计算PageRank
        calculatePageRank(networkData.nodes, networkData.edges);

        // 计算社区结构（简化的Louvain算法）
        calculateCommunities(networkData.nodes, networkData.edges);

        // 缓存结果
        await cacheNetworkData(queryHash, rootPaper.paperId, networkData, supabaseUrl, serviceRoleKey);

        console.log(`网络构建完成，包含 ${networkData.nodes.length} 个节点和 ${networkData.edges.length} 条边`);

        return new Response(JSON.stringify({
            data: networkData,
            cached: false
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('论文网络构建错误:', error);

        const errorResponse = {
            error: {
                code: 'NETWORK_BUILD_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// 生成查询哈希
async function generateQueryHash(paperId, depth, maxNodes) {
    const queryString = `${paperId}_${depth}_${maxNodes}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(queryString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

// 获取缓存的网络数据
async function getCachedNetwork(queryHash, supabaseUrl, serviceRoleKey) {
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/paper_networks?query_hash=eq.${queryHash}&expires_at=gt.${new Date().toISOString()}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.length > 0) {
                return data[0].network_data;
            }
        }
    } catch (error) {
        console.warn('获取缓存数据失败:', error.message);
    }
    return null;
}

// 缓存网络数据
async function cacheNetworkData(queryHash, rootPaperId, networkData, supabaseUrl, serviceRoleKey) {
    try {
        await fetch(`${supabaseUrl}/rest/v1/paper_networks`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query_hash: queryHash,
                root_paper_id: rootPaperId,
                network_data: networkData,
                node_count: networkData.nodes.length,
                edge_count: networkData.edges.length
            })
        });
    } catch (error) {
        console.warn('缓存网络数据失败:', error.message);
    }
}

// 获取论文详情
async function fetchPaperDetails(paperId, apiKey) {
    const headers = {
        'User-Agent': 'Academic-Paper-Explorer/1.0'
    };
    
    if (apiKey) {
        headers['x-api-key'] = apiKey;
    }

    try {
        const response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/${paperId}?fields=paperId,title,abstract,year,citationCount,authors,venue,publicationDate,fieldsOfStudy,url,openAccessPdf,references,citations`, {
            headers
        });

        if (!response.ok) {
            console.warn(`获取论文详情失败: ${paperId}`, response.status);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.warn(`获取论文详情错误: ${paperId}`, error.message);
        return null;
    }
}

// 构建论文网络
async function buildPaperNetwork(rootPaper, depth, maxNodes, apiKey) {
    const nodes = new Map();
    const edges = [];
    const visitedPapers = new Set();
    const papersToProcess = [{ paper: rootPaper, currentDepth: 0 }];

    // 添加根节点
    addNodeToNetwork(nodes, rootPaper, true);
    visitedPapers.add(rootPaper.paperId);

    while (papersToProcess.length > 0 && nodes.size < maxNodes) {
        const { paper, currentDepth } = papersToProcess.shift();

        if (currentDepth >= depth) continue;

        // 处理引用的论文（出度）
        if (paper.references && paper.references.length > 0) {
            const limitedReferences = paper.references.slice(0, 20); // 限制引用数量
            
            for (const ref of limitedReferences) {
                if (nodes.size >= maxNodes) break;
                
                if (!visitedPapers.has(ref.paperId)) {
                    const refPaper = await fetchPaperDetails(ref.paperId, apiKey);
                    if (refPaper) {
                        addNodeToNetwork(nodes, refPaper, false);
                        visitedPapers.add(ref.paperId);
                        
                        if (currentDepth + 1 < depth) {
                            papersToProcess.push({ paper: refPaper, currentDepth: currentDepth + 1 });
                        }
                    }
                }
                
                // 添加边（引用关系）
                edges.push({
                    from: paper.paperId,
                    to: ref.paperId,
                    type: 'reference',
                    weight: 1
                });
            }
        }

        // 处理被引用的论文（入度）
        if (paper.citations && paper.citations.length > 0) {
            const limitedCitations = paper.citations.slice(0, 20); // 限制被引用数量
            
            for (const cite of limitedCitations) {
                if (nodes.size >= maxNodes) break;
                
                if (!visitedPapers.has(cite.paperId)) {
                    const citePaper = await fetchPaperDetails(cite.paperId, apiKey);
                    if (citePaper) {
                        addNodeToNetwork(nodes, citePaper, false);
                        visitedPapers.add(cite.paperId);
                        
                        if (currentDepth + 1 < depth) {
                            papersToProcess.push({ paper: citePaper, currentDepth: currentDepth + 1 });
                        }
                    }
                }
                
                // 添加边（被引用关系）
                edges.push({
                    from: cite.paperId,
                    to: paper.paperId,
                    type: 'citation',
                    weight: 1
                });
            }
        }

        // 添加小延迟避免过快请求
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
        nodes: Array.from(nodes.values()),
        edges: edges
    };
}

// 添加节点到网络
function addNodeToNetwork(nodes, paper, isRoot = false) {
    if (nodes.has(paper.paperId)) return;
    
    const node = {
        id: paper.paperId,
        label: paper.title || '未知标题',
        title: paper.title,
        abstract: paper.abstract,
        year: paper.year,
        citationCount: paper.citationCount || 0,
        authors: paper.authors?.map(a => a.name).join(', ') || '',
        venue: paper.venue,
        url: paper.url,
        pdfUrl: paper.openAccessPdf?.url,
        fieldsOfStudy: paper.fieldsOfStudy || [],
        isRoot: isRoot,
        pageRankScore: 0.0,
        clusterId: 0,
        size: Math.max(10, Math.log10((paper.citationCount || 0) + 1) * 10), // 基于引用数的节点大小
        color: isRoot ? '#ff6b35' : '#1e3a8a' // 根节点为橙色，其他为蓝色
    };
    
    nodes.set(paper.paperId, node);
}

// 计算PageRank
function calculatePageRank(nodes, edges, damping = 0.85, iterations = 20) {
    const nodeCount = nodes.length;
    if (nodeCount === 0) return;
    
    // 初始化PageRank值
    const pageRank = {};
    const outLinks = {};
    
    nodes.forEach(node => {
        pageRank[node.id] = 1.0 / nodeCount;
        outLinks[node.id] = [];
    });
    
    // 构建出度链接
    edges.forEach(edge => {
        if (outLinks[edge.from]) {
            outLinks[edge.from].push(edge.to);
        }
    });
    
    // 迭代计算
    for (let i = 0; i < iterations; i++) {
        const newPageRank = {};
        
        nodes.forEach(node => {
            newPageRank[node.id] = (1 - damping) / nodeCount;
        });
        
        nodes.forEach(node => {
            const outLinkCount = outLinks[node.id].length;
            if (outLinkCount > 0) {
                const contribution = damping * pageRank[node.id] / outLinkCount;
                outLinks[node.id].forEach(targetId => {
                    if (newPageRank[targetId] !== undefined) {
                        newPageRank[targetId] += contribution;
                    }
                });
            }
        });
        
        // 更新PageRank值
        Object.assign(pageRank, newPageRank);
    }
    
    // 将PageRank值赋给节点
    nodes.forEach(node => {
        node.pageRankScore = pageRank[node.id] || 0;
        // 根据PageRank调整节点大小
        node.size = Math.max(15, node.pageRankScore * 1000);
    });
}

// 简化的社区检测（基于连通分量）
function calculateCommunities(nodes, edges) {
    const adjacencyList = {};
    const visited = new Set();
    let clusterId = 0;
    
    // 构建邻接表
    nodes.forEach(node => {
        adjacencyList[node.id] = [];
    });
    
    edges.forEach(edge => {
        if (adjacencyList[edge.from] && adjacencyList[edge.to]) {
            adjacencyList[edge.from].push(edge.to);
            adjacencyList[edge.to].push(edge.from);
        }
    });
    
    // 深度优先搜索找连通分量
    function dfs(nodeId, currentClusterId) {
        if (visited.has(nodeId)) return;
        
        visited.add(nodeId);
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            node.clusterId = currentClusterId;
        }
        
        if (adjacencyList[nodeId]) {
            adjacencyList[nodeId].forEach(neighborId => {
                if (!visited.has(neighborId)) {
                    dfs(neighborId, currentClusterId);
                }
            });
        }
    }
    
    // 为每个连通分量分配社区
ID
    nodes.forEach(node => {
        if (!visited.has(node.id)) {
            dfs(node.id, clusterId);
            clusterId++;
        }
    });
    
    // 基于社区分配颜色
    const colors = ['#1e3a8a', '#dc2626', '#059669', '#7c3aed', '#ea580c', '#0891b2', '#be185d'];
    nodes.forEach(node => {
        if (!node.isRoot) {
            node.color = colors[node.clusterId % colors.length];
        }
    });
}