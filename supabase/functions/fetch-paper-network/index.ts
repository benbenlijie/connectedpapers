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
        let requestBody;
        try {
            requestBody = await req.json();
        } catch (parseError) {
            console.error('JSON解析错误:', parseError);
            return new Response(JSON.stringify({
                error: {
                    code: 'INVALID_JSON',
                    message: '请求体格式错误，必须是有效的JSON'
                }
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const { paper_id, depth = 1, max_nodes = 200 } = requestBody;

        if (!paper_id) {
            console.error('缺少论文ID');
            return new Response(JSON.stringify({
                error: {
                    code: 'MISSING_PAPER_ID',
                    message: '论文ID不能为空'
                }
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        console.log('开始构建论文网络:', { paper_id, depth, max_nodes });

        // 获取环境变量
        const semanticScholarApiKey = Deno.env.get('SEMANTIC_SCHOLAR_API_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const contactEmail = Deno.env.get('CONTACT_EMAIL') || 'researcher@example.com';

        console.log('环境变量检查:', {
            hasApiKey: !!semanticScholarApiKey,
            hasSupabaseUrl: !!supabaseUrl,
            hasServiceRoleKey: !!serviceRoleKey,
            contactEmail: contactEmail,
            supabaseUrlValue: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'undefined'
        });

        // 如果没有API密钥，发出警告但继续执行
        if (!semanticScholarApiKey) {
            console.warn('警告: 未配置SEMANTIC_SCHOLAR_API_KEY，可能遇到API速率限制');
        }

        if (!supabaseUrl || !serviceRoleKey) {
            console.error('Supabase配置缺失:', { supabaseUrl: !!supabaseUrl, serviceRoleKey: !!serviceRoleKey });
            return new Response(JSON.stringify({
                error: {
                    code: 'SUPABASE_CONFIG_MISSING',
                    message: 'Supabase配置缺失，请检查环境变量'
                }
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 生成查询哈希，用于缓存
        const queryHash = await generateQueryHash(paper_id, depth, max_nodes);

        // 检查缓存
        try {
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
        } catch (cacheError) {
            console.warn('缓存检查失败，继续构建网络:', cacheError.message);
        }

        // 获取根论文信息
        let rootPaper;
        try {
            rootPaper = await fetchPaperDetails(paper_id, semanticScholarApiKey);
        } catch (fetchError) {
            console.error('获取论文详情失败:', fetchError);
            
            // 如果是OpenAlex ID，尝试通过DOI查找
            if (paper_id.includes('openalex.org')) {
                console.log('检测到OpenAlex ID，尝试通过其他方式查找...');
                try {
                    const openAlexPaper = await fetchFromOpenAlex(paper_id);
                    if (openAlexPaper && openAlexPaper.doi) {
                        console.log('从OpenAlex获取到DOI，重新尝试:', openAlexPaper.doi);
                        rootPaper = await fetchPaperDetails(openAlexPaper.doi, semanticScholarApiKey);
                    }
                } catch (openAlexError) {
                    console.warn('OpenAlex备用查询也失败:', openAlexError.message);
                }
            }
            
            if (!rootPaper) {
                return new Response(JSON.stringify({
                    error: {
                        code: 'PAPER_FETCH_FAILED',
                        message: `无法获取论文详情: ${fetchError.message}`
                    }
                }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        if (!rootPaper) {
            console.error('找不到指定的论文:', paper_id);
            
            // 如果无法从Semantic Scholar获取数据，创建一个基础的单节点网络
            console.log('创建基础网络作为备用方案');
            const basicNetworkData = {
                nodes: [{
                    id: paper_id,
                    label: '所选论文',
                    title: '所选论文',
                    abstract: '无法获取详细信息',
                    year: new Date().getFullYear(),
                    citationCount: 0,
                    authors: '未知',
                    venue: '未知',
                    url: '',
                    pdfUrl: '',
                    fieldsOfStudy: [],
                    isRoot: true,
                    pageRankScore: 1.0,
                    clusterId: 0,
                    size: 25,
                    color: '#ff6b35'
                }],
                edges: []
            };
            
            return new Response(JSON.stringify({
                data: basicNetworkData,
                cached: false,
                warning: '无法获取论文的引用网络，仅显示单个节点'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 构建论文网络
        let networkData;
        try {
            networkData = await buildPaperNetwork(rootPaper, depth, max_nodes, semanticScholarApiKey);
        } catch (buildError) {
            console.error('构建网络失败:', buildError);
            
            // 如果网络构建失败，尝试创建一个包含根节点的基础网络
            if (rootPaper) {
                console.log('创建基础单节点网络作为备用方案');
                networkData = {
                    nodes: [{
                        id: rootPaper.paperId,
                        label: rootPaper.title || '选中的论文',
                        title: rootPaper.title,
                        abstract: rootPaper.abstract,
                        year: rootPaper.year,
                        citationCount: rootPaper.citationCount || 0,
                        authors: rootPaper.authors?.map(a => a.name).join(', ') || '',
                        venue: rootPaper.venue,
                        url: rootPaper.url,
                        pdfUrl: rootPaper.openAccessPdf?.url,
                        fieldsOfStudy: rootPaper.fieldsOfStudy || [],
                        isRoot: true,
                        pageRankScore: 1.0,
                        clusterId: 0,
                        size: 25,
                        color: '#ff6b35'
                    }],
                    edges: []
                };
            } else {
                return new Response(JSON.stringify({
                    error: {
                        code: 'NETWORK_BUILD_FAILED',
                        message: `网络构建失败: ${buildError.message}`
                    }
                }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        // 计算PageRank
        try {
            calculatePageRank(networkData.nodes, networkData.edges);
        } catch (pageRankError) {
            console.warn('PageRank计算失败:', pageRankError.message);
        }

        // 计算社区结构（简化的Louvain算法）
        try {
            calculateCommunities(networkData.nodes, networkData.edges);
        } catch (communityError) {
            console.warn('社区检测失败:', communityError.message);
        }

        // 缓存结果
        try {
            await cacheNetworkData(queryHash, rootPaper.paperId, networkData, supabaseUrl, serviceRoleKey);
        } catch (cacheError) {
            console.warn('缓存网络数据失败:', cacheError.message);
        }

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
                code: 'INTERNAL_SERVER_ERROR',
                message: error.message || '服务器内部错误',
                details: error.stack ? error.stack.split('\n').slice(0, 5) : undefined
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

// 从OpenAlex获取论文信息
async function fetchFromOpenAlex(openAlexId) {
    try {
        const response = await fetch(openAlexId, {
            headers: {
                'User-Agent': 'Academic-Paper-Explorer/1.0 (mailto:researcher@example.com)'
            }
        });

        if (!response.ok) {
            throw new Error(`OpenAlex API请求失败: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('OpenAlex查询失败:', error);
        throw error;
    }
}

// 从arXiv API直接获取论文信息（备用方案）
async function fetchFromArxivAPI(arxivId) {
    try {
        console.log('尝试从arXiv API获取论文信息:', arxivId);
        
        // 移除可能的版本号 (如 v1, v2 等)
        const baseArxivId = arxivId.replace(/v\d+$/, '');
        
        const response = await fetch(`http://export.arxiv.org/api/query?id_list=${baseArxivId}`, {
            headers: {
                'User-Agent': 'Academic-Paper-Explorer/1.0 (research tool)'
            },
            signal: AbortSignal.timeout(10000) // 10秒超时
        });

        if (!response.ok) {
            throw new Error(`arXiv API请求失败: ${response.status}`);
        }

        const xmlText = await response.text();
        
        // 简单的XML解析来提取论文信息
        const titleMatch = xmlText.match(/<title>(.+?)<\/title>/s);
        const summaryMatch = xmlText.match(/<summary>(.+?)<\/summary>/s);
        const publishedMatch = xmlText.match(/<published>(.+?)<\/published>/);
        const authorsMatch = xmlText.match(/<name>(.+?)<\/name>/g);
        
        if (!titleMatch) {
            throw new Error('无法从arXiv API解析论文信息');
        }

        const title = titleMatch[1].trim();
        const summary = summaryMatch ? summaryMatch[1].replace(/\s+/g, ' ').trim() : '';
        const publishedDate = publishedMatch ? publishedMatch[1] : '';
        const year = publishedDate ? new Date(publishedDate).getFullYear() : new Date().getFullYear();
        
        const authors = authorsMatch ? 
            authorsMatch.map(match => {
                const nameMatch = match.match(/<name>(.+?)<\/name>/);
                return nameMatch ? { name: nameMatch[1].trim() } : null;
            }).filter(Boolean) : [];

        const arxivPaper = {
            paperId: `ARXIV:${arxivId}`,
            title: title,
            abstract: summary,
            year: year,
            citationCount: 0, // arXiv API不提供引用数
            authors: authors,
            venue: 'arXiv preprint',
            url: `https://arxiv.org/abs/${baseArxivId}`,
            openAccessPdf: { url: `https://arxiv.org/pdf/${baseArxivId}.pdf` },
            fieldsOfStudy: ['Computer Science'], // 默认分类
            references: [], // arXiv API不提供引用信息
            citations: []
        };

        console.log('成功从arXiv API获取论文信息:', {
            title: title.substring(0, 50) + '...',
            authors: authors.length,
            year: year
        });

        return arxivPaper;
    } catch (error) {
        console.error('arXiv API查询失败:', error.message);
        throw error;
    }
}

// 获取论文详情 - 改进版本，包含重试逻辑和更好的错误处理
async function fetchPaperDetails(paperId, apiKey) {
    const maxRetries = 3;
    const baseDelay = 1000; // 1秒基础延迟
    const contactEmail = Deno.env.get('CONTACT_EMAIL') || 'researcher@example.com';

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const headers = {
                'User-Agent': `Academic-Paper-Explorer/1.0 (mailto:${contactEmail})`
            };
            
            if (apiKey) {
                headers['x-api-key'] = apiKey;
                console.log(`使用API密钥进行请求 (第${attempt + 1}次)`);
            } else {
                console.log(`警告: 未配置API密钥，可能遇到速率限制 (第${attempt + 1}次)`);
            }

            // 清理和验证论文ID
            const cleanPaperId = String(paperId).trim();
            console.log(`尝试获取论文详情 (第${attempt + 1}次):`, cleanPaperId);

            // 智能识别不同的论文ID格式
            let apiUrl;
            
            // 检查是否是arXiv DOI格式
            if (cleanPaperId.includes('doi.org') && cleanPaperId.includes('arxiv')) {
                // 从DOI URL中提取arXiv ID
                const arxivMatch = cleanPaperId.match(/arxiv\.(\d{4}\.\d{4,5}(?:v\d+)?)/i);
                if (arxivMatch) {
                    const arxivId = arxivMatch[1];
                    apiUrl = `https://api.semanticscholar.org/graph/v1/paper/ARXIV:${arxivId}`;
                    console.log('从arXiv DOI提取ID:', arxivId);
                } else {
                    // 尝试另一种格式匹配
                    const altArxivMatch = cleanPaperId.match(/10\.48550\/arxiv\.(\d{4}\.\d{4,5}(?:v\d+)?)/i);
                    if (altArxivMatch) {
                        const arxivId = altArxivMatch[1];
                        apiUrl = `https://api.semanticscholar.org/graph/v1/paper/ARXIV:${arxivId}`;
                        console.log('从arXiv DOI (alt格式)提取ID:', arxivId);
                    } else {
                        throw new Error(`无法从arXiv DOI中提取有效的arXiv ID: ${cleanPaperId}`);
                    }
                }
            } else if (cleanPaperId.startsWith('10.')) {
                // 普通DOI格式
                apiUrl = `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(cleanPaperId)}`;
            } else if (cleanPaperId.toLowerCase().includes('arxiv') || /^\d{4}\.\d{4,5}(?:v\d+)?$/.test(cleanPaperId)) {
                // arXiv格式 (arxiv:xxxx.xxxx 或直接的 xxxx.xxxx)
                let arxivId = cleanPaperId.replace(/^arxiv:?/i, '');
                // 确保ID格式正确
                if (/^\d{4}\.\d{4,5}(?:v\d+)?$/.test(arxivId)) {
                    apiUrl = `https://api.semanticscholar.org/graph/v1/paper/ARXIV:${arxivId}`;
                } else {
                    throw new Error(`无效的arXiv ID格式: ${arxivId}`);
                }
            } else if (cleanPaperId.includes('openalex.org')) {
                // OpenAlex ID - 尝试直接从OpenAlex获取DOI
                console.log('检测到OpenAlex ID，尝试获取DOI...');
                try {
                    const openAlexPaper = await fetchFromOpenAlex(cleanPaperId);
                    if (openAlexPaper && openAlexPaper.doi) {
                        const doi = openAlexPaper.doi.replace('https://doi.org/', '');
                        // 检查是否是arXiv DOI
                        if (doi.includes('arxiv')) {
                            const arxivMatch = doi.match(/10\.48550\/arxiv\.(\d{4}\.\d{4,5}(?:v\d+)?)/i);
                            if (arxivMatch) {
                                const arxivId = arxivMatch[1];
                                apiUrl = `https://api.semanticscholar.org/graph/v1/paper/ARXIV:${arxivId}`;
                                console.log('从OpenAlex DOI提取arXiv ID:', arxivId);
                            } else {
                                apiUrl = `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}`;
                            }
                        } else {
                            apiUrl = `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}`;
                        }
                        console.log('从OpenAlex获取到DOI:', doi);
                    } else {
                        throw new Error('无法从OpenAlex ID获取DOI信息');
                    }
                } catch (openAlexError) {
                    console.warn('OpenAlex查询失败:', openAlexError.message);
                    // 继续尝试使用原始ID
                    apiUrl = `https://api.semanticscholar.org/graph/v1/paper/${cleanPaperId}`;
                }
            } else {
                // 假设是Semantic Scholar ID或其他格式
                apiUrl = `https://api.semanticscholar.org/graph/v1/paper/${cleanPaperId}`;
            }

            apiUrl += '?fields=paperId,title,abstract,year,citationCount,authors,venue,publicationDate,fieldsOfStudy,url,openAccessPdf,references,citations';

            console.log(`API请求URL (第${attempt + 1}次):`, apiUrl);

            const response = await fetch(apiUrl, {
                headers,
                signal: AbortSignal.timeout(15000) // 15秒超时
            });

            console.log(`API响应状态 (第${attempt + 1}次):`, response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`获取论文详情失败 (第${attempt + 1}次): ${cleanPaperId}`, {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText
                });
                
                if (response.status === 404) {
                    throw new Error(`论文未找到: ${cleanPaperId}`);
                } else if (response.status === 429) {
                    // 速率限制 - 使用指数退避重试
                    if (attempt < maxRetries - 1) {
                        const delay = baseDelay * Math.pow(2, attempt);
                        console.log(`遇到速率限制，等待 ${delay}ms 后重试...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                    throw new Error('API请求过于频繁，请稍后重试');
                } else if (response.status === 403) {
                    // 禁止访问 - 可能需要API密钥
                    if (!apiKey && attempt < maxRetries - 1) {
                        console.log('遇到403错误，可能需要API密钥，稍后重试...');
                        await new Promise(resolve => setTimeout(resolve, baseDelay * (attempt + 1)));
                        continue;
                    }
                    throw new Error('API访问被禁止，请检查API密钥配置或稍后重试');
                } else if (response.status >= 500) {
                    // 服务器错误 - 重试
                    if (attempt < maxRetries - 1) {
                        const delay = baseDelay * (attempt + 1);
                        console.log(`服务器错误，等待 ${delay}ms 后重试...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                    throw new Error('Semantic Scholar服务暂时不可用');
                } else {
                    throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
                }
            }

            const data = await response.json();
            console.log(`成功获取论文数据 (第${attempt + 1}次):`, {
                paperId: data.paperId,
                title: data.title?.substring(0, 50) + '...',
                referencesCount: data.references?.length || 0,
                citationsCount: data.citations?.length || 0
            });

            return data;
        } catch (error) {
            console.error(`获取论文详情错误 (第${attempt + 1}次): ${paperId}`, error.message);
            
            // 如果是arXiv论文且Semantic Scholar失败，尝试直接从arXiv API获取
            if (cleanPaperId.includes('arxiv') || /^\d{4}\.\d{4,5}(?:v\d+)?$/.test(cleanPaperId)) {
                console.log('尝试arXiv API作为备用方案...');
                try {
                    let arxivId = cleanPaperId;
                    // 从DOI中提取arXiv ID
                    if (cleanPaperId.includes('doi.org') && cleanPaperId.includes('arxiv')) {
                        const arxivMatch = cleanPaperId.match(/arxiv\.(\d{4}\.\d{4,5}(?:v\d+)?)/i) || 
                                         cleanPaperId.match(/10\.48550\/arxiv\.(\d{4}\.\d{4,5}(?:v\d+)?)/i);
                        if (arxivMatch) {
                            arxivId = arxivMatch[1];
                        }
                    } else if (cleanPaperId.toLowerCase().includes('arxiv')) {
                        arxivId = cleanPaperId.replace(/^arxiv:?/i, '');
                    }
                    
                    const arxivPaper = await fetchFromArxivAPI(arxivId);
                    if (arxivPaper) {
                        console.log('成功从arXiv API获取论文信息');
                        return arxivPaper;
                    }
                } catch (arxivError) {
                    console.warn('arXiv API备用方案也失败:', arxivError.message);
                }
            }
            
            // 如果是最后一次尝试，抛出错误
            if (attempt === maxRetries - 1) {
                throw error;
            }
            
            // 等待后重试
            const delay = baseDelay * (attempt + 1);
            console.log(`等待 ${delay}ms 后重试...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
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

        // 添加延迟避免过快请求和速率限制
        // 如果没有API密钥，使用更长的延迟
        const delay = semanticScholarApiKey ? 200 : 500;
        await new Promise(resolve => setTimeout(resolve, delay));
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