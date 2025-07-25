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
        const { paper_id } = await req.json();

        if (!paper_id) {
            throw new Error('论文ID不能为空');
        }

        console.log('获取论文详情:', paper_id);

        // 获取环境变量
        const semanticScholarApiKey = Deno.env.get('SEMANTIC_SCHOLAR_API_KEY');
        const contactEmail = Deno.env.get('CONTACT_EMAIL') || 'researcher@example.com';

        console.log('API配置:', {
            hasApiKey: !!semanticScholarApiKey,
            contactEmail: contactEmail
        });

        // 从多个数据源获取论文详情
        const paperDetails = await fetchComprehensivePaperDetails(paper_id, semanticScholarApiKey, contactEmail);

        if (!paperDetails) {
            throw new Error('找不到指定的论文');
        }

        // 获取相关论文推荐
        const recommendations = await fetchRecommendations(paper_id, semanticScholarApiKey, contactEmail);

        // 获取引用上下文
        const citationContexts = await fetchCitationContexts(paper_id, semanticScholarApiKey, contactEmail);

        const result = {
            paper: paperDetails,
            recommendations: recommendations,
            citation_contexts: citationContexts,
            metrics: {
                h_index: calculateAuthorHIndex(paperDetails.authors),
                impact_factor: estimateImpactFactor(paperDetails),
                altmetric_score: 0 // 如果需要可以集成Altmetric API
            }
        };

        return new Response(JSON.stringify({
            data: result
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('获取论文详情错误:', error);

        const errorResponse = {
            error: {
                code: 'PAPER_DETAILS_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// 获取综合论文详情 - 改进版本，包含重试和更好的错误处理
async function fetchComprehensivePaperDetails(paperId, apiKey, contactEmail) {
    const maxRetries = 3;
    const baseDelay = 1000; // 1秒基础延迟

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            console.log(`尝试获取论文详情 (第${attempt + 1}次):`, paperId);
            
            const headers = {
                'User-Agent': `Academic-Paper-Explorer/1.0 (mailto:${contactEmail})`
            };
            
            if (apiKey) {
                headers['x-api-key'] = apiKey;
                console.log('使用API密钥进行请求');
            } else {
                console.log('警告: 未配置API密钥，可能遇到速率限制');
            }

            // 清理论文ID格式
            const cleanPaperId = String(paperId).trim();
            let apiUrl;
            
            // 智能识别不同的论文ID格式
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
            } else if (cleanPaperId.includes('openalex.org') || cleanPaperId.startsWith('W')) {
                // OpenAlex ID - 尝试直接从OpenAlex获取DOI
                console.log('检测到OpenAlex ID，尝试获取DOI...');
                try {
                    const openAlexPaper = await fetchFromOpenAlex(cleanPaperId, contactEmail);
                    if (openAlexPaper && openAlexPaper.doi) {
                        const doi = openAlexPaper.doi.replace('https://doi.org/', '');
                        console.log('从OpenAlex获取到DOI:', doi);
                        
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
                    } else {
                        console.warn('OpenAlex论文没有DOI信息，使用原始ID尝试');
                        // 如果没有DOI，尝试直接使用OpenAlex ID查询Semantic Scholar
                        apiUrl = `https://api.semanticscholar.org/graph/v1/paper/${cleanPaperId}`;
                    }
                } catch (openAlexError) {
                    console.warn('OpenAlex查询失败，使用原始ID尝试Semantic Scholar:', openAlexError.message);
                    // 如果OpenAlex查询失败，尝试直接使用原始ID
                    apiUrl = `https://api.semanticscholar.org/graph/v1/paper/${cleanPaperId}`;
                }
            } else {
                // 假设是Semantic Scholar ID
                apiUrl = `https://api.semanticscholar.org/graph/v1/paper/${cleanPaperId}`;
            }

            apiUrl += '?fields=paperId,title,abstract,year,citationCount,authors,venue,publicationDate,fieldsOfStudy,url,openAccessPdf,references.paperId,references.title,references.year,references.citationCount,citations.paperId,citations.title,citations.year,citations.citationCount,influentialCitationCount,publicationTypes,journal,publicationVenue';

            console.log('API请求URL:', apiUrl);

            const response = await fetch(apiUrl, {
                headers,
                signal: AbortSignal.timeout(15000) // 15秒超时
            });

            console.log(`API响应状态 (第${attempt + 1}次):`, response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API请求失败 (第${attempt + 1}次):`, {
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

            const semanticData = await response.json();
            console.log('成功获取论文数据:', {
                paperId: semanticData.paperId,
                title: semanticData.title?.substring(0, 50) + '...',
                referencesCount: semanticData.references?.length || 0,
                citationsCount: semanticData.citations?.length || 0
            });

            // 尝试获取DOI并从OpenAlex获取额外信息
            let openAlexData = null;
            const doi = extractDOI(semanticData.url);
            if (doi) {
                try {
                    openAlexData = await fetchOpenAlexDetails(doi, contactEmail);
                } catch (openAlexError) {
                    console.warn('OpenAlex查询失败，继续使用Semantic Scholar数据:', openAlexError.message);
                }
            }

            // 合并数据
            return mergeDetailedPaperData(semanticData, openAlexData);

        } catch (error) {
            console.error(`获取论文详情错误 (第${attempt + 1}次):`, error.message);
            
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

// 从OpenAlex获取论文信息 - 改进版本
async function fetchFromOpenAlex(openAlexId, contactEmail) {
    try {
        console.log('尝试从OpenAlex获取论文信息:', openAlexId);
        
        // 清理和验证OpenAlex ID
        let apiUrl = openAlexId;
        
        // 如果是完整的OpenAlex URL，直接使用
        if (openAlexId.startsWith('https://openalex.org/')) {
            apiUrl = openAlexId;
        } else if (openAlexId.startsWith('W') && openAlexId.length > 5) {
            // 如果是OpenAlex Work ID (W123456789)
            apiUrl = `https://api.openalex.org/works/${openAlexId}`;
        } else if (openAlexId.includes('openalex.org/W')) {
            // 如果是OpenAlex URL但需要转换为API URL
            const workId = openAlexId.match(/W\d+/)?.[0];
            if (workId) {
                apiUrl = `https://api.openalex.org/works/${workId}`;
            } else {
                throw new Error(`无法从OpenAlex URL中提取Work ID: ${openAlexId}`);
            }
        } else {
            throw new Error(`无效的OpenAlex ID格式: ${openAlexId}`);
        }
        
        console.log('OpenAlex API URL:', apiUrl);

        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': `Academic-Paper-Explorer/1.0 (mailto:${contactEmail})`,
                'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(10000) // 10秒超时
        });

        console.log('OpenAlex API响应状态:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAlex API错误响应:', errorText.substring(0, 200));
            throw new Error(`OpenAlex API请求失败: ${response.status} - ${response.statusText}`);
        }

        // 检查响应内容类型
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const responseText = await response.text();
            console.error('OpenAlex API返回非JSON响应:', responseText.substring(0, 200));
            throw new Error(`OpenAlex API返回了非JSON格式的响应: ${contentType}`);
        }

        const data = await response.json();
        console.log('成功从OpenAlex获取数据:', {
            id: data.id,
            title: data.title?.substring(0, 50) + '...',
            doi: data.doi
        });
        
        return data;
    } catch (error) {
        console.error('OpenAlex查询失败:', error.message);
        throw error;
    }
}

// 从OpenAlex获取额外信息 - 改进版本
async function fetchOpenAlexDetails(doi, contactEmail) {
    try {
        console.log('尝试从OpenAlex API获取详细信息，DOI:', doi);
        
        const response = await fetch(`https://api.openalex.org/works/doi:${doi}?select=id,title,abstract_inverted_index,publication_year,cited_by_count,authorships,primary_location,concepts,open_access,apc_list,apc_paid,best_oa_location,sustainable_development_goals`, {
            headers: {
                'User-Agent': `Academic-Paper-Explorer/1.0 (mailto:${contactEmail})`,
                'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(10000) // 10秒超时
        });

        console.log('OpenAlex详细信息API响应状态:', response.status);

        if (!response.ok) {
            console.warn(`OpenAlex详细信息查询失败: ${response.status} ${response.statusText}`);
            return null;
        }

        // 检查响应内容类型
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.warn('OpenAlex详细信息API返回非JSON响应:', contentType);
            return null;
        }

        const data = await response.json();
        console.log('成功从OpenAlex获取详细信息');
        return data;
    } catch (error) {
        console.warn('OpenAlex详细信息查询错误:', error.message);
        return null;
    }
}

// 获取相关论文推荐 - 改进版本
async function fetchRecommendations(paperId, apiKey, contactEmail) {
    const maxRetries = 2;
    const baseDelay = 1000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const headers = {
                'User-Agent': `Academic-Paper-Explorer/1.0 (mailto:${contactEmail})`
            };
            
            if (apiKey) {
                headers['x-api-key'] = apiKey;
            }

            const response = await fetch(`https://api.semanticscholar.org/recommendations/v1/papers/forpaper/${paperId}?fields=paperId,title,year,citationCount,authors,venue&limit=10`, {
                headers,
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                if (response.status === 429 && attempt < maxRetries - 1) {
                    const delay = baseDelay * (attempt + 1);
                    console.log(`推荐API速率限制，等待 ${delay}ms 后重试...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                console.warn('获取推荐论文失败:', response.status);
                return [];
            }

            const data = await response.json();
            return data.recommendedPapers || [];
        } catch (error) {
            console.warn(`获取推荐论文错误 (第${attempt + 1}次):`, error.message);
            if (attempt === maxRetries - 1) {
                return [];
            }
            await new Promise(resolve => setTimeout(resolve, baseDelay * (attempt + 1)));
        }
    }
    return [];
}

// 获取引用上下文 - 改进版本
async function fetchCitationContexts(paperId, apiKey, contactEmail) {
    const maxRetries = 2;
    const baseDelay = 1000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const headers = {
                'User-Agent': `Academic-Paper-Explorer/1.0 (mailto:${contactEmail})`
            };
            
            if (apiKey) {
                headers['x-api-key'] = apiKey;
            }

            const response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/${paperId}/citations?fields=contexts,citingPaper.paperId,citingPaper.title,citingPaper.year,isInfluential&limit=20`, {
                headers,
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                if (response.status === 429 && attempt < maxRetries - 1) {
                    const delay = baseDelay * (attempt + 1);
                    console.log(`引用上下文API速率限制，等待 ${delay}ms 后重试...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                console.warn('获取引用上下文失败:', response.status);
                return [];
            }

            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.warn(`获取引用上下文错误 (第${attempt + 1}次):`, error.message);
            if (attempt === maxRetries - 1) {
                return [];
            }
            await new Promise(resolve => setTimeout(resolve, baseDelay * (attempt + 1)));
        }
    }
    return [];
}

// 合并详细论文数据
function mergeDetailedPaperData(semanticData, openAlexData) {
    const mergedData = {
        // 基本信息
        id: semanticData.paperId,
        semantic_scholar_id: semanticData.paperId,
        title: semanticData.title,
        abstract: semanticData.abstract,
        year: semanticData.year,
        publication_date: semanticData.publicationDate,
        
        // 作者信息
        authors: semanticData.authors?.map(author => ({
            id: author.authorId,
            name: author.name,
            url: author.url,
            affiliations: author.affiliations || []
        })) || [],
        
        // 发表信息
        venue: semanticData.venue,
        journal: semanticData.journal?.name || semanticData.venue,
        publication_venue: semanticData.publicationVenue,
        publication_types: semanticData.publicationTypes || [],
        
        // 引用和影响力
        citation_count: semanticData.citationCount || 0,
        influential_citation_count: semanticData.influentialCitationCount || 0,
        reference_count: semanticData.references?.length || 0,
        
        // 学科领域
        fields_of_study: semanticData.fieldsOfStudy || [],
        
        // 链接和访问
        url: semanticData.url,
        pdf_url: semanticData.openAccessPdf?.url,
        doi: extractDOI(semanticData.url),
        
        // 引用和参考文献
        references: semanticData.references?.slice(0, 20) || [],
        citations: semanticData.citations?.slice(0, 20) || []
    };

    // 如果有OpenAlex数据，补充额外信息
    if (openAlexData) {
        mergedData.openalex_id = openAlexData.id;
        mergedData.is_open_access = openAlexData.open_access?.is_oa || false;
        mergedData.oa_url = openAlexData.best_oa_location?.host_venue?.url;
        mergedData.apc_paid = openAlexData.apc_paid;
        mergedData.concepts = openAlexData.concepts?.map(c => ({
            id: c.id,
            name: c.display_name,
            level: c.level,
            score: c.score
        })) || [];
        mergedData.sdg_goals = openAlexData.sustainable_development_goals || [];
        
        // 如果没有摘要，尝试从 OpenAlex 重构
        if (!mergedData.abstract && openAlexData.abstract_inverted_index) {
            mergedData.abstract = reconstructAbstract(openAlexData.abstract_inverted_index);
        }
    }

    return mergedData;
}

// 计算作者H指数（简化版）
function calculateAuthorHIndex(authors) {
    if (!authors || authors.length === 0) return 0;
    
    // 这里只是一个简化的估算，实际上需要获取作者的完整论文列表
    // 返回第一作者的估计H指数
    return Math.min(10, Math.floor(Math.log10(authors.length + 1) * 5));
}

// 估算影响因子
function estimateImpactFactor(paper) {
    if (!paper.citation_count || !paper.year) return 0;
    
    const currentYear = new Date().getFullYear();
    const paperAge = currentYear - paper.year;
    
    if (paperAge <= 0) return 0;
    
    // 简化的影响因子估算：年均引用数
    return (paper.citation_count / paperAge).toFixed(2);
}

// 重构抽象（OpenAlex的倒排索引格式）
function reconstructAbstract(invertedIndex) {
    if (!invertedIndex || typeof invertedIndex !== 'object') {
        return null;
    }
    
    const words = [];
    for (const [word, positions] of Object.entries(invertedIndex)) {
        positions.forEach(pos => {
            words[pos] = word;
        });
    }
    
    return words.filter(Boolean).join(' ');
}

// 从URL提取DOI
function extractDOI(url) {
    if (!url) return null;
    const doiMatch = url.match(/10\.\d{4,}[\w\d\(\)\.\-\/:]+/i);
    return doiMatch ? doiMatch[0] : null;
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

        // 转换为详细格式
        return {
            id: `ARXIV:${arxivId}`,
            semantic_scholar_id: `ARXIV:${arxivId}`,
            title: title,
            abstract: summary,
            year: year,
            publication_date: publishedDate,
            authors: authors.map(a => ({
                id: null,
                name: a.name,
                url: null,
                affiliations: []
            })),
            venue: 'arXiv preprint',
            journal: 'arXiv',
            publication_venue: null,
            publication_types: ['preprint'],
            citation_count: 0,
            influential_citation_count: 0,
            reference_count: 0,
            fields_of_study: ['Computer Science'],
            url: `https://arxiv.org/abs/${baseArxivId}`,
            pdf_url: `https://arxiv.org/pdf/${baseArxivId}.pdf`,
            doi: null,
            references: [],
            citations: []
        };
    } catch (error) {
        console.error('arXiv API查询失败:', error.message);
        throw error;
    }
}