CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign key to link this chunk back to its original file
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Foreign keys for faster filtering during search
    course_id UUID,
    learning_unit_id UUID,

    -- The actual text snippet from the PDF
    content TEXT NOT NULL,
    
    -- The vector embedding from the Gemini API
    -- The number (e.g., 768) must match the output of your embedding model
    embedding vector(768)
);

-- An index to make vector searches extremely fast
CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops);