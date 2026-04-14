This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: apps/web/src/lib/visualizer/core/VisualizerManager.ts, apps/web/src/lib/visualizer/effects/BaseShaderEffect.ts, apps/web/src/lib/visualizer/effects/MetaballsEffect.ts, apps/web/src/lib/visualizer/effects/ParticleNetworkEffect.ts, apps/web/src/remotion/RayboxComposition.tsx
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
apps/
  web/
    src/
      lib/
        visualizer/
          core/
            VisualizerManager.ts
          effects/
            BaseShaderEffect.ts
            MetaballsEffect.ts
            ParticleNetworkEffect.ts
      remotion/
        RayboxComposition.tsx
```

# Files

## File: apps/web/src/lib/visualizer/effects/BaseShaderEffect.ts
```typescript
import * as THREE from 'three';
import { VisualEffect } from '@/types/visualizer';
import { debugLog } from '@/lib/utils';
import { MultiLayerCompositor } from '../core/MultiLayerCompositor';

/**
 * Abstract base class for shader-based visual effects.
 * Provides common functionality for full-screen post-processing effects.
 */
export abstract class BaseShaderEffect implements VisualEffect {
    abstract id: string;
    abstract name: string;
    abstract description: string;
    enabled: boolean = true;
    abstract parameters: Record<string, any>;

