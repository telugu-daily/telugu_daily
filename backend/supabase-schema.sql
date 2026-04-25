-- Supabase SQL: Drop and recreate the sentences table
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)

-- Step 1: Drop existing table (removes all data, policies, indexes)
DROP TABLE IF EXISTS sentences CASCADE;

-- Step 2: Create fresh table
CREATE TABLE sentences (
  id INTEGER PRIMARY KEY,
  telugu TEXT NOT NULL,
  english TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE sentences ENABLE ROW LEVEL SECURITY;

-- Allow public read access (no auth needed to read sentences)
CREATE POLICY "Allow public read access"
  ON sentences
  FOR SELECT
  USING (true);

-- Create index for faster range queries
CREATE INDEX IF NOT EXISTS idx_sentences_id ON sentences (id);
