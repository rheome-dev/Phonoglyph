# Design System

## Visual Identity & Aesthetic Direction

### Core Design Philosophy
**"Technical Minimalism with Experimental Typography"**

Based on aesthetic references, MidiViz embraces a **technical brutalist** approach with **scientific documentation** precision, incorporating **retro computing** elements and **bold typographic experiments**.

### Design Principles
1. **Utilitarian Clarity**: Function-first design with purposeful visual hierarchy
2. **Technical Precision**: Grid-based layouts with mathematical relationships
3. **Typographic Expression**: Bold, experimental text treatments as primary visual elements
4. **Strategic Minimalism**: Abundant white space with focused content areas
5. **High Contrast Accessibility**: Clear visual separation and readable interfaces

## Typography System

### Primary Font Stack
```css
/* Terminal/Code Aesthetic */
--font-mono: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace;

/* Clean Sans-Serif */
--font-sans: 'Inter', 'Helvetica Neue', 'Arial', sans-serif;

/* Display/Experimental */
--font-display: 'Space Grotesk', 'Inter', sans-serif;
```

### Typography Scale
```css
/* Technical Documentation Scale */
--text-xs: 0.75rem;    /* 12px - Metadata, captions */
--text-sm: 0.875rem;   /* 14px - Body small, labels */
--text-base: 1rem;     /* 16px - Body text */
--text-lg: 1.125rem;   /* 18px - Emphasized body */
--text-xl: 1.25rem;    /* 20px - Small headings */
--text-2xl: 1.5rem;    /* 24px - Section headings */
--text-3xl: 1.875rem;  /* 30px - Page headings */
--text-4xl: 2.25rem;   /* 36px - Display headings */
--text-5xl: 3rem;      /* 48px - Hero text */
--text-6xl: 3.75rem;   /* 60px - Large display */
```

### Typography Usage
```css
/* Component Typography Patterns */
.code-aesthetic {
  font-family: var(--font-mono);
  font-weight: 400;
  letter-spacing: -0.01em;
  line-height: 1.4;
}

.technical-heading {
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: -0.02em;
  text-transform: uppercase;
  line-height: 1.1;
}

.body-technical {
  font-family: var(--font-sans);
  font-weight: 400;
  line-height: 1.6;
  letter-spacing: -0.005em;
}
```

## Color System

### Primary Palette
```css
/* Monochromatic Foundation */
--color-black: #000000;
--color-gray-900: #0a0a0a;
--color-gray-800: #1a1a1a;
--color-gray-700: #2a2a2a;
--color-gray-600: #3a3a3a;
--color-gray-500: #6b7280;
--color-gray-400: #9ca3af;
--color-gray-300: #d1d5db;
--color-gray-200: #e5e7eb;
--color-gray-100: #f3f4f6;
--color-white: #ffffff;
```

### Technical Brutalist Stone Palette
```css
/* Stone/Concrete Aesthetic - Primary for Creative Visualizer */
--stone-50: #fafaf9;       /* Lightest stone */
--stone-100: #f5f5f4;      /* Very light stone */
--stone-200: #e7e5e4;      /* Light stone - control backgrounds */
--stone-300: #d6d3d1;      /* Medium light stone - panels */
--stone-400: #a8a29e;      /* Medium stone - borders */
--stone-500: #78716c;      /* Primary stone - backgrounds */
--stone-600: #57534e;      /* Dark stone - buttons */
--stone-700: #44403c;      /* Darker stone */
--stone-800: #292524;      /* Very dark stone */
--stone-900: #1c1917;      /* Darkest stone */
```

### Accent Colors
```css
/* Sophisticated Muted Accents */
--color-slate-primary: #475569;   /* Interactive elements */
--color-slate-light: #64748b;     /* Hover states */
--color-sage-accent: #84a98c;     /* Success, upload */
--color-terracotta-accent: #a8756b; /* Errors, delete */
--color-amber-muted: #b8936d;     /* Warnings, processing */
--color-lavender-accent: #9b8db5; /* Secondary actions */

/* Muted Visualization Colors */
--color-sage-viz: #84a98c;        /* Audio waveforms */
--color-slate-viz: #6b7c93;       /* MIDI data */
--color-dusty-rose-viz: #b08a8a;  /* Accent elements */
--color-warm-gray-viz: #a8a29e;   /* Background elements */
--color-soft-blue-viz: #8da3b0;   /* Timeline markers */
```

