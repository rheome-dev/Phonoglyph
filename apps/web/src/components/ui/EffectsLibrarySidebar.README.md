# EffectsLibrarySidebar Component

## Overview

The `EffectsLibrarySidebar` component is a refactored version of the horizontal `EffectCarousel` component, designed as a vertical, searchable, and categorized sidebar for effect selection.

## Key Features

- **Vertical Layout**: Replaces horizontal scrolling with vertical scrolling
- **Search Functionality**: Filter effects by name, description, category, or rarity
- **Categorization**: Effects are grouped into collapsible categories
- **Two-Column Grid**: Responsive grid layout for effect cards
- **MTG-Style Cards**: Preserves the Magic: The Gathering card styling with 3D hover effects
- **Rarity-Based Styling**: Different color schemes for Common, Rare, and Mythic effects

## Interface Changes

### New EffectUIData Interface

```typescript
export interface EffectUIData {
  id: string;
  name: string;
  description: string;
  category: 'Generative' | 'Overlays' | 'Post-Processing';
  rarity: 'Common' | 'Rare' | 'Mythic';
}
```

### Component Props

```typescript
interface EffectsLibrarySidebarProps {
  effects: EffectUIData[];
  selectedEffects: Record<string, boolean>;
  onEffectToggle: (effectId: string) => void;
  isVisible: boolean;
  className?: string;
}
```

## Usage Example

```typescript
import { EffectsLibrarySidebar } from './components/ui/EffectsLibrarySidebar';

// Transform existing effect data to include category and rarity
const enhancedEffects: EffectUIData[] = [
  {
    id: 'metaballs',
    name: 'Metaballs Effect',
    description: 'Organic, fluid-like visualizations that respond to audio intensity',
    category: 'Generative',
    rarity: 'Rare'
  },
  {
    id: 'midiHud',
    name: 'HUD Effect',
    description: 'Technical overlay displaying real-time audio analysis and MIDI data',
    category: 'Overlays',
    rarity: 'Common'
  },
  {
    id: 'particleNetwork',
    name: 'Particle Effect',
    description: 'Dynamic particle systems that react to rhythm and pitch',
    category: 'Generative',
    rarity: 'Mythic'
  }
];

function MyComponent() {
  const [selectedEffects, setSelectedEffects] = useState<Record<string, boolean>>({
    'metaballs': true,
    'midiHud': false,
    'particleNetwork': true
  });
  const [isLibraryVisible, setIsLibraryVisible] = useState(true);

  const handleEffectToggle = (effectId: string) => {
    setSelectedEffects(prev => ({
      ...prev,
      [effectId]: !prev[effectId]
    }));
  };

  return (
    <div className="flex h-screen">
      {/* Main content */}
      <div className="flex-1">
        {/* Your main content here */}
      </div>
      
      {/* Right sidebar */}
      <div className="w-96">
        <EffectsLibrarySidebar
          effects={enhancedEffects}
          selectedEffects={selectedEffects}
          onEffectToggle={handleEffectToggle}
          isVisible={isLibraryVisible}
        />
      </div>
    </div>
  );
}
```

## Migration from EffectCarousel

### Removed Dependencies

- `embla-carousel-react` - No longer needed for horizontal scrolling
- All carousel-related event handlers and state

### Added Dependencies

- Standard React hooks (`useState`, `useMemo`)
- Lucide React icons (`ChevronDown`, `ChevronRight`, `Search`, `X`)

### Layout Changes

1. **Container Structure**: 
   - Horizontal → Vertical layout
   - Embla carousel wrapper → Standard flex container
   - Fixed height with scrollable content area

2. **Card Layout**:
   - Single row → Two-column grid
   - Flex horizontal layout → CSS Grid
   - Maintains card aspect ratio and styling

3. **Search and Categories**:
   - Added search input with clear functionality
   - Collapsible category sections
   - Effect count per category

### Styling Updates

- **Rarity Colors**: 
  - Common: Zinc/Stone gradients (original style)
  - Rare: Blue gradients
  - Mythic: Orange/Amber gradients
- **Responsive Design**: Adapts to narrow screens with single-column layout
- **3D Effects**: Reduced rotation intensity for tighter grid layout

## Technical Notes

### Performance Considerations

- Uses `useMemo` for expensive filtering and categorization operations
- Efficient re-rendering only when `effects` or `searchQuery` changes
- Conditional rendering based on `isVisible` prop

### Accessibility

- Keyboard navigation for category toggles
- Screen reader friendly search input
- Semantic HTML structure with proper ARIA labels

### Browser Support

- CSS Grid (IE11+ with autoprefixer)
- CSS Custom Properties (IE11+ with polyfill)
- Modern JavaScript features (ES2018+)

## Future Enhancements

1. **Drag & Drop**: Reorder effects within categories
2. **Favorites**: Star/favorite effects for quick access
3. **Import/Export**: Save and load effect collections
4. **Filtering**: Advanced filters by rarity, category, etc.
5. **Preview**: Inline effect previews on hover 