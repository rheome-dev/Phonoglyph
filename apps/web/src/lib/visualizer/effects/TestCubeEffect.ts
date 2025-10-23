import * as THREE from 'three';
import { VisualEffect, AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';
import { debugLog } from '@/lib/utils';

export class TestCubeEffect implements VisualEffect {
  id = 'test-cube';
  name = 'Test Cube';
  description = 'Simple rotating cube for testing Three.js rendering';
  enabled = true;
  parameters = {};

  private scene!: THREE.Scene;
  private mesh!: THREE.Mesh;
  private rotationSpeed = 0.01;

  init(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer): void {
    debugLog.log('🧊 TestCubeEffect.init() called');
    this.scene = scene;
    
    // Create a simple cube (make it bright and obvious)
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xff0000, // Bright red
      wireframe: true  // Wireframe to ensure it's visible
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(0, 0, 0);
    
    this.scene.add(this.mesh);
    debugLog.log('🧊 Test cube added to scene');
  }

  update(deltaTime: number, audioData: AudioAnalysisData, midiData: LiveMIDIData): void {
    if (!this.mesh) return;
    
    // Rotate the cube
    this.mesh.rotation.x += this.rotationSpeed;
    this.mesh.rotation.y += this.rotationSpeed * 0.7;
    
    // Scale based on audio intensity
    const scale = 1 + audioData.volume * 0.5;
    this.mesh.scale.setScalar(scale);
    
    // Change color based on MIDI activity
    if (midiData.activeNotes.length > 0) {
      (this.mesh.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
    } else {
      (this.mesh.material as THREE.MeshBasicMaterial).color.setHex(0x00ff00);
    }
  }

  destroy(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
    }
  }
} 