### Color Usage Guidelines
```css
/* Interface Color Applications */
.bg-primary { background-color: var(--color-white); }
.bg-secondary { background-color: var(--color-gray-100); }
.bg-dark { background-color: var(--color-gray-900); }
.bg-code { background-color: var(--color-gray-50); }

.text-primary { color: var(--color-gray-900); }
.text-secondary { color: var(--color-gray-600); }
.text-inverse { color: var(--color-white); }
.text-accent { color: var(--color-slate-primary); }

/* Technical Brutalist Applications */
.bg-stone-primary { background-color: var(--stone-500); }
.bg-stone-panel { background-color: var(--stone-300); }
.bg-stone-control { background-color: var(--stone-200); }
.border-stone { border-color: var(--stone-400); }
.text-stone-primary { color: var(--stone-700); }
.text-stone-secondary { color: var(--stone-600); }
```

## Glassmorphism & Blur Effects

### Frosted Glass Components
```css
/* Core Glassmorphism Variables */
--glass-bg: rgba(255, 255, 255, 0.1);
--glass-bg-strong: rgba(255, 255, 255, 0.2);
--glass-border: rgba(255, 255, 255, 0.2);
--glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
--glass-shadow-strong: 0 12px 40px rgba(0, 0, 0, 0.15);

/* Glassmorphism Base Class */
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  box-shadow: var(--glass-shadow);
}

.glass-strong {
  background: var(--glass-bg-strong);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  box-shadow: var(--glass-shadow-strong);
}

/* Soft Edge Variants */
.soft-edges {
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.soft-edges-large {
  border-radius: 24px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}
```

### Modal & Popup Components
```css
/* Glassmorphism Modal Overlay */
.modal-overlay {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  position: fixed;
  inset: 0;
  z-index: 1000;
}

/* Modal Content with Frosted Glass */
.modal-content {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  padding: 32px;
  max-width: 600px;
  width: 90vw;
}

/* Settings Panel with Glass Effect */
.settings-panel-glass {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 20px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
  padding: 24px;
  width: 320px;
}

/* Notification Toast with Glass */
.toast-glass {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  padding: 16px 20px;
}
```

## Technical Control Interfaces

### Creative Visualizer Control Pattern
```css
/* Technical Display Components - Inspired by creative visualizer implementation */
.technical-display {
  background: rgba(231, 229, 228, 0.9);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(120, 113, 108, 0.3);
  border-radius: 8px;
  padding: 16px 24px;
  color: var(--stone-600);
  font-family: var(--font-sans);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.75rem;
}

/* Technical Control Buttons */
.technical-button-primary {
  background-color: var(--stone-600);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-family: var(--font-sans);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.875rem;
  transition: all 0.3s ease;
}

.technical-button-primary:hover {
  background-color: var(--stone-700);
}

.technical-button-primary.active {
  background-color: var(--stone-600);
}

.technical-button-secondary {
  background-color: var(--stone-200);
  color: var(--stone-700);
  border: 2px solid var(--stone-400);
  border-radius: 8px;
  padding: 12px 24px;
  font-family: var(--font-sans);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.875rem;
  transition: all 0.3s ease;
}

.technical-button-secondary:hover {
  background-color: var(--stone-100);
  border-color: var(--stone-500);
}

/* Live Status Indicators */
.status-live {
  background-color: rgba(16, 185, 129, 0.8);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-family: var(--font-sans);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-live::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: white;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* Control Panel Layout */
.control-panel-technical {
  background-color: var(--stone-300);
  border: 2px solid var(--stone-400);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* Effect Modal Components */
.draggable-modal {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
  padding: 24px;
  min-width: 320px;
  max-width: 400px;
  position: fixed;
  z-index: 1000;
}

.effect-parameter-slider {
  width: 100%;
  margin: 8px 0;
}

.parameter-label {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--stone-700);
  margin-bottom: 4px;
}

/* 3D Canvas Integration */
.webgl-canvas-container {
  background: var(--stone-500);
  border-radius: 16px;
  padding: 16px;
  box-shadow: inset 0 4px 8px rgba(0, 0, 0, 0.1);
}

.webgl-canvas {
  border-radius: 12px;
  width: 400px;
  height: 711px;
  display: block;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .webgl-canvas {
    width: 100%;
    height: auto;
    aspect-ratio: 400 / 711;
  }
}
```

## 3D Visualization Design Patterns

### Performance-First Design Philosophy
```css
/* Mobile-optimized canvas dimensions and performance targets */
.visualizer-mobile-canvas {
  width: 400px;
  height: 711px; /* 9:16 portrait aspect ratio */
  max-width: 100vw;
  max-height: 100vh;
}

/* Performance indicators */
.performance-indicators {
  display: flex;
  gap: 12px;
  align-items: center;
}

.fps-counter {
  background: var(--technical-display);
  padding: 8px 12px;
  border-radius: 6px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.note-counter {
  background: var(--technical-display);
  padding: 8px 12px;
  border-radius: 6px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}
```

