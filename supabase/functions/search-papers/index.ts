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
        const { query, query_type = 'keyword' } = await req.json();

        if (!query || typeof query !== 'string') {
            throw new Error('查询内容不能为空');
        }

        console.log('开始搜索论文:', { query, query_type });

        // 获取环境变量
        const semanticScholarApiKey = Deno.env.get('SEMANTIC_SCHOLAR_API_KEY');
        const crossrefEmail = Deno.env.get('CROSSREF_EMAIL');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase配置缺失');
        }

        let papers = [];
        let searchResults = { semantic_scholar: [], openalex: [], crossref: [] };

        // 根据查询类型决定搜索策略
        if (query_type === 'doi') {
            // DOI查询 - 使用CrossRef和Semantic Scholar
            await Promise.allSettled([
                searchByDOI(query, crossrefEmail).then(result => {
                    if (result) searchResults.crossref.push(result);
                }),
                searchSemanticScholarByDOI(query, semanticScholarApiKey).then(result => {
                    if (result) searchResults.semantic_scholar.push(result);
                })
            ]);
        } else if (query_type === 'arxiv') {
            // arXiv ID查询
            const arxivResult = await searchSemanticScholarByArxiv(query, semanticScholarApiKey);
            if (arxivResult) searchResults.semantic_scholar.push(arxivResult);
        } else if (query_type === 's2_id') {
            // Semantic Scholar ID查询
            const s2Result = await searchSemanticScholarById(query, semanticScholarApiKey);
            if (s2Result) searchResults.semantic_scholar.push(s2Result);
        } else {
            // 关键词搜索 - 使用所有API并行搜索
            await Promise.allSettled([
                searchSemanticScholar(query, semanticScholarApiKey).then(results => {
                    searchResults.semantic_scholar = results;
                }),
                searchOpenAlex(query).then(results => {
                    searchResults.openalex = results;
                })
            ]);
        }

        // 合并和去重结果
        papers = mergeAndDeduplicateResults(searchResults);

        console.log(`搜索完成，找到 ${papers.length} 篇论文`);

        // 记录搜索查询
        try {
            await fetch(`${supabaseUrl}/rest/v1/search_queries`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query_text: query,
                    query_type: query_type,
                    results_count: papers.length
                })
            });
        } catch (logError) {
            console.warn('记录搜索历史失败:', logError.message);
        }

        return new Response(JSON.stringify({
            data: {
                papers: papers.slice(0, 50), // 限制返回前50个结果
                total_count: papers.length,
                query_type,
                search_stats: {
                    semantic_scholar: searchResults.semantic_scholar.length,
                    openalex: searchResults.openalex.length,
                    crossref: searchResults.crossref.length
                }
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('论文搜索错误:', error);

        const errorResponse = {
            error: {
                code: 'PAPER_SEARCH_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Semantic Scholar API搜索
async function searchSemanticScholar(query, apiKey) {
    const headers = {
        'User-Agent': 'Academic-Paper-Explorer/1.0',
        'Content-Type': 'application/json'
    };
    
    if (apiKey) {
        headers['x-api-key'] = apiKey;
    }

    try {
        const encodedQuery = encodeURIComponent(query);
        const response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?query=${encodedQuery}&limit=20&fields=paperId,title,abstract,year,citationCount,authors,venue,publicationDate,fieldsOfStudy,url,openAccessPdf`, {
            headers
        });

        if (!response.ok) {
            console.warn('Semantic Scholar搜索失败:', response.status);
            return [];
        }

        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.warn('Semantic Scholar API错误:', error.message);
        return [];
    }
}

// Semantic Scholar DOI搜索
async function searchSemanticScholarByDOI(doi, apiKey) {
    const headers = {
        'User-Agent': 'Academic-Paper-Explorer/1.0'
    };
    
    if (apiKey) {
        headers['x-api-key'] = apiKey;
    }

    try {
        const response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/${doi}?fields=paperId,title,abstract,year,citationCount,authors,venue,publicationDate,fieldsOfStudy,url,openAccessPdf`, {
            headers
        });

        if (!response.ok) {
            console.warn('Semantic Scholar DOI查询失败:', response.status);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.warn('Semantic Scholar DOI查询错误:', error.message);
        return null;
    }
}

// Semantic Scholar arXiv ID搜索
async function searchSemanticScholarByArxiv(arxivId, apiKey) {
    const headers = {
        'User-Agent': 'Academic-Paper-Explorer/1.0'
    };
    
    if (apiKey) {
        headers['x-api-key'] = apiKey;
    }

    try {
        const response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/ARXIV:${arxivId}?fields=paperId,title,abstract,year,citationCount,authors,venue,publicationDate,fieldsOfStudy,url,openAccessPdf`, {
            headers
        });

        if (!response.ok) {
            console.warn('Semantic Scholar arXiv查询失败:', response.status);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.warn('Semantic Scholar arXiv查询错误:', error.message);
        return null;
    }
}

// Semantic Scholar ID查询
async function searchSemanticScholarById(paperId, apiKey) {
    const headers = {
        'User-Agent': 'Academic-Paper-Explorer/1.0'
    };
    
    if (apiKey) {
        headers['x-api-key'] = apiKey;
    }

    try {
        const response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/${paperId}?fields=paperId,title,abstract,year,citationCount,authors,venue,publicationDate,fieldsOfStudy,url,openAccessPdf`, {
            headers
        });

        if (!response.ok) {
            console.warn('Semantic Scholar ID查询失败:', response.status);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.warn('Semantic Scholar ID查询错误:', error.message);
        return null;
    }
}

// OpenAlex API搜索
async function searchOpenAlex(query) {
    try {
        const encodedQuery = encodeURIComponent(query);
        const response = await fetch(`https://api.openalex.org/works?search=${encodedQuery}&per_page=20&select=id,title,abstract_inverted_index,publication_year,cited_by_count,authorships,primary_location,publication_date,concepts,open_access,doi`, {
            headers: {
                'User-Agent': 'Academic-Paper-Explorer/1.0 (mailto:researcher@example.com)'
            }
        });

        if (!response.ok) {
            console.warn('OpenAlex搜索失败:', response.status);
            return [];
        }

        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.warn('OpenAlex API错误:', error.message);
        return [];
    }
}

// CrossRef DOI搜索
async function searchByDOI(doi, email) {
    try {
        const response = await fetch(`https://api.crossref.org/works/${doi}`, {
            headers: {
                'User-Agent': `Academic-Paper-Explorer/1.0 (mailto:${email || 'researcher@example.com'})`
            }
        });

        if (!response.ok) {
            console.warn('CrossRef DOI查询失败:', response.status);
            return null;
        }

        const data = await response.json();
        return data.message;
    } catch (error) {
        console.warn('CrossRef DOI查询错误:', error.message);
        return null;
    }
}

// 合并和去重结果
function mergeAndDeduplicateResults(searchResults) {
    const paperMap = new Map();
    
    // 处理Semantic Scholar结果
    searchResults.semantic_scholar.forEach(paper => {
        const normalizedPaper = {
            source: 'semantic_scholar',
            semantic_scholar_id: paper.paperId,
            title: paper.title,
            abstract: paper.abstract,
            publication_year: paper.year,
            citation_count: paper.citationCount || 0,
            authors: paper.authors?.map(a => a.name).join(', ') || '',
            venue: paper.venue,
            publication_date: paper.publicationDate,
            fields_of_study: paper.fieldsOfStudy || [],
            url: paper.url,
            pdf_url: paper.openAccessPdf?.url,
            doi: extractDOI(paper.url)
        };
        
        const key = normalizedPaper.doi || normalizedPaper.semantic_scholar_id || normalizedPaper.title;
        if (key && !paperMap.has(key)) {
            paperMap.set(key, normalizedPaper);
        }
    });
    
    // 处理OpenAlex结果
    searchResults.openalex.forEach(work => {
        const normalizedPaper = {
            source: 'openalex',
            openalex_id: work.id,
            title: work.title,
            abstract: reconstructAbstract(work.abstract_inverted_index),
            publication_year: work.publication_year,
            citation_count: work.cited_by_count || 0,
            authors: work.authorships?.map(a => a.author?.display_name).filter(Boolean).join(', ') || '',
            venue: work.primary_location?.source?.display_name,
            publication_date: work.publication_date,
            fields_of_study: work.concepts?.map(c => c.display_name) || [],
            doi: work.doi,
            is_open_access: work.open_access?.is_oa || false
        };
        
        const key = normalizedPaper.doi || normalizedPaper.openalex_id || normalizedPaper.title;
        if (key && !paperMap.has(key)) {
            paperMap.set(key, normalizedPaper);
        }
    });
    
    // 处理CrossRef结果
    searchResults.crossref.forEach(work => {
        const normalizedPaper = {
            source: 'crossref',
            doi: work.DOI,
            title: work.title?.[0],
            publication_year: work.published?.['date-parts']?.[0]?.[0],
            citation_count: work['is-referenced-by-count'] || 0,
            authors: work.author?.map(a => `${a.given || ''} ${a.family || ''}`).join(', ') || '',
            venue: work['container-title']?.[0],
            journal: work['container-title']?.[0],
            url: work.URL,
            crossref_type: work.type
        };
        
        const key = normalizedPaper.doi || normalizedPaper.title;
        if (key && !paperMap.has(key)) {
            paperMap.set(key, normalizedPaper);
        }
    });
    
    return Array.from(paperMap.values()).sort((a, b) => (b.citation_count || 0) - (a.citation_count || 0));
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