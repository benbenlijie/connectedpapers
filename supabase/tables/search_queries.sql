CREATE TABLE search_queries (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    query_text VARCHAR(1000),
    query_type VARCHAR(50),
    results_count INTEGER DEFAULT 0,
    execution_time_ms INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);