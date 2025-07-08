export interface AssetPlaylist {
  id: string;
  name: string;
  layerId: string;
  assetIds: string[];
  cycleMode: 'sequential' | 'random' | 'velocity_mapped';
  transitionType: 'cut' | 'crossfade';
  transitionDuration: number;
}

export class AssetCyclingEngine {
  private playlists: Map<string, AssetPlaylist> = new Map();
  private currentIndices: Map<string, number> = new Map();
  private playlistHistory: Map<string, string[]> = new Map();
  private randomSeeds: Map<string, number> = new Map();
  
  setPlaylist(playlist: AssetPlaylist): void {
    this.playlists.set(playlist.layerId, playlist);
    this.currentIndices.set(playlist.layerId, 0);
    this.playlistHistory.set(playlist.layerId, []);
    this.randomSeeds.set(playlist.layerId, Math.random());
  }
  
  removePlaylist(layerId: string): void {
    this.playlists.delete(layerId);
    this.currentIndices.delete(layerId);
    this.playlistHistory.delete(layerId);
    this.randomSeeds.delete(layerId);
  }
  
  getPlaylist(layerId: string): AssetPlaylist | undefined {
    return this.playlists.get(layerId);
  }
  
  getAllPlaylists(): AssetPlaylist[] {
    return Array.from(this.playlists.values());
  }
  
  getNextAsset(layerId: string, velocity?: number): string | null {
    const playlist = this.playlists.get(layerId);
    if (!playlist || playlist.assetIds.length === 0) return null;
    
    let nextIndex: number;
    
    switch (playlist.cycleMode) {
      case 'sequential':
        nextIndex = this.getSequentialIndex(layerId);
        break;
      case 'random':
        nextIndex = this.getRandomIndex(playlist.assetIds.length, layerId);
        break;
      case 'velocity_mapped':
        nextIndex = this.getVelocityMappedIndex(playlist.assetIds.length, velocity || 127);
        break;
      default:
        nextIndex = 0;
    }
    
    this.currentIndices.set(layerId, nextIndex);
    
    // Update history
    const history = this.playlistHistory.get(layerId) || [];
    const assetId = playlist.assetIds[nextIndex];
    history.push(assetId);
    
    // Keep only last 10 items in history
    if (history.length > 10) {
      history.shift();
    }
    
    this.playlistHistory.set(layerId, history);
    
    return assetId;
  }
  
  private getSequentialIndex(layerId: string): number {
    const playlist = this.playlists.get(layerId)!;
    const currentIndex = this.currentIndices.get(layerId) || 0;
    return (currentIndex + 1) % playlist.assetIds.length;
  }
  
  private getRandomIndex(length: number, layerId: string): number {
    // Use seeded random for deterministic behavior in video rendering
    const seed = this.randomSeeds.get(layerId) || 0;
    const newSeed = (seed * 9301 + 49297) % 233280;
    this.randomSeeds.set(layerId, newSeed);
    return Math.floor((newSeed / 233280) * length);
  }
  
  private getVelocityMappedIndex(length: number, velocity: number): number {
    // Map velocity (0-127) to array index
    const normalizedVelocity = Math.max(0, Math.min(127, velocity)) / 127;
    return Math.floor(normalizedVelocity * length);
  }
  
  getCurrentAsset(layerId: string): string | null {
    const playlist = this.playlists.get(layerId);
    const index = this.currentIndices.get(layerId);
    
    if (!playlist || index === undefined) return null;
    return playlist.assetIds[index] || null;
  }
  
  getCurrentIndex(layerId: string): number {
    return this.currentIndices.get(layerId) || 0;
  }
  
  setCurrentIndex(layerId: string, index: number): void {
    const playlist = this.playlists.get(layerId);
    if (!playlist) return;
    
    const validIndex = Math.max(0, Math.min(index, playlist.assetIds.length - 1));
    this.currentIndices.set(layerId, validIndex);
  }
  
