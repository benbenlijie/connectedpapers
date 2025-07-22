CREATE TABLE citations (
    id SERIAL PRIMARY KEY,
    citing_paper_id INTEGER,
    cited_paper_id INTEGER,
    citation_count INTEGER DEFAULT 1,
    is_influential BOOLEAN DEFAULT FALSE,
    contexts TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);