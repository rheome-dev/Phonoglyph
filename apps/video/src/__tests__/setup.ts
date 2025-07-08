import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

// Mock Remotion hooks for testing
vi.mock('remotion', () => ({
  useCurrentFrame: () => 30,
  useVideoConfig: () => ({
    fps: 30,
    durationInFrames: 3000,
    width: 1920,
    height: 1080
  }),
  Audio: ({ src }: { src: string }) => React.createElement('audio', { src }),
  Composition: ({ children }: { children: React.ReactNode }) => React.createElement('div', {}, children)
}));

// Mock Three.js for testing environment
vi.mock('three', () => ({
  Scene: vi.fn(() => ({
    add: vi.fn(),
    clear: vi.fn(),
    traverse: vi.fn(),
    children: []
  })),
  PerspectiveCamera: vi.fn(() => ({
    position: { z: 0 }
  })),
  WebGLRenderer: vi.fn(() => ({
    setSize: vi.fn(),
    setClearColor: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    domElement: document.createElement('canvas')
  })),
  BoxGeometry: vi.fn(() => ({
    dispose: vi.fn()
  })),
  MeshBasicMaterial: vi.fn(() => ({
    dispose: vi.fn()
  })),
  Mesh: vi.fn(() => ({
    geometry: { dispose: vi.fn() },
    material: { dispose: vi.fn() },
    rotation: { x: 0, y: 0, z: 0 }
  }))
}));