  getPlaylistHistory(layerId: string): string[] {
    return this.playlistHistory.get(layerId) || [];
  }
  
  clearHistory(layerId: string): void {
    this.playlistHistory.set(layerId, []);
  }
  
  getAssetPosition(layerId: string, assetId: string): number {
    const playlist = this.playlists.get(layerId);
    if (!playlist) return -1;
    return playlist.assetIds.indexOf(assetId);
  }
  
  shufflePlaylist(layerId: string): void {
    const playlist = this.playlists.get(layerId);
    if (!playlist) return;
    
    // Fisher-Yates shuffle algorithm
    const shuffled = [...playlist.assetIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    playlist.assetIds = shuffled;
    this.currentIndices.set(layerId, 0);
  }
  
  addAssetToPlaylist(layerId: string, assetId: string, position?: number): boolean {
    const playlist = this.playlists.get(layerId);
    if (!playlist) return false;
    
    if (position !== undefined && position >= 0 && position <= playlist.assetIds.length) {
      playlist.assetIds.splice(position, 0, assetId);
    } else {
      playlist.assetIds.push(assetId);
    }
    
    return true;
  }
  
  removeAssetFromPlaylist(layerId: string, assetId: string): boolean {
    const playlist = this.playlists.get(layerId);
    if (!playlist) return false;
    
    const index = playlist.assetIds.indexOf(assetId);
    if (index === -1) return false;
    
    playlist.assetIds.splice(index, 1);
    
    // Adjust current index if necessary
    const currentIndex = this.currentIndices.get(layerId) || 0;
    if (currentIndex >= index && currentIndex > 0) {
      this.currentIndices.set(layerId, currentIndex - 1);
    }
    
    return true;
  }
  
  moveAssetInPlaylist(layerId: string, fromIndex: number, toIndex: number): boolean {
    const playlist = this.playlists.get(layerId);
    if (!playlist) return false;
    
    if (fromIndex < 0 || fromIndex >= playlist.assetIds.length ||
        toIndex < 0 || toIndex >= playlist.assetIds.length) {
      return false;
    }
    
    const [movedAsset] = playlist.assetIds.splice(fromIndex, 1);
    playlist.assetIds.splice(toIndex, 0, movedAsset);
    
    // Adjust current index if necessary
    const currentIndex = this.currentIndices.get(layerId) || 0;
    if (currentIndex === fromIndex) {
      this.currentIndices.set(layerId, toIndex);
    } else if (currentIndex > fromIndex && currentIndex <= toIndex) {
      this.currentIndices.set(layerId, currentIndex - 1);
    } else if (currentIndex < fromIndex && currentIndex >= toIndex) {
      this.currentIndices.set(layerId, currentIndex + 1);
    }
    
    return true;
  }
  
  getPlaylistStats(layerId: string): {
    totalAssets: number;
    currentPosition: number;
    cycleMode: string;
    historyLength: number;
  } | null {
    const playlist = this.playlists.get(layerId);
    if (!playlist) return null;
    
    return {
      totalAssets: playlist.assetIds.length,
      currentPosition: this.currentIndices.get(layerId) || 0,
      cycleMode: playlist.cycleMode,
      historyLength: this.playlistHistory.get(layerId)?.length || 0
    };
  }
  
  exportPlaylistData(layerId: string): string | null {
    const playlist = this.playlists.get(layerId);
    if (!playlist) return null;
    
    const data = {
      playlist,
      currentIndex: this.currentIndices.get(layerId),
      history: this.playlistHistory.get(layerId)
    };
    
    return JSON.stringify(data, null, 2);
  }
  
  importPlaylistData(layerId: string, jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.playlist || !data.playlist.assetIds) {
        return false;
      }
      
      this.setPlaylist(data.playlist);
      
      if (data.currentIndex !== undefined) {
        this.currentIndices.set(layerId, data.currentIndex);
      }
      
      if (data.history) {
        this.playlistHistory.set(layerId, data.history);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import playlist data:', error);
      return false;
    }
  }
}