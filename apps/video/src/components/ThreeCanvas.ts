import * as THREE from 'three';
import type { MIDIData, VisualizationSettings } from '../types';

interface ThreeCanvasOptions {
  midiData: MIDIData;
  settings?: VisualizationSettings;
  effectType: 'metaballs' | 'particles' | 'midihud' | 'bloom';
  currentTime: number;
  opacity: number;
}

export class ThreeCanvas {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private options: ThreeCanvasOptions;

  constructor(canvas: HTMLCanvasElement, options: ThreeCanvasOptions) {
    this.options = options;
    
    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.width / canvas.height,
      0.1,
      1000
    );
    
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      preserveDrawingBuffer: true, // Important for video capture
      alpha: true
    });
    
    this.renderer.setSize(canvas.width, canvas.height);
    this.renderer.setClearColor(0x000000, 0); // Transparent background
    
    // Initialize the specific effect based on type
    this.initializeEffect();
  }

  private initializeEffect(): void {
    // TODO: This will integrate with existing Three.js effects from the monorepo
    // For now, create a simple placeholder effect
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00,
      transparent: true,
      opacity: this.options.opacity
    });
    const cube = new THREE.Mesh(geometry, material);
    this.scene.add(cube);
    
    this.camera.position.z = 5;
  }

  public render(): void {
    // Update animation based on current time
    this.updateAnimation();
    
    // Render the frame
    this.renderer.render(this.scene, this.camera);
  }

  private updateAnimation(): void {
    // Update effect based on MIDI data and current time
    // This will be replaced with actual MIDI-driven animations
    const time = this.options.currentTime;
    
    // Simple rotation for placeholder
    this.scene.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        child.rotation.x = time * 0.5;
        child.rotation.y = time * 0.3;
      }
    });
  }

  public dispose(): void {
    // Clean up Three.js resources
    this.scene.clear();
    this.renderer.dispose();
    
    // Dispose of materials and geometries
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }
}