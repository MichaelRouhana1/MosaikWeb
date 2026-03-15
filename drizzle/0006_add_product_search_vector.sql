-- Add generated tsvector column for name + description (Full-Text Search)
ALTER TABLE products
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
) STORED;

-- GIN index for fast FTS
CREATE INDEX products_search_vector_idx ON products USING GIN (search_vector);
