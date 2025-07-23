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

        // 从多个数据源获取论文详情
        const paperDetails = await fetchComprehensivePaperDetails(paper_id, semanticScholarApiKey);

        if (!paperDetails) {
            throw new Error('找不到指定的论文');
        }

        // 获取相关论文推荐
        const recommendations = await fetchRecommendations(paper_id, semanticScholarApiKey);

        // 获取引用上下文
        const citationContexts = await fetchCitationContexts(paper_id, semanticScholarApiKey);

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

// 获取综合论文详情
async function fetchComprehensivePaperDetails(paperId, apiKey) {
    const headers = {
        'User-Agent': 'Academic-Paper-Explorer/1.0'
    };
    
    if (apiKey) {
        headers['x-api-key'] = apiKey;
    }

    try {
        // 根据输入的论文ID构建正确的 Semantic Scholar API URL，支持 DOI、arXiv ID 以及 Semantic Scholar 内部 ID
        const cleanPaperId = String(paperId).trim();
        let apiUrl;

        if (cleanPaperId.startsWith('10.')) {
            // DOI 格式
            apiUrl = `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(cleanPaperId)}`;
        } else if (/^arxiv[:]?/i.test(cleanPaperId) || cleanPaperId.toLowerCase().includes('arxiv')) {
            // arXiv 格式，去掉前缀后使用 ARXIV:${id}
            const arxivId = cleanPaperId.replace(/^arxiv[:]?/i, '').replace(/^ARXIV[:]?/i, '');
            apiUrl = `https://api.semanticscholar.org/graph/v1/paper/ARXIV:${arxivId}`;
        } else {
            // 默认假设是 Semantic Scholar paperId
            apiUrl = `https://api.semanticscholar.org/graph/v1/paper/${cleanPaperId}`;
        }

        apiUrl += '?fields=paperId,title,abstract,year,citationCount,authors,venue,publicationDate,fieldsOfStudy,url,openAccessPdf,references.paperId,references.title,references.year,references.citationCount,citations.paperId,citations.title,citations.year,citations.citationCount,influentialCitationCount,publicationTypes,journal,publicationVenue';

        // 从 Semantic Scholar 获取详细信息
        const response = await fetch(apiUrl, {
            headers,
            signal: AbortSignal.timeout(15000) // 15 秒超时，避免长时间挂起
        });

        if (!response.ok) {
            console.warn(`Semantic Scholar 查询失败: ${paperId}`, response.status);
            return null;
        }

        const semanticData = await response.json();

        // 尝试获取 DOI 并从 OpenAlex 获取额外信息
        let openAlexData = null;
        const doi = extractDOI(semanticData.url);
        if (doi) {
            openAlexData = await fetchOpenAlexDetails(doi);
        }

        // 合并数据
        return mergeDetailedPaperData(semanticData, openAlexData);

    } catch (error) {
        console.warn(`获取论文详情错误: ${paperId}`, error.message);
        return null;
    }
}

// 从OpenAlex获取额外信息
async function fetchOpenAlexDetails(doi) {
    try {
        const response = await fetch(`https://api.openalex.org/works/doi:${doi}?select=id,title,abstract_inverted_index,publication_year,cited_by_count,authorships,primary_location,concepts,open_access,apc_list,apc_paid,best_oa_location,sustainable_development_goals`, {
            headers: {
                'User-Agent': 'Academic-Paper-Explorer/1.0 (mailto:researcher@example.com)'
            }
        });

        if (!response.ok) {
            return null;
        }

        return await response.json();
    } catch (error) {
        console.warn('OpenAlex查询错误:', error.message);
        return null;
    }
}

// 获取相关论文推荐
async function fetchRecommendations(paperId, apiKey) {
    const headers = {
        'User-Agent': 'Academic-Paper-Explorer/1.0'
    };
    
    if (apiKey) {
        headers['x-api-key'] = apiKey;
    }

    try {
        const response = await fetch(`https://api.semanticscholar.org/recommendations/v1/papers/forpaper/${paperId}?fields=paperId,title,year,citationCount,authors,venue&limit=10`, {
            headers
        });

        if (!response.ok) {
            console.warn('获取推荐论文失败:', response.status);
            return [];
        }

        const data = await response.json();
        return data.recommendedPapers || [];
    } catch (error) {
        console.warn('获取推荐论文错误:', error.message);
        return [];
    }
}

// 获取引用上下文
async function fetchCitationContexts(paperId, apiKey) {
    const headers = {
        'User-Agent': 'Academic-Paper-Explorer/1.0'
    };
    
    if (apiKey) {
        headers['x-api-key'] = apiKey;
    }

    try {
        const response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/${paperId}/citations?fields=contexts,citingPaper.paperId,citingPaper.title,citingPaper.year,isInfluential&limit=20`, {
            headers
        });

        if (!response.ok) {
            console.warn('获取引用上下文失败:', response.status);
            return [];
        }

        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.warn('获取引用上下文错误:', error.message);
        return [];
    }
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