    protected scene: THREE.Scene;
    protected camera: THREE.OrthographicCamera;
    protected material!: THREE.ShaderMaterial;
    protected mesh!: THREE.Mesh;
    protected uniforms!: Record<string, THREE.IUniform>;
    protected renderer!: THREE.WebGLRenderer;
    protected compositor?: MultiLayerCompositor;
    protected layerId?: string;

    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = null; // Transparent for layer compositing
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    }

    /**
     * Set the compositor and layer ID to pull texture from layers beneath
     */
    public setCompositor(compositor: MultiLayerCompositor, layerId: string): void {
        this.compositor = compositor;
        this.layerId = layerId;
    }

    /**
     * Override this to define custom uniforms beyond the standard ones
     */
    protected abstract getCustomUniforms(): Record<string, THREE.IUniform>;

    /**
     * Override this to provide the fragment shader code
     */
    protected abstract getFragmentShader(): string;

    /**
     * Standard vertex shader (can be overridden if needed)
     */
    protected getVertexShader(): string {
        return `
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;
    }

    /**
     * Set up standard uniforms + custom uniforms
     */
    protected setupUniforms(): void {
        const size = this.renderer ? this.renderer.getSize(new THREE.Vector2()) : new THREE.Vector2(1024, 1024);

        // Standard uniforms available to all shader effects
        this.uniforms = {
            uTexture: { value: null },
            uTime: { value: 0.0 },
            uResolution: { value: new THREE.Vector2(size.x, size.y) },
            uMousePos: { value: new THREE.Vector2(0.5, 0.5) },
            ...this.getCustomUniforms()
        };
    }

    /**
     * Create shader material with error handling
     */
    protected createMaterial(): void {
        try {
            this.material = new THREE.ShaderMaterial({
                vertexShader: this.getVertexShader(),
                fragmentShader: this.getFragmentShader(),
                uniforms: this.uniforms,
                transparent: true,
                side: THREE.DoubleSide,
                depthWrite: false,
                depthTest: false
            });
        } catch (error) {
            debugLog.error(`❌ ${this.name} shader compilation error:`, error);
            // Fallback to basic material
            this.material = new THREE.MeshBasicMaterial({
                color: 0xff00ff,
                transparent: true,
                opacity: 0.5
            }) as any;
        }
    }

    /**
     * Create full-screen quad mesh
     */
    protected createMesh(): void {
        const geometry = new THREE.PlaneGeometry(2, 2);
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.position.set(0, 0, 0);
        this.mesh.scale.set(2, 2, 1);
        this.scene.add(this.mesh);
    }

    /**
     * Initialize the effect
     */
    init(renderer: THREE.WebGLRenderer): void {
        this.renderer = renderer;
        this.setupUniforms();
        this.createMaterial();
        this.createMesh();
        debugLog.log(`✅ ${this.name} initialized`);
    }

    /**
     * Update effect - syncs parameters to uniforms and updates source texture
     * @param deltaTime - Time delta in seconds (for live editor mode, increments uTime)
     */
    update(deltaTime: number): void {
        if (!this.enabled || !this.uniforms) return;

        // Update standard uniforms
        // In live editor mode, increment time for smooth animation
        this.uniforms.uTime.value += deltaTime;

        if (this.renderer) {
            const size = this.renderer.getSize(new THREE.Vector2());
            this.uniforms.uResolution.value.set(size.x, size.y);
        }

        // Get source texture from compositor (layers beneath)
        if (this.compositor && this.layerId) {
            const sourceTexture = this.compositor.getAccumulatedTextureBeforeLayer(this.layerId);
            if (sourceTexture && this.uniforms.uTexture.value !== sourceTexture) {
                this.uniforms.uTexture.value = sourceTexture;
            }
        }

        // Sync parameters to uniforms (to be implemented by subclasses)
        this.syncParametersToUniforms();
    }

    /**
     * Update effect with absolute time (for deterministic Remotion rendering)
     * This method sets uTime directly instead of incrementing it.
     * @param absoluteTime - Absolute time in seconds (frame / fps)
     */
    updateWithTime(absoluteTime: number): void {
        if (!this.enabled || !this.uniforms) return;

        // Set time directly for deterministic behavior
        // This ensures the same frame always produces the same visual output
        this.uniforms.uTime.value = absoluteTime;

        if (this.renderer) {
            const size = this.renderer.getSize(new THREE.Vector2());
            this.uniforms.uResolution.value.set(size.x, size.y);
        }

        // Get source texture from compositor (layers beneath)
        if (this.compositor && this.layerId) {
            const sourceTexture = this.compositor.getAccumulatedTextureBeforeLayer(this.layerId);
            if (sourceTexture && this.uniforms.uTexture.value !== sourceTexture) {
                this.uniforms.uTexture.value = sourceTexture;
            }
        }

        // Sync parameters to uniforms (to be implemented by subclasses)
        this.syncParametersToUniforms();
    }

    /**
     * Override this to sync custom parameters to uniforms
     */
    protected abstract syncParametersToUniforms(): void;

    /**
     * Update a single parameter - to be implemented by subclasses
     */
    abstract updateParameter(paramName: string, value: any): void;

    /**
     * Get the scene for rendering
     */
    getScene(): THREE.Scene {
        return this.scene;
    }

    /**
     * Get the camera for rendering
     */
    getCamera(): THREE.Camera {
        return this.camera;
    }

    /**
     * Handle window resize
     */
    resize(width: number, height: number): void {
        if (this.uniforms && this.uniforms.uResolution) {
            this.uniforms.uResolution.value.set(width, height);
        }
    }

    /**
     * Clean up resources
     */
    destroy(): void {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.material.dispose();
        }
    }
}
```

## File: apps/web/src/lib/visualizer/effects/ParticleNetworkEffect.ts
```typescript
import * as THREE from 'three';
import { VisualEffect } from '@/types/visualizer';
import { debugLog } from '@/lib/utils';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  note: number;
  noteVelocity: number;
  track: string;
  // Add audio feature data for audio-triggered particles
  audioFeature?: string;
  audioValue?: number;
  spawnType: 'midi' | 'audio';
}

export class ParticleNetworkEffect implements VisualEffect {
  id = 'particleNetwork';
  name = 'MIDI & Audio Particle Network';
  description = 'Glowing particle network that responds to MIDI notes and audio features';
  enabled = true;
  parameters = {
    maxParticles: 50,
    connectionDistance: 1.0,
    particleLifetime: 3.0,
    glowIntensity: 0.6,
    glowSoftness: 3.0,
    particleColor: [1.0, 1.0, 1.0],
    particleSize: 15.0,
    particleSpawning: 0.0, // Modulation destination for particle spawning (0-1)
    spawnThreshold: 0.5, // Threshold for when modulation signal spawns particles
    connectionOpacity: 0.8, // Opacity multiplier for connection lines
  };

  private internalScene!: THREE.Scene;
  private internalCamera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private particleSystem!: THREE.Points;
  private connectionLines!: THREE.LineSegments;
  private material!: THREE.ShaderMaterial;
  private uniforms!: Record<string, THREE.IUniform>;
  
  private particles: Particle[] = [];
  private geometry!: THREE.BufferGeometry;
  private positions!: Float32Array;
  private colors!: Float32Array;
  private sizes!: Float32Array;
  private lives!: Float32Array;
  
  // Connection data
  private connectionGeometry!: THREE.BufferGeometry;
  private connectionMaterial!: THREE.LineBasicMaterial;
  private connectionPositions!: Float32Array;
  private connectionColors!: Float32Array;
  private maxConnections: number = 500; // Limit connections
  private activeConnections: number = 0;
  
  // Performance optimization: skip frames
  private frameSkipCounter = 0;
  private frameSkipInterval = 2; // Update every 3rd frame for 30fps -> 10fps updates

  private instancedMesh!: THREE.InstancedMesh;
  private instanceColors!: Float32Array;
  private instanceLives!: Float32Array;
  private instanceSizes!: Float32Array;
  private dummyMatrix: THREE.Matrix4 = new THREE.Matrix4();

  // Audio spawning state
  private lastAudioSpawnTime: number = 0;
  private lastManualSpawnTime: number = 0;


  constructor() {
    this.setupUniforms();
  }

  

  private screenToWorld(screenX: number, screenY: number): THREE.Vector3 {
    // Convert screen px to NDC
    if (!this.renderer || !this.internalCamera) return new THREE.Vector3();
    const size = this.renderer.getSize(new THREE.Vector2());
    const ndcX = (screenX / size.x) * 2 - 1;
    const ndcY = -((screenY / size.y) * 2 - 1);
    // Project to world at z=0
    const vector = new THREE.Vector3(ndcX, ndcY, 0.0);
    vector.unproject(this.internalCamera);
    return vector;
  }


  private setupUniforms() {
    this.uniforms = {
      uTime: { value: 0.0 },
      uIntensity: { value: 1.0 },
      uGlowIntensity: { value: 1.0 }, // Reset to a reasonable default
      uGlowSoftness: { value: this.parameters.glowSoftness },
      uSizeMultiplier: { value: 1.0 } // Size control uniform
    };
  }

  init(renderer: THREE.WebGLRenderer): void {
    debugLog.log('🌟 ParticleNetworkEffect.init() called');
    this.renderer = renderer;
    // Create internal scene and a perspective camera for 3D effect
    this.internalScene = new THREE.Scene();
    this.internalScene.background = null; // Transparent background for layer compositing
    console.log('✨ ParticleNetworkEffect: Scene created, background =', this.internalScene.background);
    const size = this.renderer.getSize(new THREE.Vector2());
    const aspect = size.x / size.y || 1;
    this.internalCamera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.internalCamera.position.set(0, 0, 5);
    
    this.createParticleSystem();
    this.createConnectionSystem();
    
    // Initialize size multiplier based on current particleSize parameter
    if (this.uniforms) {
      this.uniforms.uSizeMultiplier.value = this.parameters.particleSize;
    }
    
    debugLog.log('🌟 Particle Network initialized');
  }
  
  private createParticleSystem() {
    // Plane that will always face the camera (we'll orient in updateBuffers)
    const quad = new THREE.PlaneGeometry(1, 1);

    // Custom shader material for billboard
    const vertexShader = `
      attribute vec3 instanceColor;
      attribute float instanceLife;
      attribute float instanceSize;
      varying vec3 vColor;
      varying float vLife;
      varying float vSize;
      varying vec2 vUv;
      
      void main() {
        vColor = instanceColor;
        vLife  = instanceLife;
        vSize  = instanceSize;
        vUv    = uv;
        
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;
      uniform float uGlowIntensity;
      uniform float uGlowSoftness; // softness control, not exponent
      varying vec3 vColor;
      varying float vLife;
      varying vec2 vUv;
      
      void main() {
        vec2 center = vUv - 0.5;
        float dist = length(center) * 2.0; // 0.0 center → 1.0 edge
        if (dist > 1.0) discard;

        // Solid core ensures visibility
        float core = 1.0 - smoothstep(0.0, 0.2, dist);

        // Smooth glow falloff using exp
        float glow = exp(-pow(dist, uGlowSoftness));
        
        float alpha = (core + glow * uGlowIntensity) * vLife;
        vec3 finalColor = vColor * (1.0 + glow * uGlowIntensity * 0.5 + core * 0.2);

        // Premultiplied alpha for additive blending
        gl_FragColor = vec4(finalColor * alpha, alpha);
      }
    `;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      premultipliedAlpha: true,
      vertexColors: true
    });

    const maxParticles = this.parameters.maxParticles;
    this.instancedMesh = new THREE.InstancedMesh(quad, this.material, maxParticles);

    // Per-instance dynamic attributes
    this.instanceColors = new Float32Array(maxParticles * 3);
    this.instanceLives  = new Float32Array(maxParticles);
    this.instanceSizes  = new Float32Array(maxParticles);

    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.geometry.setAttribute(
      'instanceColor',
      new THREE.InstancedBufferAttribute(this.instanceColors, 3, false)
    );
    this.instancedMesh.geometry.setAttribute(
      'instanceLife',
      new THREE.InstancedBufferAttribute(this.instanceLives, 1, false)
    );
    this.instancedMesh.geometry.setAttribute(
      'instanceSize',
      new THREE.InstancedBufferAttribute(this.instanceSizes, 1, false)
    );

    // Initialize with a few default particles to make the effect visible
    this.initializeDefaultParticles();

    this.internalScene.add(this.instancedMesh);
  }

  private initializeDefaultParticles() {
    // Add a few default particles to ensure the system renders
    for (let i = 0; i < 5; i++) {
      const particle = this.createParticle(60 + i, 64, 'default');
      this.particles.push(particle);
    }
    this.updateBuffers();
  }
  
  private getRandomSpawnPosition(): THREE.Vector3 {
    // Spawn across entire viewport in world coordinates
    const x = (Math.random() - 0.5) * 4; // -2 to +2 in world space
    const y = (Math.random() - 0.5) * 4; // -2 to +2 in world space
    const z = 0;
    return new THREE.Vector3(x, y, z);
  }
  
  private createParticle(note: number, velocity: number, track: string, spawnType: 'midi' | 'audio' = 'midi', audioFeature?: string, audioValue?: number): Particle {
    // Spawn inside current viewport bounds
    const position = this.getRandomSpawnPosition();
    
    // Give them a random direction to drift in
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.02
    );
    
    // Calculate size based on spawn type
    let size: number;
    if (spawnType === 'audio' && audioValue !== undefined) {
      // Audio particles: size based on audio value
      size = this.parameters.particleSize * (0.5 + audioValue * 1.5);
    } else {
      // MIDI particles: size based on velocity
      size = 3.0 + (velocity / 127) * 5.0;
    }
    
    return {
      position,
      velocity: vel,
      life: 1.0,
      maxLife: this.parameters.particleLifetime,
      size,
      note,
      noteVelocity: velocity,
      track,
      audioFeature,
      audioValue,
      spawnType
    };
  }
  
  private getNoteColor(note: number, velocity: number, spawnType: 'midi' | 'audio' = 'midi', audioValue?: number): THREE.Color {
    const baseColor = new THREE.Color(
      this.parameters.particleColor[0],
      this.parameters.particleColor[1], 
      this.parameters.particleColor[2]
    );
    
    if (spawnType === 'audio' && audioValue !== undefined) {
      // Audio particles: vary hue based on audio value
      const hue = (audioValue * 0.3) % 1.0;
      const audioColor = new THREE.Color().setHSL(hue, 0.7, 0.6);
      return audioColor.lerp(baseColor, 0.5);
    } else {
      // MIDI particles: note-based color
      const hue = (note % 12) / 12;
      const saturation = 0.4 + (velocity / 127) * 0.3;
      const lightness = 0.5 + (velocity / 127) * 0.2;
      
      const noteColor = new THREE.Color();
      noteColor.setHSL(hue, saturation, lightness);
      return noteColor.lerp(baseColor, 0.3);
    }
  }
  
  private updateParticles(deltaTime: number) {
    // Particle spawning is now controlled only by explicit parameter mappings
    // (via particleSpawning parameter and updateParameter())
    
    // Spawn particles based on particleSpawning parameter (manual or audio-modulated)
    if (this.parameters.particleSpawning >= this.parameters.spawnThreshold) {
      this.spawnManualParticles(deltaTime);
    }
    
    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update life
      particle.life -= deltaTime / particle.maxLife;
      
      // Remove dead particles
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      
      // Update physics
      particle.velocity.multiplyScalar(0.98); // Damping
      
      // Apply velocity
      particle.position.add(particle.velocity);
    }
    
    this.updateBuffers();
    this.updateConnections();
  }
  
  
  private spawnManualParticles(deltaTime: number) {
    const currentTime = performance.now() / 1000;
    
    // Check cooldown for manual spawning
    if (currentTime - this.lastManualSpawnTime < 0.1) { // 100ms cooldown for manual testing
      return;
    }
    
    // Calculate spawn probability based on how much particleSpawning exceeds threshold
    const excessAmount = this.parameters.particleSpawning - this.parameters.spawnThreshold;
    const spawnProbability = Math.min(excessAmount * 2.0, 0.5); // Max 50% chance per frame
    
    if (Math.random() < spawnProbability && this.particles.length < this.parameters.maxParticles) {
      // Create manual test particle
      const particle = this.createParticle(
        60, // Default note
        Math.floor(this.parameters.particleSpawning * 127), // Use slider value as velocity
        'manual',
        'audio', // Use audio spawn type for visual distinction
        'manual',
        this.parameters.particleSpawning
      );
      
      this.particles.push(particle);
      this.lastManualSpawnTime = currentTime;
    }
  }
  
  
  private updateBuffers() {
    const cameraQuat = this.internalCamera.quaternion;

    // Update per-instance data
    let index = 0;
    this.particles.forEach((particle) => {
      if (index >= this.parameters.maxParticles) return;
      // Compose matrix facing camera
      const baseFactor = 0.02; // world units per size unit
      // Clamp scale so full visible range reached at ~60% of slider (slider max ~50)
      const scaleMult = Math.min(this.parameters.particleSize, 30); // stop growing after 60%
      const scaleValue = particle.size * baseFactor * scaleMult;
      const scale = new THREE.Vector3(scaleValue, scaleValue, 1);
      this.dummyMatrix.compose(particle.position, cameraQuat, scale);
      this.instancedMesh.setMatrixAt(index, this.dummyMatrix);

      // Color
      const color = this.getNoteColor(particle.note, particle.noteVelocity, particle.spawnType, particle.audioValue);
      this.instanceColors[index * 3] = color.r;
      this.instanceColors[index * 3 + 1] = color.g;
      this.instanceColors[index * 3 + 2] = color.b;

      // Life & size
      this.instanceLives[index] = particle.life;
      this.instanceSizes[index] = particle.size;

      index++;
    });

    this.instancedMesh.count = index;
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    (this.instancedMesh.geometry.getAttribute('instanceColor') as THREE.InstancedBufferAttribute).needsUpdate = true;
    (this.instancedMesh.geometry.getAttribute('instanceLife') as THREE.InstancedBufferAttribute).needsUpdate = true;
    (this.instancedMesh.geometry.getAttribute('instanceSize') as THREE.InstancedBufferAttribute).needsUpdate = true;
  }
  
  private createConnectionSystem() {
    // Create connection line system using LineSegments for multiple disconnected lines
    this.connectionGeometry = new THREE.BufferGeometry();
    this.connectionPositions = new Float32Array(this.maxConnections * 6); // 2 points per line, 3 coords each
    this.connectionColors = new Float32Array(this.maxConnections * 6); // 2 colors per line, 3 channels each
    
    this.connectionGeometry.setAttribute('position', new THREE.BufferAttribute(this.connectionPositions, 3));
    this.connectionGeometry.setAttribute('color', new THREE.BufferAttribute(this.connectionColors, 3));
    
    this.connectionMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false
    });
    
    this.connectionLines = new THREE.LineSegments(this.connectionGeometry, this.connectionMaterial);
    this.internalScene.add(this.connectionLines);
  }

  private updateConnections() {
    let connectionIndex = 0;
    
    for (let i = 0; i < this.particles.length - 1 && connectionIndex < this.maxConnections; i++) {
      for (let j = i + 1; j < this.particles.length && connectionIndex < this.maxConnections; j++) {
        const p1 = this.particles[i];
        const p2 = this.particles[j];
        const distance = p1.position.distanceTo(p2.position);
        
        if (distance < this.parameters.connectionDistance) {
          // Improved strength calculation - less aggressive falloff
          const distanceFactor = 1.0 - (distance / this.parameters.connectionDistance);
          const lifeFactor = Math.min(p1.life, p2.life);
          // Normalize velocity contribution (0.5 to 1.0 range instead of multiplying)
          const velocityFactor = 0.5 + ((p1.noteVelocity + p2.noteVelocity) / 508);
          const strength = distanceFactor * lifeFactor * velocityFactor * this.parameters.connectionOpacity;
          
          // Use white for connection lines (user preference)
          // With additive blending, strength controls brightness
          const whiteColor = 1.0;
          
          // Set positions for this line segment (2 points)
          const baseIndex = connectionIndex * 6;
          this.connectionPositions[baseIndex] = p1.position.x;
          this.connectionPositions[baseIndex + 1] = p1.position.y;
          this.connectionPositions[baseIndex + 2] = p1.position.z;
          this.connectionPositions[baseIndex + 3] = p2.position.x;
          this.connectionPositions[baseIndex + 4] = p2.position.y;
          this.connectionPositions[baseIndex + 5] = p2.position.z;
          
          // Set white colors with strength for both vertices
          this.connectionColors[baseIndex] = whiteColor * strength;
          this.connectionColors[baseIndex + 1] = whiteColor * strength;
          this.connectionColors[baseIndex + 2] = whiteColor * strength;
          this.connectionColors[baseIndex + 3] = whiteColor * strength;
          this.connectionColors[baseIndex + 4] = whiteColor * strength;
          this.connectionColors[baseIndex + 5] = whiteColor * strength;
          
          connectionIndex++;
        }
      }
    }
    
    // Set the draw range to only render active connections
    this.connectionGeometry.setDrawRange(0, connectionIndex * 2); // 2 vertices per connection
    this.connectionGeometry.attributes.position.needsUpdate = true;
    this.connectionGeometry.attributes.color.needsUpdate = true;
    this.activeConnections = connectionIndex;
  }
  
  updateParameter(paramName: string, value: any): void {
    // Immediately update parameters for real-time control
    switch (paramName) {
      case 'maxParticles':
        // This affects the next particle creation cycle
        break;
      case 'connectionDistance':
        // This affects connection calculations in updateConnections
        break;
      case 'particleLifetime':
        // This affects particle creation
        break;
      case 'glowIntensity':
        if (this.uniforms) this.uniforms.uGlowIntensity.value = value;
        break;
      case 'glowSoftness':
        this.parameters.glowSoftness = value;
        if (this.uniforms) this.uniforms.uGlowSoftness.value = value;
        break;
      case 'particleColor':
        // This affects particle color generation
        break;
      case 'particleSize':
        this.parameters.particleSize = value;
        break;
      case 'particleSpawning':
        this.parameters.particleSpawning = value;
        break;
      case 'spawnThreshold':
        this.parameters.spawnThreshold = value;
        break;
      case 'connectionOpacity':
        this.parameters.connectionOpacity = value;
        break;
    }
  }

  update(deltaTime: number): void {
    if (!this.uniforms) {
      debugLog.warn('⚠️ Uniforms not initialized in ParticleNetworkEffect.update()');
      return;
    }

    // Generic: sync all parameters to uniforms
    for (const key in this.parameters) {
      const uniformKey = 'u' + key.charAt(0).toUpperCase() + key.slice(1);
      if (this.uniforms[uniformKey]) {
        this.uniforms[uniformKey].value = this.parameters[key as keyof typeof this.parameters];
      }
    }

    // Always update time and uniforms for smooth animation
    this.uniforms.uTime.value += deltaTime;
    // Intensity is now static - controlled only by explicit parameter mappings
    this.uniforms.uIntensity.value = 1.0;
    this.uniforms.uGlowIntensity.value = this.parameters.glowIntensity;
    
    // Ensure the instanced mesh is visible
    if (this.instancedMesh) {
      this.instancedMesh.visible = true;
    }
    
    // Skip heavy particle updates every few frames for performance
    this.frameSkipCounter++;
    if (this.frameSkipCounter >= this.frameSkipInterval) {
      this.frameSkipCounter = 0;
      this.updateParticles(deltaTime * this.frameSkipInterval);
    }
  }

  /**
   * Update with absolute time for deterministic Remotion rendering
   * @param absoluteTime - Absolute time in seconds (frame / fps)
   */
  updateWithTime(absoluteTime: number): void {
    if (!this.uniforms) {
      debugLog.warn('⚠️ Uniforms not initialized in ParticleNetworkEffect.updateWithTime()');
      return;
    }

    // Generic: sync all parameters to uniforms
    for (const key in this.parameters) {
      const uniformKey = 'u' + key.charAt(0).toUpperCase() + key.slice(1);
      if (this.uniforms[uniformKey]) {
        this.uniforms[uniformKey].value = this.parameters[key as keyof typeof this.parameters];
      }
    }

    // Set time directly for deterministic behavior
    this.uniforms.uTime.value = absoluteTime;
    // Intensity is now static - controlled only by explicit parameter mappings
    this.uniforms.uIntensity.value = 1.0;
    this.uniforms.uGlowIntensity.value = this.parameters.glowIntensity;
    
    // Ensure the instanced mesh is visible
    if (this.instancedMesh) {
      this.instancedMesh.visible = true;
    }
    
    // For deterministic rendering, update particles based on absolute time
    // Calculate approximate deltaTime for particle physics (use fixed 1/60 for consistency)
    const approximateDeltaTime = 1 / 60;
    this.frameSkipCounter++;
    if (this.frameSkipCounter >= this.frameSkipInterval) {
      this.frameSkipCounter = 0;
      this.updateParticles(approximateDeltaTime * this.frameSkipInterval);
    }
  }

  public getScene(): THREE.Scene {
    return this.internalScene;
  }

  public getCamera(): THREE.Camera {
    return this.internalCamera;
  }

  /**
   * Handle resize events to maintain correct aspect ratio
   */
  public resize(width: number, height: number): void {
    if (this.internalCamera) {
      this.internalCamera.aspect = width / height;
      this.internalCamera.updateProjectionMatrix();
      debugLog.log('🎨 ParticleNetworkEffect camera aspect updated:', this.internalCamera.aspect);
    }
  }

  destroy(): void {
    if (this.instancedMesh) {
      this.internalScene.remove(this.instancedMesh);
      this.instancedMesh.geometry.dispose();
      this.material.dispose();
    }
    
    if (this.connectionLines) {
      this.internalScene.remove(this.connectionLines);
      this.connectionGeometry.dispose();
      this.connectionMaterial.dispose();
    }
  }
}
```

## File: apps/web/src/lib/visualizer/effects/MetaballsEffect.ts
```typescript
import * as THREE from 'three';
import { VisualEffect, MetaballConfig } from '@/types/visualizer';
import { debugLog } from '@/lib/utils';


export class MetaballsEffect implements VisualEffect {
  id = 'metaballs';
  name = 'Metaballs';
  description = 'Fluid droplet-like spheres';
  enabled = true;
  parameters: MetaballConfig;

  private internalScene!: THREE.Scene;
  private internalCamera!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;
  private material!: THREE.ShaderMaterial;
  private mesh!: THREE.Mesh;
  private uniforms!: Record<string, THREE.IUniform>;

  // Camera animation state
  private baseCameraDistance = 3.0;
  private cameraHeight = 1.0;
  private cameraSmoothing = 5.0; // Higher = faster response (used with deltaTime)
  private smoothedCameraTarget = new THREE.Vector3(0, 0, 0);

  constructor(config: Partial<MetaballConfig> = {}) {
    this.parameters = {
      trailLength: 15,
      baseRadius: 0.25,
      smoothingFactor: 0.3,
      colorPalette: ['#CC66FF', '#33CCFF', '#FF9933'],
      animationSpeed: 0.8,
      noiseIntensity: 1.5,
      highlightColor: [0.8, 0.5, 1.0], // default purple
      ...config
    };
    
    this.setupUniforms();
  }


  private setupUniforms() {
    this.uniforms = {
      uTime: { value: 0.0 },
      uIntensity: { value: 1.0 },
      uResolution: { value: new THREE.Vector2(1024, 1024) },
      uCameraPos: { value: new THREE.Vector3(0.0, 0.0, 3.0) },
      uCameraTarget: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
      uBaseRadius: { value: this.parameters.baseRadius },
      uSmoothingFactor: { value: this.parameters.smoothingFactor },
      uNoiseIntensity: { value: this.parameters.noiseIntensity },
      uAnimationSpeed: { value: this.parameters.animationSpeed },
      uHighlightColor: { value: new THREE.Color(...this.parameters.highlightColor) },
    };
  }

  init(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
    // Create internal scene and camera for full-screen quad
    this.internalScene = new THREE.Scene();
    this.internalScene.background = null; // Transparent background for layer compositing
    console.log('🎨 MetaballsEffect: Scene created, background =', this.internalScene.background);
    this.internalCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    // Set resolution uniform based on renderer size
    const size = renderer.getSize(new THREE.Vector2());
    this.uniforms.uResolution.value.set(size.x, size.y);
    this.createMaterial();
    this.createMesh();
  }

  private createMaterial() {
    const vertexShader = `
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;

      uniform float uTime;
      uniform float uIntensity;
      uniform vec2 uResolution;
      uniform vec3 uCameraPos;
      uniform vec3 uCameraTarget;
      uniform float uBaseRadius;
      uniform float uSmoothingFactor;
      uniform float uNoiseIntensity;
      uniform float uAnimationSpeed;
      uniform vec3 uHighlightColor;
      varying vec2 vUv;

      const int MAX_STEPS = 32;
      const float MIN_DIST = 0.0;
      const float MAX_DIST = 50.0;
      const float EPSILON = 0.002;

      // Gooey neon palette
      vec3 neon1 = vec3(0.7, 0.2, 1.0); // purple
      vec3 neon2 = vec3(0.2, 0.7, 1.0); // blue
      vec3 neon3 = vec3(0.9, 0.3, 0.8); // pink

      // 3D noise for organic movement
      vec3 random3(vec3 c) {
        float j = 4096.0 * sin(dot(c, vec3(17.0, 59.4, 15.0)));
        vec3 r;
        r.z = fract(512.0 * j);
        j *= 0.125;
        r.x = fract(512.0 * j);
        j *= 0.125;
        r.y = fract(512.0 * j);
        return r - 0.5;
      }
      float noise(vec3 p) {
        vec3 pi = floor(p);
        vec3 pf = p - pi;
        vec3 u = pf * pf * (3.0 - 2.0 * pf);
        return mix(mix(mix(dot(random3(pi + vec3(0, 0, 0)), pf - vec3(0, 0, 0)),
                          dot(random3(pi + vec3(1, 0, 0)), pf - vec3(1, 0, 0)), u.x),
                      mix(dot(random3(pi + vec3(0, 1, 0)), pf - vec3(0, 1, 0)),
                          dot(random3(pi + vec3(1, 1, 0)), pf - vec3(1, 1, 0)), u.x), u.y),
                  mix(mix(dot(random3(pi + vec3(0, 0, 1)), pf - vec3(0, 0, 1)),
                          dot(random3(pi + vec3(1, 0, 1)), pf - vec3(1, 0, 1)), u.x),
                      mix(dot(random3(pi + vec3(0, 1, 1)), pf - vec3(0, 1, 1)),
                          dot(random3(pi + vec3(1, 1, 1)), pf - vec3(1, 1, 1)), u.x), u.y), u.z);
      }
      float smin(float a, float b, float k) {
        float h = max(k - abs(a - b), 0.0) / k;
        return min(a, b) - h * h * h * k * (1.0 / 6.0);
      }
      float sphere(vec3 p, float s) {
        return length(p) - s;
      }
      float map(vec3 pos) {
        float t = uTime * uAnimationSpeed * 0.5;
        float intensity = 0.5 + uIntensity * 0.5;
        float noiseAmt = uNoiseIntensity * 0.05;
        vec3 sphere1Pos = vec3(sin(t) * 0.8, cos(t * 1.3) * 0.6, sin(t * 0.7) * 0.4);
        vec3 sphere2Pos = vec3(cos(t * 1.1) * 0.6, sin(t * 0.9) * 0.8, cos(t * 1.4) * 0.5);
        vec3 sphere3Pos = vec3(sin(t * 1.7) * 0.4, cos(t * 0.6) * 0.3, sin(t * 1.2) * 0.6);
        vec3 sphere4Pos = vec3(cos(t * 0.8) * 0.7, sin(t * 1.5) * 0.4, cos(t) * 0.3);
        sphere1Pos += vec3(sin(t * 2.3), cos(t * 1.9), sin(t * 2.7)) * noiseAmt;
        sphere2Pos += vec3(cos(t * 1.7), sin(t * 2.1), cos(t * 1.3)) * noiseAmt;
        sphere3Pos += vec3(sin(t * 3.1), cos(t * 2.5), sin(t * 1.8)) * noiseAmt;
        sphere4Pos += vec3(cos(t * 2.9), sin(t * 1.6), cos(t * 2.2)) * noiseAmt;
        float radius1 = uBaseRadius * 1.2 + intensity * 0.2;
        float radius2 = uBaseRadius * 1.0 + intensity * 0.15;
        float radius3 = uBaseRadius * 0.8 + intensity * 0.1;
        float radius4 = uBaseRadius * 0.6 + intensity * 0.1;
        float d1 = sphere(pos - sphere1Pos, radius1);
        float d2 = sphere(pos - sphere2Pos, radius2);
        float d3 = sphere(pos - sphere3Pos, radius3);
        float d4 = sphere(pos - sphere4Pos, radius4);
        float smoothness = uSmoothingFactor;
        float result = smin(d1, d2, smoothness);
        result = smin(result, d3, smoothness);
        result = smin(result, d4, smoothness);
        return result;
      }
      vec3 calcNormal(vec3 pos) {
        vec2 e = vec2(EPSILON, 0.0);
        return normalize(vec3(
          map(pos + e.xyy) - map(pos - e.xyy),
          map(pos + e.yxy) - map(pos - e.yxy),
          map(pos + e.yyx) - map(pos - e.yyx)
        ));
      }
      float rayMarch(vec3 ro, vec3 rd) {
        float dO = MIN_DIST;
        for (int i = 0; i < MAX_STEPS; i++) {
          vec3 p = ro + rd * dO;
          float dS = map(p);
          dO += dS;
          if (dO > MAX_DIST || abs(dS) < EPSILON) break;
        }
        return dO;
      }
      vec3 getNeonColor(vec3 pos, float fresnel, float edge, float core) {
        float mix1 = 0.5 + 0.5 * sin(pos.x * 2.0 + uTime * 0.7);
        float mix2 = 0.5 + 0.5 * cos(pos.y * 2.0 + uTime * 1.1);
        vec3 color = mix(neon1, neon2, mix1);
        color = mix(color, neon3, mix2 * fresnel);
        color += vec3(1.0, 0.7, 1.0) * pow(edge, 2.5) * 1.2;
        color += uHighlightColor * pow(core, 2.0) * 0.7;
        return color;
      }

      // Thickness approximation for more liquid look
      float getThickness(vec3 pos, vec3 normal) {
        // Sample SDF in both directions to estimate thickness
        float stepSize = 0.08;
        float t1 = abs(map(pos + normal * stepSize));
        float t2 = abs(map(pos - normal * stepSize));
        return 1.0 - clamp((t1 + t2) * 2.5, 0.0, 1.0); // 0 = thin, 1 = thick
      }

      // 3D value noise with trilinear interpolation
      float hash(vec3 p) {
        p = fract(p * 0.3183099 + .1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      float valueNoise3D(vec3 p) {
        vec3 pi = floor(p);
        vec3 pf = fract(p);
        // 8 corners of the cube
        float a000 = hash(pi + vec3(0,0,0));
        float a100 = hash(pi + vec3(1,0,0));
        float a010 = hash(pi + vec3(0,1,0));
        float a110 = hash(pi + vec3(1,1,0));
        float a001 = hash(pi + vec3(0,0,1));
        float a101 = hash(pi + vec3(1,0,1));
        float a011 = hash(pi + vec3(0,1,1));
        float a111 = hash(pi + vec3(1,1,1));
        // Trilinear interpolation
        float k0 = a000;
        float k1 = a100 - a000;
        float k2 = a010 - a000;
        float k3 = a001 - a000;
        float k4 = a000 - a100 - a010 + a110;
        float k5 = a000 - a010 - a001 + a011;
        float k6 = a000 - a100 - a001 + a101;
        float k7 = -a000 + a100 + a010 - a110 + a001 - a101 - a011 + a111;
        vec3 u = pf;
        return k0 + k1 * u.x + k2 * u.y + k3 * u.z + k4 * u.x * u.y + k5 * u.y * u.z + k6 * u.z * u.x + k7 * u.x * u.y * u.z;
      }

      void main() {
        vec2 uv = (vUv - 0.5) * 2.0;
        
        // Apply aspect ratio correction to prevent stretching
        float aspectRatio = uResolution.x / uResolution.y;
        uv.x *= aspectRatio;
        
        vec3 cameraPos = uCameraPos;
        vec3 cameraTarget = uCameraTarget;
        vec3 cameraDir = normalize(cameraTarget - cameraPos);
        vec3 cameraRight = normalize(cross(cameraDir, vec3(0.0, 1.0, 0.0)));
        vec3 cameraUp = cross(cameraRight, cameraDir);
        vec3 rayDir = normalize(cameraDir + uv.x * cameraRight + uv.y * cameraUp);
        float dist = rayMarch(cameraPos, rayDir);
        if (dist >= MAX_DIST) {
          discard; // ensure no background writes
        }
        vec4 finalColor = vec4(0.0);
        {
          vec3 pos = cameraPos + rayDir * dist;
          vec3 normal = calcNormal(pos);
          float fresnel = pow(1.0 - max(0.0, dot(normal, -rayDir)), 2.5);
          float edge = smoothstep(0.0, 0.08, abs(map(pos)));
          float core = 1.0 - edge;
          float thickness = getThickness(pos, normal);
          // Water droplet color using value noise and reflection vector
          vec3 reflectDir = reflect(rayDir, normal);
          // Define unique offsets for each metaball
          vec3 offsets[4];
          offsets[0] = vec3(1.3, 2.1, 0.7);
          offsets[1] = vec3(-2.2, 0.5, 1.8);
          offsets[2] = vec3(0.9, -1.4, 2.3);
          offsets[3] = vec3(-1.7, 1.2, -2.5);
          vec3 colorSum = vec3(0.0);
          for (int i = 0; i < 4; i++) {
            vec3 metaballReflect = reflectDir + offsets[i];
            float noiseVal = valueNoise3D(metaballReflect * 2.0 + uTime * (1.0 + float(i) * 0.3));
            float modFactor = 0.8 + 0.2 * float(i); // unique per metaball
            colorSum += uHighlightColor * modFactor * noiseVal;
          }
          vec3 color = colorSum / 4.0;
          color = pow(color, vec3(7.0));
          // Add a subtle neon rim from before
          color = mix(color, getNeonColor(pos, fresnel, edge, core), 0.25 * fresnel);
          // Translucency and emission
          float alpha = 0.10 + 0.12 * thickness;
          alpha += 0.25 * fresnel;
          alpha += 0.10 * pow(core, 2.0);
          alpha = clamp(alpha, 0.0, 0.70);
          // Boost brightness significantly to simulate bloom effect
          color *= 3.5;
          // Add extra glow to mimic bloom
          color += vec3(0.15) * fresnel * fresnel;
          // Premultiplied alpha for correct additive blending over transparent background
          finalColor = vec4(color * alpha, alpha);
        }
        gl_FragColor = finalColor;
      }
    `;

    // Add shader compilation error checking
    try {
          this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      premultipliedAlpha: true
    });
    } catch (error) {
      debugLog.error('❌ Shader compilation error:', error);
      // Fallback to basic material
      this.material = new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        transparent: true,
        opacity: 0.8
      }) as any;
    }
  }

  private createMesh() {
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, this.material);
    // Let compositor handle layering; avoid depth artifacts across transparent areas
    this.material.depthWrite = false;
    this.material.depthTest = false;
    this.internalScene.add(this.mesh);
    this.mesh.position.set(0, 0, 0);
    this.mesh.scale.set(2, 2, 1); // Fill viewport
  }

  public getScene(): THREE.Scene {
    return this.internalScene;
  }

  public getCamera(): THREE.Camera {
    return this.internalCamera;
  }

  updateParameter(paramName: string, value: any): void {
    // Immediately update uniforms when parameters change
    if (!this.uniforms) return;
    
    // Update the parameter in the parameters object first (for auto-save)
    if (paramName in this.parameters) {
      (this.parameters as any)[paramName] = value;
    }
    
    switch (paramName) {
      case 'animationSpeed':
        this.uniforms.uAnimationSpeed.value = value;
        break;
      case 'baseRadius':
        this.uniforms.uBaseRadius.value = value;
        break;
      case 'smoothingFactor':
        this.uniforms.uSmoothingFactor.value = value;
        break;
      case 'noiseIntensity':
        this.uniforms.uNoiseIntensity.value = value;
        break;
      case 'highlightColor':
        // Ensure the uniform value is a THREE.Color object
        if (!(this.uniforms.uHighlightColor.value instanceof THREE.Color)) {
          this.uniforms.uHighlightColor.value = new THREE.Color(...value);
        } else {
          this.uniforms.uHighlightColor.value.set(...value);
        }
        break;
    }
  }

  update(deltaTime: number): void {
    if (!this.uniforms) return;

    // Generic: sync all parameters to uniforms (except special cases like highlightColor)
    for (const key in this.parameters) {
      const uniformKey = 'u' + key.charAt(0).toUpperCase() + key.slice(1);
      if (this.uniforms[uniformKey]) {
        // Skip highlightColor - it needs special handling as THREE.Color
        if (key === 'highlightColor') {
          const colorValue = this.parameters.highlightColor;
          if (Array.isArray(colorValue)) {
            // Ensure uniform value is a THREE.Color object
            if (!(this.uniforms.uHighlightColor.value instanceof THREE.Color)) {
              this.uniforms.uHighlightColor.value = new THREE.Color(...colorValue);
            } else {
              this.uniforms.uHighlightColor.value.set(...colorValue);
            }
          }
        } else {
          this.uniforms[uniformKey].value = this.parameters[key as keyof MetaballConfig];
        }
      }
    }

    // Update time (increment for live editor mode)
    this.uniforms.uTime.value += deltaTime * this.parameters.animationSpeed;

    // Intensity is now static - controlled only by explicit parameter mappings
    // Default to 1.0 if no intensity parameter exists (maintains visibility)
    this.uniforms.uIntensity.value = 1.0;

    // Animate camera based on time only (no implicit audio/MIDI reactivity)
    this.updateCameraAnimation(deltaTime);

    // Update shader resolution to match actual canvas size (not bounding box)
    if (this.uniforms.uResolution && this.renderer) {
      const size = this.renderer.getSize(new THREE.Vector2());
      this.uniforms.uResolution.value.set(size.x, size.y);
    }

    // No conditional visibility logic here
  }

  /**
   * Update with absolute time for deterministic Remotion rendering
   * @param absoluteTime - Absolute time in seconds (frame / fps)
   */
  updateWithTime(absoluteTime: number): void {
    if (!this.uniforms) return;

    // Generic: sync all parameters to uniforms (except special cases like highlightColor)
    for (const key in this.parameters) {
      const uniformKey = 'u' + key.charAt(0).toUpperCase() + key.slice(1);
      if (this.uniforms[uniformKey]) {
        // Skip highlightColor - it needs special handling as THREE.Color
        if (key === 'highlightColor') {
          const colorValue = this.parameters.highlightColor;
          if (Array.isArray(colorValue)) {
            // Ensure uniform value is a THREE.Color object
            if (!(this.uniforms.uHighlightColor.value instanceof THREE.Color)) {
              this.uniforms.uHighlightColor.value = new THREE.Color(...colorValue);
            } else {
              this.uniforms.uHighlightColor.value.set(...colorValue);
            }
          }
        } else {
          this.uniforms[uniformKey].value = this.parameters[key as keyof MetaballConfig];
        }
      }
    }

    // Set time directly for deterministic behavior
    // Note: animationSpeed is typically applied in the shader, but if it's applied here,
    // we need to account for it. For now, set raw time and let shader handle animationSpeed.
    this.uniforms.uTime.value = absoluteTime;

    // Intensity is now static - controlled only by explicit parameter mappings
    // Default to 1.0 if no intensity parameter exists (maintains visibility)
    this.uniforms.uIntensity.value = 1.0;

    // Animate camera based on time only (no implicit audio/MIDI reactivity)
    // For deterministic rendering, use a fixed deltaTime approximation
    // The camera animation should be based on absolute time, not deltaTime
    this.updateCameraAnimation(1 / 60); // Approximate deltaTime for camera smoothing

    // Update shader resolution to match actual canvas size (not bounding box)
    if (this.uniforms.uResolution && this.renderer) {
      const size = this.renderer.getSize(new THREE.Vector2());
      this.uniforms.uResolution.value.set(size.x, size.y);
    }
  }

  private updateCameraAnimation(deltaTime: number): void {
    const time = this.uniforms.uTime.value;
    
    // Frame-rate independent smoothing factor
    const cameraSmoothingFactor = 1 - Math.exp(-this.cameraSmoothing * deltaTime);
    
    // Pure time-based camera orbit animation (no implicit audio/MIDI reactivity)
    const cameraAngle = time * 0.3;
    const cameraElevation = Math.sin(time * 0.2) * 0.3;
    const cameraDistance = this.baseCameraDistance;

    // Calculate target camera position
    const targetCameraPos = new THREE.Vector3(
      Math.cos(cameraAngle) * cameraDistance,
      cameraElevation + this.cameraHeight,
      Math.sin(cameraAngle) * cameraDistance
    );

    // Frame-rate independent camera position smoothing
    const currentPos = this.uniforms.uCameraPos.value;
    currentPos.lerp(targetCameraPos, cameraSmoothingFactor);

    // Camera target remains centered (no implicit movement)
    const targetLookAt = new THREE.Vector3(0, 0, 0);

    // Smooth the camera target
    this.smoothedCameraTarget.lerp(targetLookAt, cameraSmoothingFactor);
    this.uniforms.uCameraTarget.value.copy(this.smoothedCameraTarget);
  }

  destroy(): void {
    if (this.mesh) {
      this.internalScene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.material.dispose();
    }
  }
}
```

## File: apps/web/src/lib/visualizer/core/VisualizerManager.ts
```typescript
import * as THREE from 'three';
import { getRemotionEnvironment } from 'remotion';
import { VisualEffect, VisualizerConfig, LiveMIDIData, AudioAnalysisData, VisualizerControls } from '@/types/visualizer';
import { MultiLayerCompositor } from './MultiLayerCompositor';
import { VisualizationPreset } from '@/types/stem-visualization';
import { debugLog } from '@/lib/utils';
import { AudioTextureManager, AudioFeatureData } from './AudioTextureManager';
import { MediaLayerManager } from './MediaLayerManager';

export class VisualizerManager {
  private static instanceCounter = 0;
  private instanceId: number;
  
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;
  private animationId: number | null = null;
  private clock: THREE.Clock;
  
  private effects: Map<string, VisualEffect> = new Map();
  private isPlaying = false;
  private lastTime = 0;
  
  // FIX: Add state to hold timeline data
  private timelineLayers: any[] = [];
  private timelineCurrentTime: number = 0;
  
  // Deterministic rendering state
  private currentFrame: number = 0;
  private currentFPS: number = 60;
  private deterministicTime: number = 0;
  
  // Audio analysis
  private audioContext: AudioContext | null = null;
  private audioSources: AudioBufferSourceNode[] = [];
  private currentAudioBuffer: AudioBuffer | null = null;
  
  // Layered compositor
  private multiLayerCompositor!: MultiLayerCompositor;
  
  // Background color layer
  private backgroundMaterial!: THREE.MeshBasicMaterial;
  private backgroundMesh!: THREE.Mesh;
  
  // GPU compositing system
  private audioTextureManager: AudioTextureManager | null = null;
  private mediaLayerManager: MediaLayerManager | null = null;
  
  // Performance monitoring
  private frameCount = 0;
  private debugFrameCount = 0; // Separate counter for debug logging
  private fps = 60;
  private lastFPSUpdate = 0;
  private consecutiveSlowFrames = 0;
  private maxSlowFrames = 10; // Emergency pause after 10 consecutive slow frames
  
  // Visualization parameters
  private visualParams = {
    globalScale: 1.0,
    rotationSpeed: 0.0,
    colorIntensity: 1.0,
    emissionIntensity: 1.0,
    positionOffset: 0.0,
    heightScale: 1.0,
    hueRotation: 0.0,
    brightness: 1.0,
    complexity: 0.5,
    particleSize: 1.0,
    opacity: 1.0,
    animationSpeed: 1.0,
    particleCount: 5000
  };
  
  constructor(canvas: HTMLCanvasElement, config: VisualizerConfig) {
    debugLog.log('🎭 VisualizerManager constructor called');
    this.instanceId = ++VisualizerManager.instanceCounter;
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    
    this.initScene(config);
    this.setupEventListeners();
    this.initCompositor(config);
    this.initAudioTextureManager();
    this.initMediaLayerManager();
    debugLog.log('🎭 VisualizerManager constructor complete');
  }
  
  private initScene(config: VisualizerConfig) {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = null; // Transparent background for proper layer compositing
    this.scene.fog = new THREE.Fog(0x000000, 10, 50);
    
      // Camera setup - use aspect ratio from config if available, otherwise use 1:1
  const initialAspectRatio = config.aspectRatio 
    ? config.aspectRatio.width / config.aspectRatio.height 
    : 1; // Default to square aspect ratio
  
  this.camera = new THREE.PerspectiveCamera(
    75,
    initialAspectRatio,
    0.1,
    1000
  );
    this.camera.position.set(0, 0, 5);
    
    // Renderer setup with error handling and fallbacks
    // Detect if we are currently rendering a video or still
    const isRendering = getRemotionEnvironment().isRendering;
    
    try {
      // First, check if canvas already has a context to avoid conflicts
      const existingContext = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
      if (existingContext) {
        debugLog.log('🔄 Found existing WebGL context, will attempt to reuse');
      }
      
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: !isRendering, // Disable AA during software render for speed
        alpha: true,
        // CRITICAL: Only true during Remotion rendering
        preserveDrawingBuffer: isRendering,
        powerPreference: isRendering ? 'high-performance' : 'default',
        failIfMajorPerformanceCaveat: false // Allow software rendering
      });
      
      // Verify WebGL context was created successfully
      const gl = this.renderer.getContext();
      if (!gl) {
        throw new Error('Failed to create WebGL context. WebGL may not be supported in this environment.');
      }
      
      // Log context version for debugging
      const isWebGL2 = gl instanceof WebGL2RenderingContext;
      debugLog.log('✅ WebGL Renderer created successfully');
      debugLog.log('🔧 WebGL Context:', isWebGL2 ? 'WebGL 2' : 'WebGL 1');
      debugLog.log('🎬 Remotion rendering mode:', isRendering);
    } catch (error) {
      debugLog.error('❌ Primary WebGL renderer failed:', error);
      
      // Try minimal fallback settings
      try {
        debugLog.log('🔄 Attempting fallback renderer with minimal settings...');
        this.renderer = new THREE.WebGLRenderer({
          canvas: this.canvas,
          antialias: !isRendering,
          alpha: true,
          preserveDrawingBuffer: isRendering,
          powerPreference: isRendering ? 'high-performance' : 'low-power',
          failIfMajorPerformanceCaveat: false
        });
        
        // Verify fallback context was created
        const fallbackGl = this.renderer.getContext();
        if (!fallbackGl) {
          throw new Error('Fallback renderer failed to create WebGL context');
        }
        
        const isWebGL2 = fallbackGl instanceof WebGL2RenderingContext;
        debugLog.log('✅ Fallback renderer created successfully');
        debugLog.log('🔧 Fallback WebGL Context:', isWebGL2 ? 'WebGL 2' : 'WebGL 1');
      } catch (fallbackError) {
        debugLog.error('❌ Fallback renderer also failed:', fallbackError);
        const errorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        throw new Error(`WebGL initialization failed: ${errorMessage}. This may indicate a headless rendering environment issue. Check remotion.config.ts for GL backend settings.`);
      }
    }
    
    this.renderer.setSize(config.canvas.width, config.canvas.height);
    // Fix: Handle headless/server environments where window.devicePixelRatio doesn't exist
    const devicePixelRatio = typeof window !== 'undefined' && window.devicePixelRatio 
      ? window.devicePixelRatio 
      : 1;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, config.canvas.pixelRatio || 1));
    // Fix: Use opaque background for Remotion rendering
    // Transparent backgrounds can appear black in video output if not composited properly
    // Use a dark background that will show content properly
    this.renderer.setClearColor(0x000000, 1); // Opaque black background for video rendering
    
    const clearColor = this.renderer.getClearColor(new THREE.Color());
    const clearAlpha = this.renderer.getClearAlpha();
    debugLog.log('🎮 VisualizerManager: Renderer clear color =', clearColor.getHex().toString(16), 'alpha =', clearAlpha);
    debugLog.log('🎮 Renderer configured with size:', config.canvas.width, 'x', config.canvas.height);
    
    // Performance optimizations for 30fps
    this.renderer.setAnimationLoop(null); // Use manual RAF control
    this.renderer.info.autoReset = false; // Manual reset for performance monitoring
    
    // Enable tone mapping for better color reproduction
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    // Disable shadows for better performance
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  private initCompositor(config: VisualizerConfig) {
    this.multiLayerCompositor = new MultiLayerCompositor(this.renderer, {
      width: config.canvas.width,
      height: config.canvas.height,
      enableAntialiasing: true,
      pixelRatio: Math.min(window.devicePixelRatio, config.canvas.pixelRatio || 2)
    });
    
    // --- START: BACKGROUND COLOR LAYER IMPLEMENTATION ---
    // Create a dedicated scene for the background color
    const backgroundScene = new THREE.Scene();
    const backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    // Create a material we can control. Start with black.
    this.backgroundMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    // Create a full-screen quad
    this.backgroundMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.backgroundMaterial);
    backgroundScene.add(this.backgroundMesh);
    
    // Add it to the compositor with a very low zIndex (-100) so it renders first
    this.multiLayerCompositor.createLayer('backgroundColor', backgroundScene, backgroundCamera, {
      zIndex: -100,
      enabled: true
    });
    // --- END: BACKGROUND COLOR LAYER IMPLEMENTATION ---
    
    // Add base scene as background layer (change zIndex to be above the color layer)
    this.multiLayerCompositor.createLayer('base', this.scene, this.camera, { zIndex: -1, enabled: true });
  }

  private initAudioTextureManager() {
    this.audioTextureManager = new AudioTextureManager();
    debugLog.log('🎵 AudioTextureManager initialized');
  }

  private initMediaLayerManager() {
    this.mediaLayerManager = new MediaLayerManager(this.scene, this.camera, this.renderer);
    debugLog.log('🎬 MediaLayerManager initialized');
  }
  
  private async initAudioAnalyzer() {
    if (!this.audioContext) {
      debugLog.log('🎵 Creating AudioContext after user interaction...');
      this.audioContext = new AudioContext();
      // Resume the context to ensure it's active
      await this.audioContext.resume();
    }
    
    try {
      // This method is no longer used as AudioAnalyzer is removed.
      // Keeping it for now to avoid breaking existing calls, but it will be removed.
      debugLog.log('🎵 Audio analyzer initialization (placeholder)');
    } catch (error) {
      debugLog.error('❌ Failed to initialize audio analyzer:', error);
    }
  }
  
  private setupEventListeners() {
    // Handle window resize
    const handleResize = () => {
      const width = this.canvas.clientWidth;
      const height = this.canvas.clientHeight;
      
      // Use the new responsive resize method
      this.handleViewportResize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Handle visibility change (pause when not visible)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isPlaying) {
        this.pause();
      }
    });
    
    // Handle WebGL context lost/restored
    this.canvas.addEventListener('webglcontextlost', (event) => {
      debugLog.warn('⚠️ WebGL context lost!');
      event.preventDefault();
      this.pause(); // Stop rendering
    });
    
    this.canvas.addEventListener('webglcontextrestored', () => {
      debugLog.log('✅ WebGL context restored, reinitializing...');
      // Context restoration would require reinitializing all GPU resources
      // For now, we'll just log and suggest a page refresh
      debugLog.log('🔄 Please refresh the page to restore full functionality');
    });
  }
  
  // Effect management
  public addEffect(layerId: string, effect: VisualEffect) {
    debugLog.log(`➕ [VisualizerManager] Adding effect: ${layerId}, type: ${effect.constructor.name}`);
    try {
      debugLog.log(`🎨 Adding effect: ${effect.name} (for layer ${layerId})`);
      effect.init(this.renderer);
      
      // If this is an ASCII filter effect, set the compositor reference
      // Check by class name or if setCompositor method exists
      if ('setCompositor' in effect && typeof (effect as any).setCompositor === 'function') {
        debugLog.log(`🔗 [VisualizerManager] Setting compositor for effect: ${effect.name} (${effect.id})`);
        (effect as any).setCompositor(this.multiLayerCompositor, layerId);
      }
      
      this.effects.set(layerId, effect);
      // Register a layer for this effect using the unique layerId
      this.multiLayerCompositor.createLayer(layerId, effect.getScene(), effect.getCamera(), {
        zIndex: this.effects.size,
        enabled: effect.enabled
      });
      
      debugLog.log(`✅ Added effect: ${effect.name}. Total effects: ${this.effects.size}`);
    } catch (error) {
      debugLog.error(`❌ Failed to add effect ${effect.name}:`, error);
    }
  }
  
  public addEffectWithId(effect: VisualEffect, customId: string) {
    try {
      debugLog.log(`🎨 Adding effect with custom ID: ${effect.name} (${customId})`);
      // Don't call init again - effect is already initialized by addEffect()
      // Just add the reference with the custom ID
      this.effects.set(customId, effect);
      
      debugLog.log(`✅ Added effect reference with custom ID: ${effect.name} (${customId}). Total effects: ${this.effects.size}`);
    } catch (error) {
      debugLog.error(`❌ Failed to add effect ${effect.name} with custom ID ${customId}:`, error);
    }
  }
  
  public removeEffect(effectId: string) {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.destroy();
      this.effects.delete(effectId);
      this.multiLayerCompositor.removeLayer(effectId);
      debugLog.log(`✅ Removed effect and compositor layer: ${effect.name}. Remaining effects: ${this.effects.size}`);
    }
  }
  
  getEffect(effectId: string): VisualEffect | undefined {
    return this.effects.get(effectId);
  }
  
  getAllEffects(): VisualEffect[] {
    return Array.from(this.effects.values());
  }

  // Get all layer IDs that have a specific effect type
  getLayerIdsByEffectType(effectType: string): string[] {
    const layerIds: string[] = [];
    this.effects.forEach((effect, layerId) => {
      if (effect.id === effectType) {
        layerIds.push(layerId);
      }
    });
    return layerIds;
  }

  // Get the first effect instance of a specific type (for parameter inspection)
  getEffectByType(effectType: string): VisualEffect | undefined {
    for (const [_, effect] of this.effects) {
      if (effect.id === effectType) {
        return effect;
      }
    }
    return undefined;
  }
  
  enableEffect(effectId: string): void {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.enabled = true;
      this.multiLayerCompositor.updateLayer(effectId, { enabled: true });
      debugLog.log(`✅ Enabled effect: ${effect.name} (${effectId})`);
    } else {
      debugLog.warn(`⚠️ Effect not found: ${effectId}`);
    }
  }
  
  disableEffect(effectId: string): void {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.enabled = false;
      this.multiLayerCompositor.updateLayer(effectId, { enabled: false });
      debugLog.log(`❌ Disabled effect: ${effect.name} (${effectId})`);
    }
  }
  
  // Legacy show/hide helpers removed; layers are toggled via compositor
  
  // Playback control
  play(): void {
    debugLog.log(`🎬 Play() called. Current state: isPlaying=${this.isPlaying}, effects=${this.effects.size}`);
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.clock.start();
      this.animate();
      debugLog.log(`🎬 Animation started`);
      
      // Start audio playback
      this.audioSources.forEach((source, index) => {
        try {
          source.start(0);
          debugLog.log(`🎵 Started audio source ${index}`);
        } catch (error) {
          debugLog.warn(`⚠️ Audio source ${index} already playing or ended`);
        }
      });
    }
  }
  
  pause(): void {
    this.isPlaying = false;
    this.clock.stop();
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Stop audio playback
    this.audioSources.forEach((source, index) => {
      try {
        source.stop();
        debugLog.log(`🎵 Stopped audio source ${index}`);
      } catch (error) {
        debugLog.warn(`⚠️ Audio source ${index} already stopped`);
      }
    });
  }
  
  stop(): void {
    this.pause();
    this.clock.elapsedTime = 0;
  }
  
  /**
   * Frame-based update method for Remotion compatibility.
   * This is the "Single Source of Truth" for time and seeds.
   * Calculates deterministic time from frame number and FPS.
   * @param frame - Current frame number from Remotion
   * @param fps - Frames per second from Remotion
   */
  public update(frame: number, fps: number): void {
    this.currentFrame = frame;
    this.currentFPS = fps;
    
    // Calculate deterministic time: frame / fps
    // This ensures the same frame always produces the same time, regardless of environment
    const timeInSeconds = frame / fps;
    this.deterministicTime = timeInSeconds;
    
    // Update timeline current time to match
    this.timelineCurrentTime = timeInSeconds;
    
    // 1. Sync all shaders to the EXACT frame-time
    this.effects.forEach((effect, layerId) => {
      // Set uTime directly (not incrementing) for deterministic behavior
      // Check if effect has uniforms property (BaseShaderEffect and custom effects)
      if ('uniforms' in effect && effect.uniforms && (effect as any).uniforms.uTime) {
        (effect as any).uniforms.uTime.value = timeInSeconds;
      }
      
      // Use the frame number as a seed for any CPU-side randomness
      if ('setSeed' in effect && typeof (effect as any).setSeed === 'function') {
        (effect as any).setSeed(frame);
      }
      
      // Update effect with deterministic time
      // Pass absolute time instead of deltaTime for deterministic updates
      if (typeof (effect as any).updateWithTime === 'function') {
        (effect as any).updateWithTime(timeInSeconds);
      } else {
        // Fallback: use deltaTime of 1/fps for effects that haven't been updated yet
        effect.update(1 / fps);
      }
    });
    
    // 2. Handle stateful/ping-pong effects that need warm-up
    if (getRemotionEnvironment().isRendering && frame > 0) {
      // For effects that depend on previous frames (like water ripples simulation),
      // we may need to warm up the simulation by running previous frames
      // This is only needed for effects that maintain state between frames
      // Most shader effects are stateless and don't need this
    }
  }

  /**
   * Frame-based rendering method for Remotion compatibility.
   * This method can be called explicitly with a specific time and deltaTime,
   * decoupling rendering from the browser clock.
   * @param time - Current time in milliseconds (replaces performance.now())
   * @param deltaTime - Time delta in seconds (replaces clock.getDelta())
   * @deprecated Use update(frame, fps) for deterministic rendering. This method is kept for backward compatibility.
   */
  public renderFrame(time: number, deltaTime: number): void {
    // Note: timelineCurrentTime is managed by updateTimelineState() called from
    // ThreeVisualizer.tsx (Live Mode) and RayboxComposition.tsx (Remotion).
    // We should NOT override it here with system time, as that causes layers to
    // disappear when the page has been open longer than the layer's duration.

    // In live editor mode, use the provided time/deltaTime
    // In Remotion mode, use the deterministic time from update()
    const isRendering = getRemotionEnvironment().isRendering;
    const effectiveTime = isRendering ? this.deterministicTime : time / 1000;
    
    // Update all enabled effects
    let activeEffectCount = 0;
    
    // Debug: Log effect and timeline state
    if (this.effects.size === 0) {
      debugLog.warn('⚠️ [VisualizerManager] No effects registered. Effects count:', this.effects.size);
    }
    
    if (this.timelineLayers.length === 0) {
      debugLog.warn('⚠️ [VisualizerManager] No timeline layers. Timeline layers count:', this.timelineLayers.length);
    }
    
    this.effects.forEach((effect, layerId) => {
      // Find the corresponding layer from the timeline state using the correct key
      const effectLayer = this.timelineLayers.find(l => l.id === layerId);

      // Determine if the layer should be active.
      const isLayerActive = effect.enabled && effectLayer 
        ? (this.timelineCurrentTime >= effectLayer.startTime && this.timelineCurrentTime <= effectLayer.endTime)
        : false;

      // Debug logging for first few frames
      if (this.debugFrameCount < 5 && effectLayer) {
        debugLog.log(`🎬 [Frame ${this.debugFrameCount}] Layer ${layerId}:`, {
          enabled: effect.enabled,
          currentTime: this.timelineCurrentTime,
          startTime: effectLayer.startTime,
          endTime: effectLayer.endTime,
          isActive: isLayerActive
        });
      }

      // Update the compositor's render state for this layer
      this.multiLayerCompositor.updateLayer(layerId, { enabled: isLayerActive });

      // Run the effect's update logic if it's active
      if (isLayerActive) {
          activeEffectCount++;
          
          try {
            // In Remotion mode, use deterministic time
            // In live editor mode, use deltaTime for smooth animation
            if (isRendering && this.deterministicTime !== undefined) {
              // Set uTime directly for deterministic behavior
              // Check if effect has uniforms property
              if ('uniforms' in effect && effect.uniforms && (effect as any).uniforms.uTime) {
                (effect as any).uniforms.uTime.value = this.deterministicTime;
              }
              // Use updateWithTime if available, otherwise fallback to update
              if (typeof (effect as any).updateWithTime === 'function') {
                (effect as any).updateWithTime(this.deterministicTime);
              } else {
                effect.update(deltaTime);
              }
            } else {
              // Live editor: use deltaTime for smooth animation
              effect.update(deltaTime);
            }
          } catch (error) {
            debugLog.error(`❌ Effect ${layerId} update failed:`, error);
          }
      }
    });
    
    if (this.debugFrameCount < 5) {
      debugLog.log(`🎬 [Frame ${this.debugFrameCount}] Active effects: ${activeEffectCount}, Total effects: ${this.effects.size}, Timeline time: ${this.timelineCurrentTime.toFixed(3)}s`);
    }
    
    this.debugFrameCount++;
    
    // Update GPU audio texture system
    if (this.audioTextureManager && this.currentAudioData) {
      // Convert audio analysis to GPU texture format using existing structure
      const audioFeatureData: AudioFeatureData = {
        features: {
          'main': [this.currentAudioData.volume, this.currentAudioData.bass, this.currentAudioData.mid, this.currentAudioData.treble]
        },
        duration: 0, // Will be set when real audio is loaded
        sampleRate: 44100,
        stemTypes: ['main']
      };
      
      // Update audio texture with timeline position (not system time)
      // This ensures audio sampling matches the track position, not page uptime
      this.audioTextureManager.updateTime(this.timelineCurrentTime, 0); // Note: duration is 0 here, fine for now or pass actual duration if available
    }
    
    // Update media layer textures (for video elements)
    if (this.mediaLayerManager) {
      this.mediaLayerManager.updateTextures();
    }
    
    // Render all layers via compositor
    this.multiLayerCompositor.render();
  }

  private animate = () => {
    if (!this.isPlaying) return;
    
    this.animationId = requestAnimationFrame(this.animate);
    
    // IMPLEMENT 30FPS CAP - Much more reasonable for audio-visual sync
    const now = performance.now();
    const elapsed = now - this.lastTime;
    const targetFrameTime = 1000 / 30; // 33.33ms for 30fps
    
    if (elapsed < targetFrameTime) {
      return; // Skip this frame to maintain 30fps cap
    }
    
    // Only skip frames if we're severely behind (emergency performance protection)
    const frameTime = elapsed;
    if (frameTime > 100) { // If frame takes more than 100ms (10fps), skip next frame
      this.consecutiveSlowFrames++;
      
      // Emergency pause if too many consecutive slow frames
      if (this.consecutiveSlowFrames >= this.maxSlowFrames) {
        debugLog.error(`🚨 Emergency pause: ${this.maxSlowFrames} consecutive slow frames detected. Pausing to prevent browser freeze.`);
        this.pause();
        // Suggest recovery action
        setTimeout(() => {
          debugLog.log('💡 Tip: Try refreshing the page or closing other browser tabs to improve performance.');
        }, 1000);
        return;
      }
      
      this.lastTime = now;
      return;
    } else {
      this.consecutiveSlowFrames = 0; // Reset counter on good frame
    }
    
    const deltaTime = Math.min(this.clock.getDelta(), 0.1); // Cap delta time to prevent large jumps
    const currentTime = now;
    
    // Update FPS counter
    this.frameCount++;
    if (currentTime - this.lastFPSUpdate > 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFPSUpdate));
      this.frameCount = 0;
      this.lastFPSUpdate = currentTime;
    }
    
    // Performance monitoring - check memory usage
    if (this.frameCount % 300 === 0) { // Every 10 seconds at 30fps
      const memInfo = this.getMemoryUsage();
      if (memInfo.geometries > 100 || memInfo.textures > 50) {
        debugLog.warn(`⚠️ High memory usage detected: ${memInfo.geometries} geometries, ${memInfo.textures} textures`);
      }
    }
    
    // Call renderFrame with calculated time and deltaTime
    this.renderFrame(currentTime, deltaTime);
    
    this.lastTime = currentTime;
  };
  
  /**
   * FIX: Public method to synchronize the visualizer with the timeline's state.
   * This should be called from a useEffect hook in the UI.
   */
  public updateTimelineState(layers: any[], currentTime: number): void {
    this.timelineLayers = layers;
    this.timelineCurrentTime = currentTime;

    // Sync layer z-indices from timeline to compositor
    if (this.multiLayerCompositor) {
      layers.forEach(layer => {
        if (typeof layer.zIndex === 'number') {
          // The compositor handles re-sorting internally when zIndex is updated
          this.multiLayerCompositor.updateLayer(layer.id, { zIndex: layer.zIndex });
        }
      });
    }
  }
  
  // Update methods for real data
  updateMIDIData(midiData: LiveMIDIData): void {
    // Store MIDI data to be used in next animation frame
    this.currentMidiData = midiData;
    debugLog.log('🎵 MIDI data received:', midiData);
  }

  updateAudioData(audioData: AudioAnalysisData): void {
    // Store audio data to be used in next animation frame
    this.currentAudioData = audioData;
    debugLog.log('🎵 Audio data received:', audioData);
  }

  /**
   * Public method to manually set audio data (for Remotion frame-based rendering)
   * @param data - AudioAnalysisData to set
   */
  public setAudioData(data: AudioAnalysisData): void {
    this.currentAudioData = data;
  }
  
  
  updateEffectParameter(effectId: string, paramName: string, value: any): void {
    // Try to get effect by layer ID first
    let effect = this.effects.get(effectId);
    
    // Debug logging for metaballs specifically
    const isMetaballs = effectId === 'layer-1765752490965';
    
    // If not found, assume effectId is an effect type (like 'metaballs')
    // and update ALL instances of that effect type
    if (!effect) {
      const layerIds = this.getLayerIdsByEffectType(effectId);
      if (layerIds.length > 0) {
        // Update all instances of this effect type
        layerIds.forEach(layerId => {
          const effectInstance = this.effects.get(layerId);
          if (effectInstance && effectInstance.parameters.hasOwnProperty(paramName)) {
            const oldValue = (effectInstance.parameters as any)[paramName];
            (effectInstance.parameters as any)[paramName] = value;
            if (isMetaballs) {
              debugLog.log('🔧 [VisualizerManager] Updated effect parameter (by type):', {
                effectId,
                layerId,
                paramName,
                oldValue,
                newValue: value,
                hasUpdateMethod: typeof (effectInstance as any).updateParameter === 'function',
              });
            }
            if (typeof (effectInstance as any).updateParameter === 'function') {
              (effectInstance as any).updateParameter(paramName, value);
            }
          } else if (isMetaballs) {
            debugLog.warn('🔧 [VisualizerManager] Parameter not found (by type):', {
              effectId,
              layerId,
              paramName,
              availableParams: effectInstance ? Object.keys(effectInstance.parameters) : [],
            });
          }
        });
        return;
      }
      if (isMetaballs) {
        debugLog.warn(`🔧 [VisualizerManager] Effect ${effectId} not found (neither as layer ID nor effect type)`);
      }
      debugLog.warn(`⚠️ Effect ${effectId} not found (neither as layer ID nor effect type)`);
      return;
    }
    
    // Handle direct layer ID lookup
    if (effect.parameters.hasOwnProperty(paramName)) {
      const oldValue = (effect.parameters as any)[paramName];
      (effect.parameters as any)[paramName] = value;
      
      if (isMetaballs) {
        debugLog.log('🔧 [VisualizerManager] Updated effect parameter (direct):', {
          effectId,
          paramName,
          oldValue,
          newValue: value,
          hasUpdateMethod: typeof (effect as any).updateParameter === 'function',
          currentParams: Object.keys(effect.parameters),
        });
      }
      
      // If the effect has an updateParameter method, call it for immediate updates
      if (typeof (effect as any).updateParameter === 'function') {
        (effect as any).updateParameter(paramName, value);
        if (isMetaballs) {
          debugLog.log('🔧 [VisualizerManager] Called updateParameter method');
        }
      }
    } else {
      if (isMetaballs) {
        debugLog.warn('🔧 [VisualizerManager] Parameter not found (direct):', {
          effectId,
          paramName,
          availableParams: Object.keys(effect.parameters),
        });
      }
      debugLog.warn(`⚠️ Parameter ${paramName} not found in effect ${effectId}`);
    }
  }
  
  private currentMidiData?: LiveMIDIData;
  private currentAudioData?: AudioAnalysisData;
  
  // Performance monitoring
  getFPS(): number {
    return this.fps;
  }
  
  getMemoryUsage(): { geometries: number; textures: number; programs: number } {
    return {
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      programs: this.renderer.info.programs?.length || 0
    };
  }
  
  // Cleanup
  dispose(): void {
    debugLog.log(`🗑️ VisualizerManager.dispose() called. Effects: ${this.effects.size}`);
    this.stop();
    
    // Dispose compositor
    if (this.multiLayerCompositor) {
      this.multiLayerCompositor.dispose();
    }
    
    // Dispose all effects
    debugLog.log(`🗑️ Disposing ${this.effects.size} effects`);
    this.effects.forEach(effect => effect.destroy());
    this.effects.clear();
    debugLog.log(`🗑️ Effects cleared. Remaining: ${this.effects.size}`);
    
    // Dispose Three.js resources
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (object.material instanceof Array) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    
    this.renderer.dispose();
  }

  public async loadAudioBuffer(buffer: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }
    try {
      // Log buffer info for debugging
      debugLog.log('Audio buffer length:', buffer.byteLength);
      debugLog.log('First 16 bytes:', Array.from(new Uint8Array(buffer.slice(0, 16))));
      this.currentAudioBuffer = await this.audioContext.decodeAudioData(buffer);
      // Create audio source for playback
      const audioSource = this.audioContext.createBufferSource();
      audioSource.buffer = this.currentAudioBuffer;
      audioSource.connect(this.audioContext.destination);
      // Store the source for control
      if (!this.audioSources) {
        this.audioSources = [];
      }
      this.audioSources.push(audioSource);
      // Remove any call to audioAnalyzer/analyzeStem
    } catch (error) {
      debugLog.error('❌ Failed to load audio buffer:', error);
      throw error;
    }
  }

  // Parameter setters
  public setGlobalScale(value: number) {
    this.visualParams.globalScale = value;
    this.effects.forEach(effect => {
      if ('setScale' in effect) {
        (effect as any).setScale(value);
      }
    });
  }

  public setRotationSpeed(value: number) {
    this.visualParams.rotationSpeed = value;
    this.effects.forEach(effect => {
      if ('setRotationSpeed' in effect) {
        (effect as any).setRotationSpeed(value);
      }
    });
  }

  public setColorIntensity(value: number) {
    this.visualParams.colorIntensity = value;
    this.effects.forEach(effect => {
      if ('setColorIntensity' in effect) {
        (effect as any).setColorIntensity(value);
      }
    });
  }

  public setEmissionIntensity(value: number) {
    this.visualParams.emissionIntensity = value;
    this.effects.forEach(effect => {
      if ('setEmissionIntensity' in effect) {
        (effect as any).setEmissionIntensity(value);
      }
    });
  }

  public setPositionOffset(value: number) {
    this.visualParams.positionOffset = value;
    this.effects.forEach(effect => {
      if ('setPositionOffset' in effect) {
        (effect as any).setPositionOffset(value);
      }
    });
  }

  public setHeightScale(value: number) {
    this.visualParams.heightScale = value;
    this.effects.forEach(effect => {
      if ('setHeightScale' in effect) {
        (effect as any).setHeightScale(value);
      }
    });
  }

  public setHueRotation(value: number) {
    this.visualParams.hueRotation = value;
    this.effects.forEach(effect => {
      if ('setHueRotation' in effect) {
        (effect as any).setHueRotation(value);
      }
    });
  }

  public setBrightness(value: number) {
    this.visualParams.brightness = value;
    this.effects.forEach(effect => {
      if ('setBrightness' in effect) {
        (effect as any).setBrightness(value);
      }
    });
  }

  public setComplexity(value: number) {
    this.visualParams.complexity = value;
    this.effects.forEach(effect => {
      if ('setComplexity' in effect) {
        (effect as any).setComplexity(value);
      }
    });
  }

  public setParticleSize(value: number) {
    this.visualParams.particleSize = value;
    this.effects.forEach(effect => {
      if ('setParticleSize' in effect) {
        (effect as any).setParticleSize(value);
      }
    });
  }

  public setOpacity(value: number) {
    this.visualParams.opacity = value;
    this.effects.forEach(effect => {
      if ('setOpacity' in effect) {
        (effect as any).setOpacity(value);
      }
    });
  }

  public setAnimationSpeed(value: number) {
    this.visualParams.animationSpeed = value;
    this.effects.forEach(effect => {
      if ('setAnimationSpeed' in effect) {
        (effect as any).setAnimationSpeed(value);
      }
    });
  }

  public setParticleCount(value: number) {
    this.visualParams.particleCount = value;
    this.effects.forEach(effect => {
      if ('setParticleCount' in effect) {
        (effect as any).setParticleCount(value);
      }
    });
  }

  public updateSettings(settings: Record<string, number>) {
    Object.entries(settings).forEach(([key, value]) => {
      switch (key) {
        case 'globalIntensity':
          this.setColorIntensity(value);
          this.setEmissionIntensity(value);
          break;
        case 'smoothingFactor':
          // Apply to all effects that support smoothing
          this.effects.forEach(effect => {
            if ('setSmoothingFactor' in effect) {
              (effect as any).setSmoothingFactor(value);
            }
          });
          break;
        case 'responsiveness':
          // Apply to all effects that support responsiveness
          this.effects.forEach(effect => {
            if ('setResponsiveness' in effect) {
              (effect as any).setResponsiveness(value);
            }
          });
          break;
      }
    });
  }

  // Method to handle responsive resizing (no letterboxing, always fill canvas)
  public handleViewportResize(canvasWidth: number, canvasHeight: number) {
    this.renderer.setSize(canvasWidth, canvasHeight);
    this.camera.aspect = canvasWidth / canvasHeight;
    this.camera.updateProjectionMatrix();
    
    // Update resolution uniforms and resize handlers for all effects
    this.effects.forEach(effect => {
      // Update resolution uniforms
      if ('uniforms' in effect && (effect as any).uniforms?.uResolution) {
        (effect as any).uniforms.uResolution.value.set(canvasWidth, canvasHeight);
      }
      
      // Call resize method if effect has one (for updating internal cameras)
      if ('resize' in effect && typeof (effect as any).resize === 'function') {
        (effect as any).resize(canvasWidth, canvasHeight);
      }
    });
    
    // Resize compositor targets
    if (this.multiLayerCompositor) {
      this.multiLayerCompositor.resize(canvasWidth, canvasHeight);
    }
    debugLog.log('🎨 Responsive resize:', canvasWidth, canvasHeight, 'aspect:', this.camera.aspect);
  }

  // 2D Composition Layer for future video/image integration
  public createCompositionLayer() {
    // Create an orthographic camera for 2D composition
    const aspectRatio = this.camera.aspect;
    const frustumSize = 2;
    const orthographicCamera = new THREE.OrthographicCamera(
      frustumSize * aspectRatio / -2,
      frustumSize * aspectRatio / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      1000
    );
    orthographicCamera.position.set(0, 0, 1);
    orthographicCamera.lookAt(0, 0, 0);

    // Create a composition scene for 2D elements
    const compositionScene = new THREE.Scene();
    
    return {
      scene: compositionScene,
      camera: orthographicCamera,
      addVideoLayer: (video: HTMLVideoElement, position: {x: number, y: number}, scale: {x: number, y: number}) => {
        const texture = new THREE.VideoTexture(video);
        const plane = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const mesh = new THREE.Mesh(plane, material);
        
        // Position in 2D space (orthographic camera)
        mesh.position.set(position.x, position.y, 0);
        mesh.scale.set(scale.x, scale.y, 1);
        
        compositionScene.add(mesh);
        return mesh;
      },
      addImageLayer: (image: HTMLImageElement, position: {x: number, y: number}, scale: {x: number, y: number}) => {
        // [CHANGE 4] Enable CORS for textures
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous'); 
        
        const texture = loader.load(image.src, undefined, undefined, (err) => {
            console.error("Error loading texture:", image.src, err);
        });
        const plane = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true }); // Ensure transparent is true
        const mesh = new THREE.Mesh(plane, material);
        
        // Position in 2D space (orthographic camera)
        mesh.position.set(position.x, position.y, 0);
        mesh.scale.set(scale.x, scale.y, 1);
        
        compositionScene.add(mesh);
        return mesh;
      }
    };
  }

  // GPU Compositing System Access Methods
  
  public getAudioTextureManager(): AudioTextureManager | null {
    return this.audioTextureManager;
  }

  public getMediaLayerManager(): MediaLayerManager | null {
    return this.mediaLayerManager;
  }

  // GPU compositing always on via MultiLayerCompositor

  public loadAudioAnalysisForGPU(analysisData: AudioFeatureData): void {
    if (this.audioTextureManager) {
      this.audioTextureManager.loadAudioAnalysis(analysisData);
      debugLog.log('🎵 Audio analysis loaded into GPU textures');
    }
  }

  // Background Color Control Methods
  
  /**
   * Set the background color of the visualizer
   * @param color - THREE.js compatible color (hex, string, or Color object)
   */
  public setBackgroundColor(color: THREE.ColorRepresentation): void {
    if (this.backgroundMaterial) {
      this.backgroundMaterial.color.set(color);
      debugLog.log('🎨 Background color set to:', color);
    }
  }

  /**
   * Control the visibility of the background color layer
   * @param visible - true to show background, false for full transparency
   */
  public setBackgroundVisibility(visible: boolean): void {
    if (this.backgroundMesh) {
      this.backgroundMesh.visible = visible;
      debugLog.log('🎨 Background visibility set to:', visible);
    }
  }
}
```

## File: apps/web/src/remotion/RayboxComposition.tsx
```typescript
import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  Audio,
  delayRender,
  continueRender,
} from 'remotion';
import { VisualizerManager } from '@/lib/visualizer/core/VisualizerManager';
import { EffectRegistry } from '@/lib/visualizer/effects/EffectRegistry';
// Import EffectDefinitions to ensure effects are registered
import '@/lib/visualizer/effects/EffectDefinitions';
import type { RayboxCompositionProps } from './Root';
import type { AudioAnalysisData as SimpleAudioAnalysisData } from '@/types/visualizer';
import type { AudioAnalysisData as CachedAudioAnalysisData } from '@/types/audio-analysis-data';
import { parseParamKey } from '@/lib/visualizer/paramKeys';
import { debugLog } from '@/lib/utils';

const VALID_STEMS = new Set(['master', 'drums', 'bass', 'vocals', 'other']);

/**
 * Helper function to extract audio feature values at a specific time from cached analysis data.
 * Adapted from use-audio-analysis.ts getFeatureValue logic.
 */
function getFeatureValueFromCached(
  cachedAnalysis: CachedAudioAnalysisData[],
  fileId: string,
  feature: string,
  time: number,
  stemType?: string,
): number {
  let parsedStem = stemType ?? 'master';
  let featureName = feature;

  if (feature.includes('-')) {
    const parts = feature.split('-');
    const potentialStem = parts[0];

    if (VALID_STEMS.has(potentialStem.toLowerCase())) {
      parsedStem = potentialStem;
      featureName = parts.slice(1).join('-');
    }
  }

  let analysis = cachedAnalysis.find(
    (a) => a.fileMetadataId === fileId && a.stemType === parsedStem,
  );

  if (!analysis) {
    analysis = cachedAnalysis.find((a) => a.stemType === parsedStem);
  }

  if (!analysis?.analysisData) return 0;
  const { analysisData } = analysis;

  const getTimeSeriesValue = (arr: any) => {
    if (!arr || arr.length === 0) return 0;
    const times = analysisData.frameTimes as number[];
    if (!times || times.length === 0) return 0;

    let lo = 0,
      hi = times.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1;
      if (times[mid] <= time) lo = mid;
      else hi = mid - 1;
    }
    return arr[lo] ?? 0;
  };

  const normalizedFeature = featureName.toLowerCase().replace(/-/g, '');

  switch (normalizedFeature) {
    case 'rms':
      return getTimeSeriesValue(analysisData.rms);
    case 'volume':
      return getTimeSeriesValue(analysisData.rms ?? analysisData.volume);
    case 'loudness':
      return getTimeSeriesValue(analysisData.loudness);
    case 'spectralcentroid':
      return getTimeSeriesValue(analysisData.spectralCentroid);
    case 'spectralrolloff':
      return getTimeSeriesValue(analysisData.spectralRolloff);
    case 'spectralflux':
      return getTimeSeriesValue((analysisData as any).spectralFlux);
    case 'bass':
      return getTimeSeriesValue(analysisData.bass);
    case 'mid':
      return getTimeSeriesValue(analysisData.mid);
    case 'treble':
      return getTimeSeriesValue(analysisData.treble);
    default:
      return 0;
  }
}

/**
 * Convert cached audio analysis data to simple AudioAnalysisData format at a specific time.
 * Exported so Remotion-specific overlay renderer can reuse audio sampling logic.
 */
export function extractAudioDataAtTime(
  cachedAnalysis: CachedAudioAnalysisData[] | undefined,
  fileId: string | undefined,
  time: number,
  stemType?: string
): SimpleAudioAnalysisData | null {
  if (!cachedAnalysis || !fileId || cachedAnalysis.length === 0) {
    return null;
  }

  // Extract feature values at the current time
  const volume = getFeatureValueFromCached(cachedAnalysis, fileId, 'volume', time, stemType);
  const bass = getFeatureValueFromCached(cachedAnalysis, fileId, 'bass', time, stemType);
  const mid = getFeatureValueFromCached(cachedAnalysis, fileId, 'mid', time, stemType);
  const treble = getFeatureValueFromCached(cachedAnalysis, fileId, 'treble', time, stemType);
  const spectralCentroid = getFeatureValueFromCached(cachedAnalysis, fileId, 'spectral-centroid', time, stemType);

  // Get frequencies and timeData from the analysis
  let analysis = cachedAnalysis.find(
    a => a.fileMetadataId === fileId && a.stemType === (stemType ?? 'master')
  );

  // FALLBACK: If strict ID match fails, try matching by stemType only
  if (!analysis) {
    analysis = cachedAnalysis.find(a => a.stemType === (stemType ?? 'master'));
  }

  if (!analysis) {
    return null;
  }

  // Extract frequency data (FFT) at the current time
  const fft = analysis.analysisData.fft;
  const frameTimes = analysis.analysisData.frameTimes;
  let frequencies: number[] = [];
  let timeData: number[] = [];

  if (fft && frameTimes && Array.isArray(fft) && Array.isArray(frameTimes) && frameTimes.length > 0) {
    // Find the frame index closest to the current time
    let frameIndex = 0;
    for (let i = 0; i < frameTimes.length; i++) {
      if (frameTimes[i] <= time) {
        frameIndex = i;
      } else {
        break;
      }
    }

    // [CHANGE 2] Dynamically calculate bin size instead of hardcoding 256
    // This prevents index out of bounds or misalignment if analysis uses 512/1024 bins
    const binsPerFrame = Math.floor(fft.length / frameTimes.length);

    if (binsPerFrame > 0) {
      const startIdx = frameIndex * binsPerFrame;
      const endIdx = Math.min(startIdx + binsPerFrame, fft.length);

      if (startIdx < fft.length) {
        frequencies = Array.from(fft.slice(startIdx, endIdx));
        // Map FFT to Time Data approximation if TimeData is missing (common in compressed payloads)
        timeData = frequencies.map((_, i) => fft[startIdx + i] || 0);
      }
    }
  }

  return {
    frequencies: frequencies.length > 0 ? frequencies : new Array(256).fill(0),
    timeData: timeData.length > 0 ? timeData : new Array(256).fill(0),
    volume,
    bass,
    mid,
    treble,
  };
}

export const RayboxComposition: React.FC<RayboxCompositionProps> = ({
  layers,
  audioAnalysisData,
  visualizationSettings,
  masterAudioUrl,
  mappings,
  baseParameterValues,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerManagerRef = useRef<VisualizerManager | null>(null);
  const effectInstancesRef = useRef<Map<string, any>>(new Map());
  const [handle] = useState(() => delayRender('Initializing Visualizer'));
  const isInitializedRef = useRef(false);

  const actualLayers = layers || [];
  const actualAudioAnalysisData = audioAnalysisData || [];

  // 1. Initialize Visualizer (useLayoutEffect) - runs once on mount
  useLayoutEffect(() => {
    if (!canvasRef.current || isInitializedRef.current) return;
    
    let isNewManager = false;

    if (!visualizerManagerRef.current) {
      try {
        visualizerManagerRef.current = new VisualizerManager(canvasRef.current, {
          canvas: { width, height, pixelRatio: 1 },
          performance: { targetFPS: fps, enableShadows: false },
          midi: { velocitySensitivity: 1.0, noteTrailDuration: 2.0, trackColorMapping: {} },
        });
        isNewManager = true;
        // If a new manager is created, any cached effect refs are stale.
        effectInstancesRef.current.clear();
      } catch (e) {
        console.error('Failed to initialize VisualizerManager:', e);
        // Log error but continue - let the render attempt to proceed
        // The canvas will just be black if WebGL fails, but won't crash the render
        continueRender(handle);
        return;
      }
    }

    const manager = visualizerManagerRef.current;
    if (manager) {
      // Ensure renderer matches latest dimensions to avoid aspect ratio glitches.
      manager.handleViewportResize(width, height);

      if (visualizationSettings) {
        manager.updateSettings(visualizationSettings as unknown as Record<string, number>);
      }

      const effectLayers = actualLayers.filter((l) => l.type === 'effect' && l.effectType);
      for (const layer of effectLayers) {
        const hasRef = effectInstancesRef.current.has(layer.id);
        const managerHasEffect =
          typeof manager.getEffect === 'function' ? !!manager.getEffect(layer.id) : false;

        if (!hasRef || !managerHasEffect || isNewManager) {
          const baseValues = baseParameterValues?.[layer.id] || {};
          const mergedSettings = { ...layer.settings, ...baseValues };
          const effectType = layer.effectType as string;
          const effect = EffectRegistry.createEffect(effectType, mergedSettings);
          if (effect) {
            effectInstancesRef.current.set(layer.id, effect);
            manager.addEffect(layer.id, effect);
          }
        }
      }
    }

    // Wait for assets to load before continuing
    const waitForAssets = async () => {
      try {
        const asyncEffects = Array.from(effectInstancesRef.current.values()).filter(
          (effect) => typeof (effect as any).waitForImages === 'function',
        );

        if (asyncEffects.length > 0) {
          // 10s timeout safety to prevent hanging forever on bad URLs
          await Promise.race([
            Promise.all(asyncEffects.map((effect) => (effect as any).waitForImages())),
            new Promise((r) => setTimeout(r, 10000)),
          ]);
        }
      } catch (e) {
        console.warn('⚠️ Asset waiting warning:', e);
      } finally {
        isInitializedRef.current = true;
        continueRender(handle);
      }
    };

    waitForAssets();
  }, [width, height, fps, actualLayers]); // Include actualLayers to update effects on change

  // 2. Render Loop (useLayoutEffect) - runs on every frame
  useLayoutEffect(() => {
    if (!visualizerManagerRef.current || !isInitializedRef.current) return;
    
    const time = frame / fps;
    const deltaTime = 1 / fps;
    const shouldLogMapping = frame < 3 || frame % Math.max(1, Math.round(fps)) === 0;
    const mappingLogEntries: Array<{
      paramKey: string;
      layerId: string;
      paramName: string;
      baseValue: number;
      rawValue: number;
      knob: number;
      delta: number;
      finalValue: number;
    }> = [];

    const fileId = actualAudioAnalysisData.find((a) => a.stemType === 'master')?.fileMetadataId;
    const audioData = extractAudioDataAtTime(
      actualAudioAnalysisData as unknown as CachedAudioAnalysisData[],
      fileId || 'unknown',
      time,
      'master',
    );

    if (mappings && Object.keys(mappings).length > 0) {
      const getSliderMax = (p: string) =>
        ['opacity', 'scale', 'baseRadius'].includes(p) ? 1.0 : 100;

      Object.entries(mappings).forEach(([paramKey, mapping]) => {
        if (!mapping?.featureId) return;
        const parsed = parseParamKey(paramKey);
        if (!parsed) return;
        const { effectInstanceId: layerId, paramName } = parsed;

        let baseValue = baseParameterValues?.[layerId]?.[paramName];
        if (baseValue === undefined)
          baseValue = actualLayers.find((l) => l.id === layerId)?.settings?.[paramName];
        if (baseValue === undefined)
          baseValue = effectInstancesRef.current.get(layerId)?.parameters?.[paramName];
        if (baseValue === undefined) baseValue = 0;

        const rawValue = getFeatureValueFromCached(
          actualAudioAnalysisData as unknown as CachedAudioAnalysisData[],
          'ignored-file-id',
          mapping.featureId,
          time,
        );

        const maxValue = getSliderMax(paramName);
        const knob = Math.max(-0.5, Math.min(0.5, (mapping.modulationAmount ?? 0.5) * 2 - 1));
        const delta = rawValue * knob * maxValue;
        const finalValue = Math.max(0, Math.min(maxValue, baseValue + delta));

        if (!Number.isNaN(finalValue)) {
          visualizerManagerRef.current?.updateEffectParameter(layerId, paramName, finalValue);
          if (shouldLogMapping) {
            mappingLogEntries.push({
              paramKey,
              layerId,
              paramName,
              baseValue,
              rawValue,
              knob,
              delta,
              finalValue,
            });
          }
        }
      });
    }

    if (shouldLogMapping && mappingLogEntries.length > 0) {
      debugLog.log('🎚️ Audio mapping frame snapshot', {
        frame,
        time: Number(time.toFixed(3)),
        entries: mappingLogEntries,
      });
    }

    visualizerManagerRef.current.updateTimelineState(actualLayers, time);
    if (audioData) visualizerManagerRef.current.setAudioData(audioData);
    
    // Use the new deterministic update method
    // This ensures frame 100 looks identical whether rendered on laptop, AWS Lambda in Virginia, or Oregon
    visualizerManagerRef.current.update(frame, fps);
    
    // Render the frame - ensure this completes before proceeding
    // Note: renderFrame is still called for the actual rendering, but update() handles time deterministically
    visualizerManagerRef.current.renderFrame(time * 1000, deltaTime);
    
    // CRITICAL: Force WebGL context to flush and finish commands to ensure canvas is ready for capture
    // This ensures Remotion can properly read the canvas content before taking the screenshot
    if (canvasRef.current) {
      const gl = canvasRef.current.getContext('webgl2') || canvasRef.current.getContext('webgl');
      if (gl) {
        gl.flush(); // Flush all pending commands to the GPU
        gl.finish(); // Force all WebGL commands to complete before returning
      }
    }
  }, [frame, fps, actualLayers, actualAudioAnalysisData, mappings, baseParameterValues, visualizationSettings]);

  return (
    <div style={{ width, height, position: 'relative' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ width: '100%', height: '100%' }} />
      {masterAudioUrl && <Audio src={masterAudioUrl} />}
    </div>
  );
};
```
