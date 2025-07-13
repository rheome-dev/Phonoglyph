import * as THREE from 'three';
import { VisualEffect, AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';

export class MidiHudEffect implements VisualEffect {
  id = 'midiHud';
  name = 'MIDI HUD Overlay';
  description = 'Real-time MIDI data visualizations around canvas edges';
  enabled = true;
  parameters = {
    showNoteHistory: true,
    showVelocityBars: true,
    showTrackActivity: true,
    showSpectrogram: true,
    glowIntensity: 0.1, // Drastically reduced
    animationSpeed: 1.0
  };

  private scene!: THREE.Scene;
  private camera!: THREE.Camera;
  private renderer!: THREE.WebGLRenderer;
  private hudGroup!: THREE.Group;
  private material!: THREE.ShaderMaterial;
  private uniforms!: Record<string, THREE.IUniform>;
  
  // HUD elements
  private noteHistoryMesh!: THREE.Mesh;
  private velocityBarsMesh!: THREE.Mesh;
  private trackActivityMesh!: THREE.Mesh;
  private spectrogramMesh!: THREE.Mesh;
  
  // Data tracking
  private noteHistory: Array<{note: number, velocity: number, time: number, track: string}> = [];
  private maxHistoryLength = 50;
  
  constructor() {
    this.setupUniforms();
  }
  
  private setupUniforms() {
    this.uniforms = {
      uTime: { value: 0.0 },
      uResolution: { value: new THREE.Vector2(1024, 1024) },
      uNoteHistory: { value: new Float32Array(this.maxHistoryLength * 4) }, // note, velocity, time, track
      uActiveNotes: { value: new Float32Array(128) }, // current note velocities
      uTrackActivity: { value: new Float32Array(16) }, // track activity levels
      uAudioData: { value: new Float32Array(64) }, // frequency data
      uIntensity: { value: 1.0 },
      uGlowIntensity: { value: 0.1 }
    };
  }

  init(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer): void {
    console.log('📊 MidiHudEffect.init() called');
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    // Set resolution
    const size = renderer.getSize(new THREE.Vector2());
    this.uniforms.uResolution.value.set(size.x, size.y);
    
    this.createHudGroup();
    this.createHudElements();
    console.log('📊 MIDI HUD initialized');
  }
  
  private createHudGroup() {
    this.hudGroup = new THREE.Group();
    this.scene.add(this.hudGroup);
  }
  
  private createHudElements() {
    this.createMaterial();
    
    // Create HUD elements as planes positioned around the edges
    this.createNoteHistory();
    this.createVelocityBars();
    this.createTrackActivity();
    this.createSpectrogram();
  }
  
  private createMaterial() {
    const vertexShader = `
      varying vec2 vUv;
      varying vec3 vPosition;
      
      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = vec4(position, 1.0);
      }
    `;
    
    const fragmentShader = `
      precision highp float;
      
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uNoteHistory[200]; // 50 * 4 (note, velocity, time, track)
      uniform float uActiveNotes[128];
      uniform float uTrackActivity[16];
      uniform float uAudioData[64];
      uniform float uIntensity;
      uniform float uGlowIntensity;
      
      varying vec2 vUv;
      varying vec3 vPosition;
      
      // Glow effect function
      float glow(float dist, float radius, float intensity) {
        return pow(radius / dist, intensity);
      }
      
      // Draw a glowing line
      float glowLine(vec2 p, vec2 a, vec2 b, float thickness, float intensity) {
        vec2 pa = p - a;
        vec2 ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        float dist = length(pa - ba * h);
        return glow(dist, thickness, intensity);
      }
      
      // Draw a glowing circle
      float glowCircle(vec2 p, vec2 center, float radius, float thickness, float intensity) {
        float dist = abs(length(p - center) - radius);
        return glow(dist, thickness, intensity);
      }
      
      // Draw note history (top edge)
      vec3 drawNoteHistory(vec2 uv) {
        if (uv.y < 0.95) return vec3(0.0);
        
        vec3 color = vec3(0.0);
        float x = uv.x;
        
        for (int i = 0; i < 50; i++) {
          float note = uNoteHistory[i * 4];
          float velocity = uNoteHistory[i * 4 + 1];
          float time = uNoteHistory[i * 4 + 2];
          
          if (note > 0.0) {
            float notePos = note / 127.0;
            float age = uTime - time;
            float alpha = max(0.0, 1.0 - age / 3.0);
            
            float barX = x;
            float barHeight = velocity * 0.04 + 0.01;
            
            if (abs(barX - notePos) < 0.01 && uv.y > (1.0 - barHeight)) {
                          vec3 noteColor = vec3(
              0.6 + sin(note * 0.1) * 0.1,
              0.6 + cos(note * 0.15) * 0.1,
              0.7
            );
              // Simple solid color instead of glow for bloom post-processing
              color += noteColor * alpha * velocity * 0.3;
            }
          }
        }
        
        return color;
      }
      
      // Draw velocity bars (right edge)
      vec3 drawVelocityBars(vec2 uv) {
        if (uv.x < 0.95) return vec3(0.0);
        
        vec3 color = vec3(0.0);
        
        for (int i = 0; i < 128; i++) {
          float velocity = uActiveNotes[i];
          if (velocity > 0.0) {
            float noteY = float(i) / 127.0;
            float barWidth = velocity * 0.04 + 0.01;
            
            if (abs(uv.y - noteY) < 0.01 && uv.x > (1.0 - barWidth)) {
                          vec3 noteColor = vec3(
              0.7,
              0.6 + velocity * 0.2,
              0.6
            );
              // Simple solid color instead of glow
              color += noteColor * velocity * 0.2;
            }
          }
        }
        
        return color;
      }
      
      // Draw track activity (bottom edge)
      vec3 drawTrackActivity(vec2 uv) {
        if (uv.y > 0.05) return vec3(0.0);
        
        vec3 color = vec3(0.0);
        
        for (int i = 0; i < 16; i++) {
          float activity = uTrackActivity[i];
          if (activity > 0.0) {
            float trackX = float(i) / 15.0;
            float barHeight = activity * 0.04 + 0.01;
            
            if (abs(uv.x - trackX) < 0.03 && uv.y < barHeight) {
                          vec3 trackColor = vec3(
              0.6,
              0.7,
              0.6 + activity * 0.2
            );
              // Simple solid color instead of glow
              color += trackColor * activity * 0.25;
            }
          }
        }
        
        return color;
      }
      
      // Draw audio spectrogram (left edge)
      vec3 drawSpectrogram(vec2 uv) {
        if (uv.x > 0.05) return vec3(0.0);
        
        vec3 color = vec3(0.0);
        
        for (int i = 0; i < 64; i++) {
          float amplitude = uAudioData[i];
          if (amplitude > 0.0) {
            float freqY = float(i) / 63.0;
            float barWidth = amplitude * 0.04 + 0.005;
            
            if (abs(uv.y - freqY) < 0.008 && uv.x < barWidth) {
                          vec3 freqColor = vec3(
              0.6 + amplitude * 0.2,
              0.65,
              0.7
            );
              // Simple solid color instead of glow
              color += freqColor * amplitude * 0.2;
            }
          }
        }
        
        return color;
      }
      
      void main() {
        vec2 uv = vUv;
        vec3 color = vec3(0.0);
        
        // Draw all HUD elements
        color += drawNoteHistory(uv);
        color += drawVelocityBars(uv);
        color += drawTrackActivity(uv);
        color += drawSpectrogram(uv);
        
        // Remove border glow and enhancement - let bloom post-processing handle glow
        // Just keep the basic colors for bloom to work with
        
        gl_FragColor = vec4(color, length(color) > 0.0 ? 1.0 : 0.0);
      }
    `;
    
    try {
      this.material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: this.uniforms,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      console.log('✅ MIDI HUD shader material created');
    } catch (error) {
      console.error('❌ MIDI HUD shader compilation error:', error);
      this.material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.3
      }) as any;
    }
  }
  
  private createNoteHistory() {
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.noteHistoryMesh = new THREE.Mesh(geometry, this.material);
    this.hudGroup.add(this.noteHistoryMesh);
  }
  
  private createVelocityBars() {
    // Using the same material and mesh for all HUD elements
    // The shader handles different visualizations based on position
  }
  
  private createTrackActivity() {
    // Same as above
  }
  
  private createSpectrogram() {
    // Same as above
  }

  updateParameter(paramName: string, value: any): void {
    // Immediately update uniforms when parameters change
    if (!this.uniforms) return;
    
    switch (paramName) {
      case 'glowIntensity':
        this.uniforms.uGlowIntensity.value = value;
        break;
      case 'animationSpeed':
        // This affects the time progression in update loop
        break;
      case 'showNoteHistory':
      case 'showVelocityBars':
      case 'showTrackActivity':
      case 'showSpectrogram':
        // These are boolean flags that affect shader behavior
        break;
    }
  }

  update(deltaTime: number, audioData: AudioAnalysisData, midiData: LiveMIDIData): void {
    if (!this.uniforms) return;

    // Generic: sync all parameters to uniforms
    for (const key in this.parameters) {
      const uniformKey = 'u' + key.charAt(0).toUpperCase() + key.slice(1);
      if (this.uniforms[uniformKey]) {
        this.uniforms[uniformKey].value = this.parameters[key];
      }
    }

    this.uniforms.uTime.value += deltaTime * this.parameters.animationSpeed;
    this.uniforms.uIntensity.value = Math.max(0.5, Math.min(midiData.activeNotes.length / 3.0, 2.0));
    this.uniforms.uGlowIntensity.value = this.parameters.glowIntensity;
    
    // Update note history
    this.updateNoteHistory(midiData);
    
    // Update active notes array
    this.updateActiveNotes(midiData);
    
    // Update track activity
    this.updateTrackActivity(midiData);
    
    // Update audio data
    this.updateAudioData(audioData);
  }
  
  private updateNoteHistory(midiData: LiveMIDIData) {
    // Add new notes to history
    midiData.activeNotes.forEach(note => {
      if (!this.noteHistory.find(h => h.note === note.note && h.time === this.uniforms.uTime.value)) {
        this.noteHistory.push({
          note: note.note,
          velocity: note.velocity / 127,
          time: this.uniforms.uTime.value,
          track: note.track
        });
      }
    });
    
    // Remove old notes
    const currentTime = this.uniforms.uTime.value;
    this.noteHistory = this.noteHistory.filter(note => currentTime - note.time < 5.0);
    
    // Limit history length
    if (this.noteHistory.length > this.maxHistoryLength) {
      this.noteHistory = this.noteHistory.slice(-this.maxHistoryLength);
    }
    
    // Update uniform array
    const historyArray = this.uniforms.uNoteHistory.value as Float32Array;
    historyArray.fill(0);
    
    this.noteHistory.forEach((note, index) => {
      if (index < this.maxHistoryLength) {
        historyArray[index * 4] = note.note;
        historyArray[index * 4 + 1] = note.velocity;
        historyArray[index * 4 + 2] = note.time;
        historyArray[index * 4 + 3] = parseFloat(note.track) || 0;
      }
    });
  }
  
  private updateActiveNotes(midiData: LiveMIDIData) {
    const activeNotesArray = this.uniforms.uActiveNotes.value as Float32Array;
    activeNotesArray.fill(0);
    
    midiData.activeNotes.forEach(note => {
      if (note.note >= 0 && note.note < 128) {
        activeNotesArray[note.note] = note.velocity / 127;
      }
    });
  }
  
  private updateTrackActivity(midiData: LiveMIDIData) {
    const trackActivityArray = this.uniforms.uTrackActivity.value as Float32Array;
    trackActivityArray.fill(0);
    
    Object.entries(midiData.trackActivity).forEach(([trackId, active], index) => {
      if (index < 16) {
        trackActivityArray[index] = active ? 1.0 : 0.0;
      }
    });
  }
  
  private updateAudioData(audioData: AudioAnalysisData) {
    const audioDataArray = this.uniforms.uAudioData.value as Float32Array;
    
    // Sample frequency data to 64 points
    const step = audioData.frequencies.length / 64;
    for (let i = 0; i < 64; i++) {
      const index = Math.floor(i * step);
      audioDataArray[i] = audioData.frequencies[index] / 255.0;
    }
  }

  destroy(): void {
    if (this.hudGroup) {
      this.scene.remove(this.hudGroup);
      this.hudGroup.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
  }
} 