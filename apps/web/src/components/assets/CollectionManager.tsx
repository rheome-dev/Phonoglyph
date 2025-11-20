import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Check, Plus, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface AssetCollection {
  id: string;
  name: string;
  created_at: string;
  type?: string;
}

  interface CollectionManagerProps {
    projectId: string;
    availableFiles: any[]; // Files from projectFiles query
    onSelectCollection: (imageUrls: string[]) => void;
    selectedCollectionId?: string;
  }
  
  export function CollectionManager({ 
    projectId, 
    availableFiles, 
    onSelectCollection,
    selectedCollectionId 
  }: CollectionManagerProps) {
    const { toast } = useToast();
    const [isCreating, setIsCreating] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
  const [selectedFilesForNew, setSelectedFilesForNew] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
    const [viewingCollectionId, setViewingCollectionId] = useState<string | null>(null);
  
    // TRPC Hooks
    const utils = trpc.useUtils();
  
  const { data: collections, isLoading } = trpc.asset.getProjectCollections.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const createCollectionMutation = trpc.asset.createCollection.useMutation();
  const addFileToCollectionMutation = trpc.asset.addFileToCollection.useMutation();
  const getDownloadUrlMutation = trpc.file.getDownloadUrl.useMutation();

  // Fetch details for a specific collection when selected/viewed
  const { data: activeCollectionDetails } = trpc.asset.getCollection.useQuery(
    { collectionId: viewingCollectionId! },
    { enabled: !!viewingCollectionId }
  );

  // Filter for only images
  const imageFiles = availableFiles.filter(f => 
    f.file_type === 'image' || 
    f.mime_type?.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp)$/i.test(f.file_name)
  );

  const handleCreateCollection = async () => {
    if (selectedFilesForNew.size === 0) {
      toast({ title: "No images selected", description: "Select at least one image to create a collection.", variant: "destructive" });
      return;
    }

    try {
      // Fallback to an auto-generated name if user left it blank
      const baseName = newCollectionName.trim() || 'Slideshow Collection';
      const suffix = collections && collections.length > 0 ? ` #${collections.length + 1}` : '';
      const finalName = `${baseName}${suffix}`;

      // 1. Create Collection
      const collection = await createCollectionMutation.mutateAsync({
        projectId,
        name: finalName,
        type: 'image_slideshow'
      });

      // 2. Add Selected Files
      const fileIds = Array.from(selectedFilesForNew);
      // We add them sequentially to preserve order (simplistic approach)
      for (const fileId of fileIds) {
        await addFileToCollectionMutation.mutateAsync({
          collectionId: collection.id,
          fileId
        });
      }

      toast({ title: "Collection Created", description: `"${finalName}" created with ${fileIds.length} images.` });
      
      // Reset
      setNewCollectionName('');
      setSelectedFilesForNew(new Set());
      setIsCreating(false);
      utils.asset.getProjectCollections.invalidate();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to create collection", variant: "destructive" });
    }
  };

  const selectRange = (startId: string, endId: string) => {
    const startIndex = imageFiles.findIndex(file => file.id === startId);
    const endIndex = imageFiles.findIndex(file => file.id === endId);
    if (startIndex === -1 || endIndex === -1) return;
    const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
    const next = new Set(selectedFilesForNew);
    for (let i = from; i <= to; i++) {
      next.add(imageFiles[i].id);
    }
    setSelectedFilesForNew(next);
  };

  const toggleFileSelection = (fileId: string) => {
    const next = new Set(selectedFilesForNew);
    if (next.has(fileId)) next.delete(fileId);
    else next.add(fileId);
    setSelectedFilesForNew(next);
    setLastSelectedId(fileId);
  };

  const handleFileClick = (event: React.MouseEvent<HTMLDivElement>, fileId: string) => {
    if (event.shiftKey && lastSelectedId && lastSelectedId !== fileId) {
      selectRange(lastSelectedId, fileId);
      setLastSelectedId(fileId);
      return;
    }
    toggleFileSelection(fileId);
  };

  const handleSelectAll = () => {
    if (selectedFilesForNew.size === imageFiles.length) {
      setSelectedFilesForNew(new Set());
      return;
    }
    setSelectedFilesForNew(new Set(imageFiles.map(file => file.id)));
  };

  const handleSelectCollectionForUse = async (collectionId: string) => {
    try {
      // We need to fetch the collection details to get the files
      // We can't rely on 'activeCollectionDetails' because we might click 'Select' from the list
      // So we fetch manually via query client or reuse the procedure if we had a way,
      // but simplest is to use the activeCollectionDetails if we are viewing it, 
      // or trigger a fetch.
      // For better UX, let's just load the images.
      
      // Actually, we need to resolve URLs for the client-side visualizer.
      // Let's fetch the collection items first.
      const data = await utils.client.asset.getCollection.query({ collectionId });
      
      if (!data || !data.items) {
        toast({ title: "Error", description: "Collection is empty or invalid", variant: "destructive" });
        return;
      }

      // Resolve URLs
      const urls: string[] = [];
      for (const item of data.items) {
        if (item.file) {
            // If downloadUrl is already present and valid (it might be old/expired)
            // Safer to refresh it
            const res = await getDownloadUrlMutation.mutateAsync({ fileId: item.file.id });
            if (res.downloadUrl) urls.push(res.downloadUrl);
        }
      }

      onSelectCollection(urls);
      toast({ title: "Collection Selected", description: `Loaded ${urls.length} images for slideshow.` });

    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load collection images", variant: "destructive" });
    }
  };

  if (isCreating) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Collection Name</Label>
          <Input 
            value={newCollectionName} 
            onChange={e => setNewCollectionName(e.target.value)}
            placeholder="e.g., Summer Vibes"
            className="bg-stone-950 border-stone-800"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Select Images ({selectedFilesForNew.size})</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSelectAll}
              className="uppercase tracking-wide text-[10px] px-2"
            >
              {selectedFilesForNew.size === imageFiles.length ? 'Clear' : 'Select All'}
            </Button>
          </div>
          <div className="h-48 border border-stone-800 rounded-md bg-stone-950 p-2 overflow-y-auto">
            <div className="grid grid-cols-3 gap-2">
              {imageFiles.length === 0 ? (
                <div className="col-span-3 text-center text-xs text-stone-500 py-4">
                  No images found in project. Upload some first!
                </div>
              ) : (
                imageFiles.map(file => (
                  <div 
                    key={file.id}
                    onClick={(event) => handleFileClick(event, file.id)}
                    className={cn(
                      "relative aspect-square cursor-pointer rounded-md overflow-hidden border-2 transition-all",
                      selectedFilesForNew.has(file.id) 
                        ? "border-green-500 opacity-100" 
                        : "border-transparent opacity-60 hover:opacity-80"
                    )}
                  >
                    {/* Thumbnail or Placeholder */}
                    <div className="absolute inset-0 bg-stone-800 flex items-center justify-center">
                       {file.thumbnail_url ? (
                         <img 
                           src={file.thumbnail_url} 
                           alt={file.file_name} 
                           className="w-full h-full object-cover"
                         />
                       ) : (
                         <ImageIcon className="w-6 h-6 text-stone-400" />
                       )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                        <p className="text-[10px] truncate text-white">{file.file_name}</p>
                    </div>
                    {selectedFilesForNew.has(file.id) && (
                      <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5">
                        <Check className="w-3 h-3 text-black" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            size="sm" 
            className="flex-1" 
            onClick={handleCreateCollection}
            disabled={createCollectionMutation.isLoading || selectedFilesForNew.size === 0}
          >
            {createCollectionMutation.isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Create"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsCreating(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase text-stone-400">Collections</Label>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setIsCreating(true)}>
          <Plus className="w-3 h-3 mr-1" /> New
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
      ) : (
        <div className="h-48 overflow-y-auto pr-1">
          <div className="space-y-2 pr-2">
            {collections?.length === 0 ? (
              <div className="text-center text-xs text-stone-500 py-4">
                No collections yet. Create one to start your slideshow!
              </div>
            ) : (
              collections?.map((collection: AssetCollection) => (
                <Card 
                  key={collection.id}
                  className={cn(
                    "p-2 flex items-center justify-between cursor-pointer transition-colors hover:bg-stone-800 bg-stone-900 border-stone-800",
                    selectedCollectionId === collection.id ? "border-blue-500 bg-stone-800" : ""
                  )}
                  onClick={() => handleSelectCollectionForUse(collection.id)}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-stone-200">{collection.name}</span>
                    <span className="text-[10px] text-stone-500">
                       {/* We could show item count if we joined it, but basic list for now */}
                       {new Date(collection.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {selectedCollectionId === collection.id && (
                    <Check className="w-4 h-4 text-blue-500" />
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
