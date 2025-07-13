import React from 'react';
import { useDrag } from 'react-dnd';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableFileProps {
  file: {
    id: string;
    name: string;
    file_type: string;
    file_size?: number;
    uploading?: boolean;
  };
  onClick?: () => void;
  onDelete?: () => void;
  isSelected?: boolean;
  className?: string;
}

export const DraggableFile: React.FC<DraggableFileProps> = ({
  file,
  onClick,
  onDelete,
  isSelected = false,
  className
}) => {
  const getFileType = () => {
    const ext = file.name.toLowerCase().split('.').pop();
    if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext || "")) return "video";
    if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext || "")) return "image";
    if (["mp3", "wav", "ogg", "m4a", "aac"].includes(ext || "")) return "audio";
    if (["mid", "midi"].includes(ext || "")) return "midi";
    return "unknown";
  };

  const getIcon = () => {
    const type = getFileType();
    switch (type) {
      case "video": return <span className="text-xs">🎬</span>;
      case "image": return <span className="text-xs">🖼️</span>;
      case "audio": return <span className="text-xs">🎵</span>;
      case "midi": return <span className="text-xs">🎹</span>;
      default: return <span className="text-xs">📄</span>;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const dragResult = useDrag({
    type: getFileType().toUpperCase() + '_FILE',
    item: {
      type: getFileType().toUpperCase() + '_FILE',
      id: file.id,
      name: file.name,
      fileType: getFileType(),
      src: `/api/files/${file.id}/download`,
      size: file.file_size,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  const { isDragging } = dragResult[0];
  const drag = dragResult[1];
  const dragRef = React.useCallback((node: HTMLDivElement | null) => { drag(node); }, [drag]);

  return (
    <div
      ref={dragRef}
      className={cn(
        "flex items-center border border-stone-400 bg-stone-300 text-black font-mono text-xs h-8 px-2 gap-2 select-none transition-colors duration-100",
        "hover:bg-stone-900 hover:text-stone-100 hover:border-stone-500 cursor-grab active:cursor-grabbing",
        isSelected && "bg-stone-900 text-stone-100 border-stone-500",
        isDragging && "relative z-20 bg-white/30 backdrop-blur-md border border-white/40 shadow-2xl text-black",
        className
      )}
      style={{ borderRadius: 2, minHeight: 32, maxHeight: 32 }}
      onClick={onClick}
      tabIndex={0}
    >
      {/* Icon */}
      <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">{getIcon()}</div>
      {/* Name */}
      <div className="truncate flex-1 font-medium" title={file.name} style={{ maxWidth: 140 }}>{file.name}</div>
      {/* Delete */}
      <button
        className="ml-1 p-0.5 text-black hover:text-red-600 border-none bg-transparent focus:outline-none"
        style={{ lineHeight: 1, borderRadius: 1 }}
        tabIndex={-1}
        onClick={e => { e.stopPropagation(); onDelete && onDelete(); }}
        aria-label="Delete file"
      >
        <Trash2 size={12} strokeWidth={2} />
      </button>
      {/* Loading bar if uploading */}
      {file.uploading && (
        <div className="absolute left-0 bottom-0 w-full h-0.5 bg-gradient-to-r from-black to-gray-400 animate-pulse" />
      )}
    </div>
  );
}; 