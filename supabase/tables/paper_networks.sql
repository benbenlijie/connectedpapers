CREATE TABLE paper_networks (
    id SERIAL PRIMARY KEY,
    query_hash VARCHAR(64) NOT NULL,
    root_paper_id INTEGER,
    network_data JSONB,
    node_count INTEGER DEFAULT 0,
    edge_count INTEGER DEFAULT 0,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);