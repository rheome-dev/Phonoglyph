# Layer Management System

## Overview

The Layer Management System provides a professional DAW-style interface for organizing video, image, and effect layers in the MIDI visualizer. This system enables users to create complex video compositions with multiple layers, effects, and sophisticated blending modes.

## Architecture

### Core Components

- **`LayerStack`** - Main container for the layer management interface
- **`LayerItem`** - Individual layer representation with controls
- **`LayerControls`** - Bulk operations toolbar for selected layers
- **`AddLayerMenu`** - Dropdown menu for creating new layers
- **`BlendModeSelector`** - Selector for layer blend modes

### State Management

- **`layerStore.ts`** - Zustand store managing all layer state and operations
- **Persistence** - Layer configuration is persisted via Zustand middleware
- **Performance** - Optimized for real-time layer manipulation

## Layer Types

### Video Layers
- Asset-based video playback
- Transform controls (position, scale, rotation)
- Playback rate and volume controls
- Trimming and timing controls

### Image Layers  
- Static image display
- Transform controls
- Perfect for backgrounds and overlays

### Effect Layers
- **Metaballs** - Organic blob-like animations
- **Particles** - Interactive particle networks
- **MIDI HUD** - Real-time MIDI information display
- **Bloom** - Glowing light effects
- MIDI binding support for real-time parameter control

### Group Layers
- Organize multiple layers into hierarchical groups
- Collapse/expand for better organization
- Group-level transformations and properties

## Features

### 🎛️ Professional Interface
- DAW-style layer stack similar to audio mixing interfaces
- Color-coded layer types for quick identification
- Intuitive iconography and visual feedback

### 🖱️ Drag & Drop
- Smooth layer reordering with visual feedback
- Automatic z-index management
- Real-time preview during drag operations

### 👁️ Visibility & Muting
- Toggle layer visibility for isolation testing
- Mute layers to disable audio/effects
- Bulk operations for multiple layers

### 🎨 Blend Controls
- **Opacity** - Precise opacity control with slider
- **Blend Modes** - Normal, Multiply, Screen, Overlay, Darken, Lighten
- Real-time preview of blend effects

### 📁 Organization
- **Grouping** - Create hierarchical layer groups
- **Selection** - Multi-select with Cmd/Ctrl + click
- **Duplication** - Copy layers with all properties

### ⌨️ Keyboard Shortcuts
- `Delete` / `Backspace` - Delete selected layers
- `Cmd/Ctrl + D` - Duplicate selected layer
- `V` - Toggle visibility of selected layer
- `M` - Toggle mute of selected layer
- `Cmd/Ctrl + ]` - Move layer to top
- `Cmd/Ctrl + [` - Move layer to bottom
- `Escape` - Clear selection

## Usage

### Basic Layer Operations

```typescript
import { useLayerStore } from '@/lib/stores/layerStore';

const { addLayer, selectLayer, updateLayer } = useLayerStore();

// Add a new video layer
const videoLayerId = addLayer({
  name: 'Background Video',
  type: 'video',
  visible: true,
  opacity: 1,
  blendMode: 'normal',
  // ... other properties
});

// Select and modify layer
selectLayer(videoLayerId);
updateLayer(videoLayerId, { opacity: 0.5 });
```

### Integration with Creative Visualizer

The LayerStack is integrated into the creative visualizer page:

```typescript
// In creative-visualizer/page.tsx
import { LayerStack } from '@/components/video/LayerStack';
import { useLayerKeyboardShortcuts } from '@/hooks/useLayerKeyboardShortcuts';

export default function CreativeVisualizerPage() {
  useLayerKeyboardShortcuts(); // Enable keyboard shortcuts
  
  return (
    <div className="flex h-screen">
      {/* Main content */}
      <main className="flex-1">
        {/* Three.js visualization */}
      </main>
      
      {/* Layer Management Sidebar */}
      <div className="w-80 bg-stone-900/50 border-l border-white/10 p-4">
        <LayerStack />
      </div>
    </div>
  );
}
```

### Remotion Integration

The `LayerRenderer` component bridges the layer system with Remotion:

```typescript
// In video composition
import { LayerRenderer } from './LayerRenderer';

export const VideoComposition = () => {
  return (
    <AbsoluteFill>
      <LayerRenderer /> {/* Renders all visible layers */}
    </AbsoluteFill>
  );
};
```

## Development

### Adding New Layer Types

1. Extend the `Layer` union type in `layerStore.ts`
2. Add the new layer interface following the `BaseLayer` pattern
3. Update the `AddLayerMenu` component with creation logic
4. Implement rendering in `LayerRenderer.tsx`

### Adding New Blend Modes

1. Add to the `BlendMode` type in `layerStore.ts`
2. Update the `BlendModeSelector` component
3. Test CSS `mix-blend-mode` compatibility

### Extending Keyboard Shortcuts

Add new shortcuts in `useLayerKeyboardShortcuts.ts`:

```typescript
case 'KeyG':
  if (e.metaKey || e.ctrlKey) {
    e.preventDefault();
    // Group selected layers
    if (selectedLayerIds.length > 1) {
      groupLayers(selectedLayerIds, 'New Group');
    }
  }
  break;
```

## Testing

The layer system includes comprehensive unit tests:

```bash
cd apps/web
pnpm test src/__tests__/layerStore.test.ts
```

Test coverage includes:
- Layer CRUD operations
- Drag and drop reordering
- Multi-selection behavior
- Group operations
- Property updates
- Bulk operations

## Performance Considerations

- **Virtual Scrolling** - Large layer lists are efficiently rendered
- **Debounced Updates** - High-frequency operations are batched
- **Selective Re-renders** - Components only update when relevant state changes
- **Memory Management** - Layer resources are properly cleaned up

## Future Enhancements

- **Timeline Integration** - Layer timing visualization
- **Advanced Animations** - Keyframe-based property animations
- **Layer Effects** - Built-in filters and transforms
- **Template System** - Save and load layer configurations
- **MIDI Automation** - More sophisticated MIDI parameter binding

## Design System

The layer management interface follows the existing design system:
- **Colors** - Stone palette with accent colors for layer types
- **Typography** - Consistent font hierarchy
- **Spacing** - 4px grid system
- **Animations** - Smooth transitions and hover states
- **Accessibility** - Keyboard navigation and screen reader support