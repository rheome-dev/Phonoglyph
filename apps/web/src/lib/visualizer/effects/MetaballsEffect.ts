import * as THREE from 'three';
import { VisualEffect, AudioAnalysisData, LiveMIDIData, MetaballConfig } from '@/types/visualizer';

export class MetaballsEffect implements VisualEffect {
  id = 'metaballs';
  name = 'MIDI Metaballs';
  description = 'Fluid droplet-like spheres that respond to MIDI notes';
  enabled = true;
  parameters: MetaballConfig;

  private scene!: THREE.Scene;
  private camera!: THREE.Camera;
  private renderer!: THREE.WebGLRenderer;
  private material!: THREE.ShaderMaterial;
  private mesh!: THREE.Mesh;
  private uniforms!: Record<string, THREE.IUniform>;

  // Camera animation state
  private baseCameraDistance = 3.0;
  private cameraOrbitRadius = 2.0;
  private cameraHeight = 1.0;
  private cameraSmoothing = 0.02;

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

  init(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer): void {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
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
        vec3 cameraPos = uCameraPos;
        vec3 cameraTarget = uCameraTarget;
        vec3 cameraDir = normalize(cameraTarget - cameraPos);
        vec3 cameraRight = normalize(cross(cameraDir, vec3(0.0, 1.0, 0.0)));
        vec3 cameraUp = cross(cameraRight, cameraDir);
        vec3 rayDir = normalize(cameraDir + uv.x * cameraRight + uv.y * cameraUp);
        float dist = rayMarch(cameraPos, rayDir);
        vec4 finalColor = vec4(0.0);
        if (dist < MAX_DIST) {
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
          // Translucency: base alpha is very low, highlights/rims are subtle
          float alpha = 0.07 + 0.10 * thickness;
          alpha += 0.25 * fresnel;
          alpha += 0.10 * pow(core, 2.0);
          alpha = clamp(alpha, 0.0, 0.55);
          finalColor = vec4(color, alpha);
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
      side: THREE.DoubleSide
    });
    } catch (error) {
      console.error('❌ Shader compilation error:', error);
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
    // Ensure metaballs render on top of other content and occlude it
    this.mesh.renderOrder = 9999; // very last
    this.material.depthWrite = true; // write depth so underlying particles are hidden
    this.material.depthTest = true; // keep depth testing enabled
    this.scene.add(this.mesh);
  }

  updateParameter(paramName: string, value: any): void {
    // Immediately update uniforms when parameters change
    if (!this.uniforms) return;
    
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
        this.uniforms.uHighlightColor.value.set(...value);
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

    // Update time
    this.uniforms.uTime.value += deltaTime * this.parameters.animationSpeed;

    // Calculate intensity based on both audio and MIDI activity
    const midiIntensity = Math.min(midiData.activeNotes.length / 3.0, 1.0);
    const audioIntensity = audioData.volume;
    // Ensure we always have a good base intensity so metaballs are visible
    this.uniforms.uIntensity.value = Math.max(0.8, (midiIntensity + audioIntensity) * 1.2);

    // Animate camera based on MIDI notes
    this.updateCameraAnimation(midiData, audioData);

    // Debug log to see if we're getting MIDI data
    if (midiData.activeNotes.length > 0) {
      // Removed console.log to reduce console noise
    }
  }

  private updateCameraAnimation(midiData: LiveMIDIData, audioData: AudioAnalysisData): void {
    const time = this.uniforms.uTime.value;
    
    // Base camera orbit animation
    let cameraAngle = time * 0.3;
    let cameraElevation = Math.sin(time * 0.2) * 0.3;
    let cameraDistance = this.baseCameraDistance;

    // MIDI-based camera effects
    if (midiData.activeNotes.length > 0) {
      // Use note pitches to influence camera position
      const avgPitch = midiData.activeNotes.reduce((sum, note) => sum + note.note, 0) / midiData.activeNotes.length;
      const normalizedPitch = (avgPitch - 60) / 48; // Normalize around middle C
      
      // Use note velocities for camera movement intensity
      const avgVelocity = midiData.activeNotes.reduce((sum, note) => sum + note.velocity, 0) / midiData.activeNotes.length / 127;
      
      // Pitch affects camera angle and height
      cameraAngle += normalizedPitch * 2.0; // Higher notes move camera clockwise
      cameraElevation += normalizedPitch * 0.8; // Higher notes raise camera
      
      // Velocity affects camera distance and orbit speed
      cameraDistance += avgVelocity * 1.5; // Louder notes move camera back
      cameraAngle += avgVelocity * Math.sin(time * 4.0) * 0.5; // Add velocity-based wobble
      
      // Multiple notes create more dynamic movement
      const noteCount = Math.min(midiData.activeNotes.length, 5);
      const complexity = noteCount / 5.0;
      cameraElevation += Math.sin(time * 3.0 + complexity * 2.0) * complexity * 0.3;
      
      // Add chord-based camera effects
      if (midiData.activeNotes.length >= 3) {
        // For chords, add orbital variation
        cameraAngle += Math.sin(time * 2.0) * 0.4;
        cameraDistance += Math.cos(time * 1.5) * 0.3;
      }
    }

    // Audio-based subtle effects
    const audioInfluence = audioData.volume * 0.3;
    cameraDistance += audioInfluence;
    cameraElevation += Math.sin(time * 5.0) * audioInfluence * 0.2;

    // Calculate new camera position
    const newCameraPos = new THREE.Vector3(
      Math.cos(cameraAngle) * cameraDistance,
      cameraElevation + this.cameraHeight,
      Math.sin(cameraAngle) * cameraDistance
    );

    // Smooth camera movement
    const currentPos = this.uniforms.uCameraPos.value;
    currentPos.lerp(newCameraPos, this.cameraSmoothing);

    // Keep camera target at the center (where metaballs are)
    const target = new THREE.Vector3(0, 0, 0);

    // Add subtle target movement based on intense MIDI activity
    if (midiData.activeNotes.length > 2) {
      const intensity = Math.min(midiData.activeNotes.length / 5.0, 1.0);
      target.x = Math.sin(time * 2.0) * intensity * 0.2;
      target.y = Math.cos(time * 1.5) * intensity * 0.1;
    }

    this.uniforms.uCameraTarget.value.copy(target);
  }

  destroy(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.material.dispose();
    }
  }
}