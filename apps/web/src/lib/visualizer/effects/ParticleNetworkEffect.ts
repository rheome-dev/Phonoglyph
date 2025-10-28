import * as THREE from 'three';
import { VisualEffect, AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';
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
    connectionDistance: 2.5,
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
  private currentAudioData: AudioAnalysisData | null = null;


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
  
  private updateParticles(deltaTime: number, midiData: LiveMIDIData, audioData?: AudioAnalysisData) {
    // Add new particles for active MIDI notes
    midiData.activeNotes.forEach(noteData => {
      if (this.particles.length < this.parameters.maxParticles) {
        // Check if we already have a recent particle for this note
        const hasRecentParticle = this.particles.some(p => 
          p.note === noteData.note && p.life > 0.8 && p.spawnType === 'midi'
        );
        
        if (!hasRecentParticle) {
          const particle = this.createParticle(noteData.note, noteData.velocity, noteData.track, 'midi');
          this.particles.push(particle);
        }
      }
    });
    
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

  update(deltaTime: number, audioData: AudioAnalysisData, midiData: LiveMIDIData): void {
    if (!this.uniforms) {
      debugLog.warn('⚠️ Uniforms not initialized in ParticleNetworkEffect.update()');
      return;
    }

    // Store current audio data for particle spawning
    this.currentAudioData = audioData;

    // Generic: sync all parameters to uniforms
    for (const key in this.parameters) {
      const uniformKey = 'u' + key.charAt(0).toUpperCase() + key.slice(1);
      if (this.uniforms[uniformKey]) {
        this.uniforms[uniformKey].value = this.parameters[key as keyof typeof this.parameters];
      }
    }

    // Always update time and uniforms for smooth animation
    this.uniforms.uTime.value += deltaTime;
    this.uniforms.uIntensity.value = Math.max(0.5, Math.min(midiData.activeNotes.length / 3.0, 2.0));
    this.uniforms.uGlowIntensity.value = this.parameters.glowIntensity;
    
    // Ensure the instanced mesh is visible
    if (this.instancedMesh) {
      this.instancedMesh.visible = true;
    }
    
    // Skip heavy particle updates every few frames for performance
    this.frameSkipCounter++;
    if (this.frameSkipCounter >= this.frameSkipInterval) {
      this.frameSkipCounter = 0;
      this.updateParticles(deltaTime * this.frameSkipInterval, midiData, audioData);
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