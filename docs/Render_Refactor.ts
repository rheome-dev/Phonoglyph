Technical Guide: Refactoring the Raybox Rendering Pipeline

Objective:
Transition the VisualizerManager from a monolithic, single-scene renderer to a modular orchestrator that leverages the existing MultiLayerCompositor. This will enable true layering of visual effects, which is a prerequisite for all advanced composition features.

This guide provides the necessary file contexts and a step-by-step plan to perform the refactor.

Step 1: Update the VisualEffect Interface

The current interface implicitly assumes all effects operate on a single, shared scene. We must change this contract to enforce that each effect is a self-contained rendering unit.

File: types/visualizer.ts

code
TypeScript
download
content_copy
expand_less
import * as THREE from 'three';

export interface VisualEffect {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  parameters: Record<string, any>;
  // This init signature is problematic as it provides the main scene
  init(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer): void;
  update(deltaTime: number, audioData: AudioAnalysisData, midiData: LiveMIDIData): void;
  destroy(): void;
}

// ... other types
Refactoring Guide:

Change the init signature: It should only receive the renderer, as the effect is now responsible for its own scene and camera.

Add getScene() and getCamera() methods: These are essential for the MultiLayerCompositor to render the effect to its off-screen texture.

New VisualEffect Interface:

code
TypeScript
download
content_copy
expand_less
// types/visualizer.ts (Updated)
import * as THREE from 'three';
// ... other imports

export interface VisualEffect {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  parameters: Record<string, any>;
  
  // New Signature: The effect is self-contained.
  init(renderer: THREE.WebGLRenderer): void;
  
  update(deltaTime: number, audioData: AudioAnalysisData, midiData: LiveMIDIData): void;
  destroy(): void;

  // New Required Methods: Expose the effect's internal scene and camera.
  getScene(): THREE.Scene;
  getCamera(): THREE.Camera;
}
Step 2: Refactor Existing Effects

All current effects (MetaballsEffect, ParticleNetworkEffect) add their objects directly to the main scene. They must be updated to manage their own internal scene.

A. Refactor MetaballsEffect.ts

File: lib/visualizer/effects/MetaballsEffect.ts

Current Problem: The init method adds its mesh directly to the main scene passed into it.

code
TypeScript
download
content_copy
expand_less
// lib/visualizer/effects/MetaballsEffect.ts (Current State)

export class MetaballsEffect implements VisualEffect {
  // ... properties
  private scene!: THREE.Scene;
  private mesh!: THREE.Mesh;

  init(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer): void {
    this.scene = scene;
    // ...
    this.createMesh(); // This method calls this.scene.add(this.mesh)
  }

  private createMesh() {
    // ...
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh); // <-- THIS IS THE PROBLEM
    // ...
  }
  
  destroy(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh); // <-- DEPENDS ON MAIN SCENE
      // ...
    }
  }
}
Refactoring Guide:

Remove the this.scene property that holds the main scene.

Add properties for an internal scene and camera (internalScene, internalCamera). An orthographic camera is ideal for a full-screen shader effect.

In init, create the internal scene and camera.

In createMesh, add the mesh to this.internalScene instead of this.scene.

Implement the required getScene() and getCamera() methods.

New MetaballsEffect.ts Structure:

code
TypeScript
download
content_copy
expand_less
// lib/visualizer/effects/MetaballsEffect.ts (Refactored)
import * as THREE from 'three';
// ... other imports

export class MetaballsEffect implements VisualEffect {
  // ... other properties
  private internalScene!: THREE.Scene;
  private internalCamera!: THREE.OrthographicCamera; // Use Orthographic for full-screen shader
  private mesh!: THREE.Mesh;

  // init signature now only takes the renderer
  init(renderer: THREE.WebGLRenderer): void {
    this.internalScene = new THREE.Scene();
    // A simple camera for rendering a full-screen plane
    this.internalCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const size = renderer.getSize(new THREE.Vector2());
    this.uniforms.uResolution.value.set(size.x, size.y);
    
    this.createMaterial();
    this.createMesh();
  }

  private createMesh() {
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.internalScene.add(this.mesh); // <-- CORRECT: Add to internal scene
  }

  // New required methods
  public getScene(): THREE.Scene {
    return this.internalScene;
  }

  public getCamera(): THREE.Camera {
    return this.internalCamera;
  }

  destroy(): void {
    if (this.mesh) {
      this.internalScene.remove(this.mesh); // <-- CORRECT: Remove from internal scene
      this.mesh.geometry.dispose();
      this.material.dispose();
    }
  }
  
  // ... rest of the class (update, updateParameter, etc.) remains the same
}
B. Refactor ParticleNetworkEffect.ts

Apply the exact same pattern to the particle effect.

File: lib/visualizer/effects/ParticleNetworkEffect.ts

Current Problem: Adds instancedMesh and connectionLines directly to the main scene.

Refactoring Guide:

Add internalScene and internalCamera properties. A perspective camera is more appropriate here.

In init, create the internal scene and camera.

Add the instancedMesh and connectionLines to this.internalScene.

Implement getScene() and getCamera().

New ParticleNetworkEffect.ts Structure:

code
TypeScript
download
content_copy
expand_less
// lib/visualizer/effects/ParticleNetworkEffect.ts (Refactored)
import * as THREE from 'three';
// ... other imports

export class ParticleNetworkEffect implements VisualEffect {
  // ... other properties
  private internalScene!: THREE.Scene;
  private camera!: THREE.Camera; // This can now be the internal camera