### Visual Effect Color Schemes
```css
/* MIDI-reactive color mappings for 3D effects */
:root {
  /* Metaballs Effect Colors */
  --metaball-primary: #CC66FF;
  --metaball-secondary: #33CCFF;
  --metaball-accent: #FF9933;
  
  /* Particle Network Colors */
  --particle-connection: rgba(255, 255, 255, 0.3);
  --particle-glow: rgba(255, 255, 255, 0.8);
  
  /* MIDI HUD Colors */
  --hud-primary: var(--stone-200);
  --hud-accent: var(--emerald-500);
  --hud-warning: var(--amber-500);
}

/* Note-based HSL color generation */
.note-color-mapping {
  /* Pitch-based hue: note % 12 / 12 * 360deg */
  /* Velocity-based saturation: 40% + (velocity/127) * 30% */
  /* Velocity-based lightness: 50% + (velocity/127) * 20% */
}
```

### Shader Material Design Guidelines
```css
/* Consistent shader parameter ranges for UI controls */
.shader-parameters {
  /* Base radius: 0.1 - 1.0 */
  --base-radius-min: 0.1;
  --base-radius-max: 1.0;
  --base-radius-default: 0.25;
  
  /* Smoothing factor: 0.1 - 1.0 */
  --smoothing-min: 0.1;
  --smoothing-max: 1.0;
  --smoothing-default: 0.3;
  
  /* Animation speed: 0.1 - 3.0 */
  --animation-speed-min: 0.1;
  --animation-speed-max: 3.0;
  --animation-speed-default: 0.8;
  
  /* Noise intensity: 0.0 - 3.0 */
  --noise-intensity-min: 0.0;
  --noise-intensity-max: 3.0;
  --noise-intensity-default: 1.5;
  
  /* Particle count: 10 - 100 */
  --particle-count-min: 10;
  --particle-count-max: 100;
  --particle-count-default: 50;
  
  /* Connection distance: 0.5 - 3.0 */
  --connection-distance-min: 0.5;
  --connection-distance-max: 3.0;
  --connection-distance-default: 1.0;
  
  /* Glow intensity: 0.0 - 2.0 */
  --glow-intensity-min: 0.0;
  --glow-intensity-max: 2.0;
  --glow-intensity-default: 0.6;
}
```

### Effect Carousel Design
```css
.effect-carousel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  margin: 24px 0;
}

.effect-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
}

.effect-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.effect-card.active {
  border-color: var(--stone-400);
  background: rgba(231, 229, 228, 0.95);
}

.effect-name {
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.875rem;
  color: var(--stone-700);
  margin-bottom: 8px;
}

.effect-description {
  font-family: var(--font-sans);
  font-size: 0.8rem;
  line-height: 1.4;
  color: var(--stone-600);
}

## Component Design Specifications

### Layout System
```css
/* Grid-Based Layout */
.container-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.grid-technical {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
  margin-bottom: 48px;
}

.section-spacing {
  margin-bottom: 96px; /* Large sections */
}

.component-spacing {
  margin-bottom: 48px; /* Components */
}
```

### Button Components
```css
/* Primary Button - Soft Technical Style */
.btn-primary {
  background: var(--color-slate-primary);
  color: var(--color-white);
  border: 1px solid var(--color-slate-primary);
  padding: 12px 24px;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(71, 85, 105, 0.2);
  transition: all 0.3s ease;
}

.btn-primary:hover {
  background: var(--color-slate-light);
  border-color: var(--color-slate-light);
  box-shadow: 0 6px 20px rgba(71, 85, 105, 0.3);
  transform: translateY(-1px);
}

