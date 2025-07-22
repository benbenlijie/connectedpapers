CREATE TABLE paper_authors (
    id SERIAL PRIMARY KEY,
    paper_id INTEGER,
    author_id INTEGER,
    author_position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);