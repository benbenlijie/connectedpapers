CREATE TABLE authors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    semantic_scholar_id VARCHAR(100),
    h_index INTEGER DEFAULT 0,
    paper_count INTEGER DEFAULT 0,
    citation_count INTEGER DEFAULT 0,
    affiliations TEXT[],
    homepage VARCHAR(1000),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);