/* Secondary Button - Glass Effect */
.btn-secondary {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: var(--color-slate-primary);
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 12px 24px;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: var(--color-slate-primary);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

/* Accent Button - Sage */
.btn-accent {
  background: var(--color-sage-accent);
  color: var(--color-white);
  border: 1px solid var(--color-sage-accent);
  padding: 12px 24px;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(132, 169, 140, 0.2);
  transition: all 0.3s ease;
}

.btn-accent:hover {
  background: #96b59e;
  border-color: #96b59e;
  box-shadow: 0 6px 20px rgba(132, 169, 140, 0.3);
  transform: translateY(-1px);
}
```

### Form Elements
```css
/* Input Fields - Soft Technical Aesthetic */
.input-technical {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 12px 16px;
  font-family: var(--font-mono);
  font-size: var(--text-base);
  line-height: 1.4;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.input-technical:focus {
  outline: none;
  border-color: var(--color-slate-primary);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 16px rgba(71, 85, 105, 0.1);
  transform: translateY(-1px);
}

/* File Upload Area - Glassmorphism */
.upload-zone {
  border: 2px dashed rgba(132, 169, 140, 0.4);
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  padding: 48px 24px;
  text-align: center;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  transition: all 0.4s ease;
}

.upload-zone:hover {
  border-color: var(--color-sage-accent);
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.upload-zone.dragover {
  border-color: var(--color-sage-accent);
  background: rgba(132, 169, 140, 0.1);
  box-shadow: 0 16px 48px rgba(132, 169, 140, 0.2);
}
```

### Navigation Components
```css
/* Header Navigation */
.nav-primary {
  background: var(--color-white);
  border-bottom: 2px solid var(--color-gray-200);
  padding: 16px 0;
}

.nav-link {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-gray-700);
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 8px 16px;
  transition: color 0.2s ease;
}

.nav-link:hover {
  color: var(--color-black);
}

.nav-link.active {
  color: var(--color-black);
  font-weight: 700;
}
```

### Card Components
```css
/* Technical Documentation Cards */
.card-technical {
  background: var(--color-white);
  border: 2px solid var(--color-gray-200);
  padding: 24px;
  margin-bottom: 24px;
  transition: border-color 0.2s ease;
}

.card-technical:hover {
  border-color: var(--color-gray-400);
}

.card-header {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-gray-600);
  margin-bottom: 16px;
  letter-spacing: 0.1em;
}
```

## Visualization Components

### MIDI Visualization Canvas
```css
/* Main Canvas Area - Soft Dark Background */
.viz-canvas {
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  min-height: 400px;
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* Timeline Controls - Glass Effect */
.timeline-controls {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  padding: 16px;
  font-family: var(--font-mono);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

/* Settings Panel - Enhanced Glass */
.settings-panel {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 20px;
  padding: 24px;
  width: 320px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
}

.settings-group {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(132, 169, 140, 0.2);
}

.settings-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-slate-primary);
  margin-bottom: 8px;
}

/* Color Picker for Visualization */
.color-picker-group {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-top: 12px;
}

.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.color-swatch:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.color-swatch.sage { background: var(--color-sage-viz); }
.color-swatch.slate { background: var(--color-slate-viz); }
.color-swatch.dusty-rose { background: var(--color-dusty-rose-viz); }
.color-swatch.warm-gray { background: var(--color-warm-gray-viz); }
.color-swatch.soft-blue { background: var(--color-soft-blue-viz); }
```

### Progress Indicators
```css
/* Upload Progress */
.progress-bar {
  background: var(--color-gray-200);
  height: 8px;
  border-radius: 0;
  overflow: hidden;
}

.progress-fill {
  background: var(--color-blue-primary);
  height: 100%;
  transition: width 0.3s ease;
}

/* Loading States */
.loading-dots {
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  color: var(--color-gray-600);
}

.loading-text {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-gray-600);
}
```

## Responsive Design Breakpoints

```css
/* Technical Grid Breakpoints */
@media (min-width: 640px) {  /* sm */
  .container-main { padding: 0 32px; }
}

@media (min-width: 768px) {  /* md */
  .grid-technical { gap: 32px; }
  .section-spacing { margin-bottom: 128px; }
}

@media (min-width: 1024px) { /* lg */
  .container-main { padding: 0 48px; }
}

@media (min-width: 1280px) { /* xl */
  .grid-technical { gap: 48px; }
}
```

## Animation & Interaction Guidelines

### Transition Standards
```css
/* Standard Transitions */
.transition-fast { transition: all 0.15s ease; }
.transition-normal { transition: all 0.2s ease; }
.transition-slow { transition: all 0.3s ease; }

/* Hover Effects */
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.hover-border:hover {
  border-color: var(--color-black);
}
```

### Loading Animations
```css
/* Technical Loading Animation */
@keyframes tech-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading-pulse {
  animation: tech-pulse 2s ease-in-out infinite;
}
```

## Implementation Priority

### Phase 1: Core Components
1. Typography system and font loading
2. Color variables and utility classes
3. Basic button and input components
4. Navigation and layout structure

### Phase 2: Specialized Components
1. File upload interface with technical styling
2. MIDI visualization canvas framework
3. Settings panels and controls
4. Progress indicators and loading states

### Phase 3: Advanced Interactions
1. Animation and transition refinements
2. Mobile responsive optimizations
3. Accessibility enhancements
4. Performance optimizations

## Accessibility Requirements

### Color Contrast
- All text must meet WCAG AA standards (4.5:1 ratio minimum)
- Interactive elements must have 3:1 contrast ratio minimum
- Focus indicators must be clearly visible

### Typography Accessibility
- Minimum font size: 14px for body text
- Line height: 1.4 minimum for readability
- Letter spacing optimized for monospace fonts

### Interactive Elements
- All buttons and links must have focus states
- Click targets minimum 44px for touch interfaces
- Clear visual hierarchy for navigation

This design system ensures your technical brutalist aesthetic is implemented consistently across all components while maintaining usability and accessibility standards. 🎯 