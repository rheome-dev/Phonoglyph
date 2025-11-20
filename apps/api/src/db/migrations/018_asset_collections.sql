-- Create asset_collections table
CREATE TYPE collection_type AS ENUM ('image_slideshow', 'generic');

CREATE TABLE asset_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type collection_type NOT NULL DEFAULT 'generic',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create asset_collection_items table
CREATE TABLE asset_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES asset_collections(id) ON DELETE CASCADE NOT NULL,
  file_id UUID REFERENCES file_metadata(id) ON DELETE CASCADE NOT NULL,
  "order" INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE asset_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_collection_items ENABLE ROW LEVEL SECURITY;

-- Policies for asset_collections
CREATE POLICY "Users can view their own collections"
  ON asset_collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own collections"
  ON asset_collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
  ON asset_collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
  ON asset_collections FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for asset_collection_items
-- Access depends on the collection ownership
CREATE POLICY "Users can view items of their collections"
  ON asset_collection_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM asset_collections
      WHERE id = asset_collection_items.collection_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add items to their collections"
  ON asset_collection_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM asset_collections
      WHERE id = asset_collection_items.collection_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items from their collections"
  ON asset_collection_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM asset_collections
      WHERE id = asset_collection_items.collection_id
      AND user_id = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_asset_collections_updated_at 
  BEFORE UPDATE ON asset_collections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