  init(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer): void {
    this.internalScene = new THREE.Scene();
    this.camera = camera; // It's okay to reuse the main camera if the effect is 3D
    // ...
    this.createParticleSystem(); // This method adds to `this.scene`
    this.createConnectionSystem(); // This method adds to `this.scene`
  }

  // Modify methods to add to internalScene
  private createParticleSystem() {
    // ...
    this.scene.add(this.instancedMesh); // CHANGE TO: this.internalScene.add(this.instancedMesh);
  }

  private createConnectionSystem() {
    // ...
    this.scene.add(this.connectionLines); // CHANGE TO: this.internalScene.add(this.connectionLines);
  }

  // New required methods
  public getScene(): THREE.Scene {
    return this.internalScene;
  }

  public getCamera(): THREE.Camera {
    return this.camera; // The effect can use its own camera or the main one
  }

  // ... rest of the class
}
Step 3: Revise the VisualizerManager to use the Compositor

This is the final and most important step. We will change the manager from a direct renderer into an orchestrator for the MultiLayerCompositor.

File: lib/visualizer/core/VisualizerManager.ts

Current Problem: The animate loop renders the main scene directly, and addEffect is tightly coupled to the main scene.

Refactoring Guide:

Initialize MultiLayerCompositor: Create an instance in the constructor.

Modify addEffect:

It should no longer call effect.init(this.scene, ...).

It should now call effect.init(this.renderer).

It will then create a layer in the compositor: this.multiLayerCompositor.createLayer(effect.id, effect.getScene(), effect.getCamera()).

Rewrite the animate loop:

Remove all direct calls to this.renderer.render() or this.bloomEffect.composer.render().

The loop will now:

Update all effects (effect.update(...)).

Call this.multiLayerCompositor.render().

Integrate BloomEffect: The BloomEffect should be refactored to be a final pass that takes the MultiLayerCompositor's output texture as its input, rather than rendering the main scene itself. For simplicity in this step, we will use the compositor's own bloom path.

New VisualizerManager.ts Structure:

code
TypeScript
download
content_copy
expand_less
// lib/visualizer/core/VisualizerManager.ts (Refactored)
import * as THREE from 'three';
import { MultiLayerCompositor } from './MultiLayerCompositor';
// ... other imports

export class VisualizerManager {
  // ... properties
  private scene!: THREE.Scene; // This can now be considered the "base" or "background" scene
  private multiLayerCompositor!: MultiLayerCompositor; // NEW
  // The bloomEffect will now be managed by the compositor
  // private bloomEffect: BloomEffect | null = null;

  constructor(canvas: HTMLCanvasElement, config: VisualizerConfig) {
    // ... existing initScene, setupEventListeners
    this.initCompositor(config);
  }

  private initCompositor(config: VisualizerConfig) {
    this.multiLayerCompositor = new MultiLayerCompositor(this.renderer, {
      width: config.canvas.width,
      height: config.canvas.height,
      enableBloom: config.performance?.enableBloom ?? true,
    });
    // Add the base 3D scene as the bottom layer
    this.multiLayerCompositor.createLayer('base', this.scene, this.camera, { zIndex: -1 });
  }

  public addEffect(effect: VisualEffect) {
    try {
      debugLog.log(`🎨 Adding effect: ${effect.name} (${effect.id})`);
      effect.init(this.renderer); // NEW: Pass only renderer
      this.effects.set(effect.id, effect);
      
      // NEW: Create a layer in the compositor for this effect
      this.multiLayerCompositor.createLayer(effect.id, effect.getScene(), effect.getCamera(), {
        zIndex: this.effects.size, // Simple z-indexing
        enabled: effect.enabled,
      });

      debugLog.log(`✅ Added effect and compositor layer: ${effect.name}.`);
    } catch (error) {
      debugLog.error(`❌ Failed to add effect ${effect.name}:`, error);
    }
  }

  public removeEffect(effectId: string) {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.destroy();
      this.effects.delete(effectId);
      this.multiLayerCompositor.removeLayer(effectId); // NEW: Remove from compositor
      debugLog.log(`✅ Removed effect and compositor layer: ${effect.name}.`);
    }
  }

  enableEffect(effectId: string): void {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.enabled = true;
      this.multiLayerCompositor.updateLayer(effectId, { enabled: true }); // NEW
    }
  }
  
  disableEffect(effectId: string): void {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.enabled = false;
      this.multiLayerCompositor.updateLayer(effectId, { enabled: false }); // NEW
    }
  }

  private animate = () => {
    if (!this.isPlaying) return;

    this.animationId = requestAnimationFrame(this.animate);
    const deltaTime = this.clock.getDelta();

    // 1. Update all effects' internal logic
    this.effects.forEach(effect => {
      if (effect.enabled) {
        const audioData = this.currentAudioData || this.createMockAudioData();
        const midiData = this.currentMidiData || this.createMockMidiData();
        effect.update(deltaTime, audioData, midiData);
      }
    });

    // 2. Render all layers and composite them
    this.multiLayerCompositor.render(); // <-- THE NEW RENDER CALL

    // The old direct render call is now gone.
    // this.renderer.render(this.scene, this.camera);
    // this.bloomEffect.render();
  };
  
  // ... rest of the class
}

By completing these steps, you will have successfully refactored your rendering engine from a monolithic design to a scalable, layer-based compositor architecture. This provides a solid foundation upon which you can reliably build your desired image slideshow, video slicing, and advanced post-processing features.