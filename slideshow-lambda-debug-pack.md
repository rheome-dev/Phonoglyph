This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.
The content has been processed where line numbers have been added.

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
- Only files matching these patterns are included: apps/web/src/lib/visualizer/effects/ImageSlideshowEffect.ts, apps/web/src/remotion/RayboxComposition.tsx, apps/web/src/remotion/Root.tsx, apps/web/src/remotion/RemotionOverlayRenderer.tsx, apps/web/src/remotion/index.ts, apps/web/remotion.config.ts, apps/web/src/lib/visualizer/effects/EffectRegistry.ts, apps/web/src/lib/visualizer/effects/EffectDefinitions.ts, apps/web/src/lib/visualizer/effects/BaseShaderEffect.ts, apps/web/src/lib/visualizer/core/VisualizerManager.ts, apps/web/src/lib/visualizer/core/MultiLayerCompositor.ts, apps/web/src/lib/visualizer/core/MediaLayerManager.ts, apps/web/src/lib/visualizer/core/AudioTextureManager.ts, apps/api/src/routers/render.ts, apps/web/src/lib/export-utils.ts, apps/web/src/types/audio-analysis-data.ts, apps/web/src/types/video-composition.ts
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Line numbers have been added to the beginning of each line
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
apps/
  api/
    src/
      routers/
        render.ts
  web/
    src/
      lib/
        visualizer/
          core/
            AudioTextureManager.ts
            MediaLayerManager.ts
            MultiLayerCompositor.ts
            VisualizerManager.ts
          effects/
            BaseShaderEffect.ts
            EffectDefinitions.ts
            EffectRegistry.ts
            ImageSlideshowEffect.ts
        export-utils.ts
      remotion/
        index.ts
        RayboxComposition.tsx
        RemotionOverlayRenderer.tsx
        Root.tsx
      types/
        audio-analysis-data.ts
        video-composition.ts
    remotion.config.ts
```

# Files

## File: apps/web/src/lib/visualizer/core/AudioTextureManager.ts
```typescript
  1: import * as THREE from 'three';
  2: 
  3: export interface AudioFeatureData {
  4:   features: Record<string, number[]>;
  5:   duration: number;
  6:   sampleRate: number;
  7:   stemTypes: string[];
  8: }
  9: 
 10: export interface AudioFeatureMapping {
 11:   featureIndex: number;
 12:   stemType: string;
 13:   featureName: string;
 14:   minValue: number;
 15:   maxValue: number;
 16: }
 17: 
 18: export class AudioTextureManager {
 19:   private audioTexture: THREE.DataTexture;
 20:   private featureTexture: THREE.DataTexture;
 21:   private timeTexture: THREE.DataTexture;
 22:   
 23:   // Texture layout: X = time, Y = feature index, RGBA = feature values
 24:   private audioData: Float32Array;
 25:   private featureData: Float32Array;
 26:   private timeData: Float32Array;
 27:   
 28:   // Configuration
 29:   private readonly textureWidth = 256;  // Time samples
 30:   private readonly textureHeight = 64;  // Feature rows (16 features per row)
 31:   private readonly maxFeatures = 256;   // 64 rows × 4 channels
 32:   
 33:   // Feature mapping
 34:   private featureMappings: AudioFeatureMapping[] = [];
 35:   private featureIndexMap: Map<string, number> = new Map();
 36:   
 37:   constructor() {
 38:     // Initialize audio data array (256×64×4 = 65,536 values)
 39:     this.audioData = new Float32Array(this.textureWidth * this.textureHeight * 4);
 40:     
 41:     // Initialize feature metadata (64×4 = 256 values)
 42:     this.featureData = new Float32Array(this.textureHeight * 4);
 43:     
 44:     // Initialize time synchronization (4 values: currentTime, duration, normalizedTime, padding)
 45:     this.timeData = new Float32Array(4);
 46:     
 47:     // Create GPU textures
 48:     this.audioTexture = new THREE.DataTexture(
 49:       this.audioData,
 50:       this.textureWidth,
 51:       this.textureHeight,
 52:       THREE.RGBAFormat,
 53:       THREE.FloatType
 54:     );
 55:     this.audioTexture.needsUpdate = true;
 56:     this.audioTexture.wrapS = THREE.ClampToEdgeWrapping;
 57:     this.audioTexture.wrapT = THREE.ClampToEdgeWrapping;
 58:     this.audioTexture.magFilter = THREE.LinearFilter;
 59:     this.audioTexture.minFilter = THREE.LinearFilter;
 60:     
 61:     this.featureTexture = new THREE.DataTexture(
 62:       this.featureData,
 63:       4,
 64:       this.textureHeight,
 65:       THREE.RGBAFormat,
 66:       THREE.FloatType
 67:     );
 68:     this.featureTexture.needsUpdate = true;
 69:     this.featureTexture.wrapS = THREE.ClampToEdgeWrapping;
 70:     this.featureTexture.wrapT = THREE.ClampToEdgeWrapping;
 71:     this.featureTexture.magFilter = THREE.NearestFilter;
 72:     this.featureTexture.minFilter = THREE.NearestFilter;
 73:     
 74:     this.timeTexture = new THREE.DataTexture(
 75:       this.timeData,
 76:       1,
 77:       1,
 78:       THREE.RGBAFormat,
 79:       THREE.FloatType
 80:     );
 81:     this.timeTexture.needsUpdate = true;
 82:     this.timeTexture.wrapS = THREE.ClampToEdgeWrapping;
 83:     this.timeTexture.wrapT = THREE.ClampToEdgeWrapping;
 84:     this.timeTexture.magFilter = THREE.NearestFilter;
 85:     this.timeTexture.minFilter = THREE.NearestFilter;
 86:   }
 87:   
 88:   /**
 89:    * Load cached audio analysis into GPU textures
 90:    */
 91:   public loadAudioAnalysis(analysisData: AudioFeatureData): void {
 92:     this.buildFeatureMapping(analysisData);
 93:     this.packFeaturesIntoTexture(analysisData);
 94:   }
 95:   
 96:   /**
 97:    * Build feature mapping from analysis data
 98:    */
 99:   private buildFeatureMapping(analysisData: AudioFeatureData): void {
100:     this.featureMappings = [];
101:     this.featureIndexMap.clear();
102:     
103:     let featureIndex = 0;
104:     
105:     // Map features by stem type and feature name
106:     for (const stemType of analysisData.stemTypes) {
107:       const stemFeatures = analysisData.features[stemType];
108:       if (!stemFeatures) continue;
109:       
110:       // Common audio features
111:       const featureNames = ['rms', 'spectralCentroid', 'spectralRolloff', 'zcr'];
112:       
113:       for (const featureName of featureNames) {
114:         if (featureIndex >= this.maxFeatures) break;
115:         
116:         const mapping: AudioFeatureMapping = {
117:           featureIndex,
118:           stemType,
119:           featureName,
120:           minValue: 0,
121:           maxValue: 1
122:         };
123:         
124:         this.featureMappings.push(mapping);
125:         this.featureIndexMap.set(`${stemType}-${featureName}`, featureIndex);
126:         featureIndex++;
127:       }
128:     }
129:     
130:     // Pack feature metadata into texture
131:     this.packFeatureMetadata();
132:   }
133:   
134:   /**
135:    * Pack feature metadata into feature texture
136:    */
137:   private packFeatureMetadata(): void {
138:     for (let i = 0; i < this.featureMappings.length; i++) {
139:       const mapping = this.featureMappings[i];
140:       const row = Math.floor(i / 4);
141:       const col = i % 4;
142:       const index = row * 4 + col;
143:       
144:       // Store feature index, stem type hash, feature name hash, and value range
145:       this.featureData[index * 4 + 0] = mapping.featureIndex;
146:       this.featureData[index * 4 + 1] = this.hashString(mapping.stemType);
147:       this.featureData[index * 4 + 2] = this.hashString(mapping.featureName);
148:       this.featureData[index * 4 + 3] = mapping.maxValue - mapping.minValue;
149:     }
150:     
151:     this.featureTexture.needsUpdate = true;
152:   }
153:   
154:   /**
155:    * Pack audio features into main texture
156:    */
157:   private packFeaturesIntoTexture(analysisData: AudioFeatureData): void {
158:     // Clear texture data
159:     this.audioData.fill(0);
160:     
161:     // Pack features by time and feature index
162:     for (const mapping of this.featureMappings) {
163:       const stemFeatures = analysisData.features[mapping.stemType];
164:       if (!stemFeatures) continue;
165:       
166:       const featureData = this.extractFeatureData(stemFeatures, mapping.featureName);
167:       if (!featureData) continue;
168:       
169:       // Pack into texture: X = time, Y = feature row, RGBA = feature values
170:       const row = Math.floor(mapping.featureIndex / 4);
171:       const channel = mapping.featureIndex % 4;
172:       
173:       for (let timeIndex = 0; timeIndex < Math.min(this.textureWidth, featureData.length); timeIndex++) {
174:         const textureIndex = (timeIndex + row * this.textureWidth) * 4 + channel;
175:         const normalizedValue = this.normalizeValue(featureData[timeIndex], mapping.minValue, mapping.maxValue);
176:         this.audioData[textureIndex] = normalizedValue;
177:       }
178:     }
179:     
180:     this.audioTexture.needsUpdate = true;
181:   }
182:   
183:   /**
184:    * Extract specific feature data from stem features
185:    */
186:   private extractFeatureData(stemFeatures: number[], featureName: string): number[] | null {
187:     // This is a simplified extraction - in practice, you'd parse the actual feature data structure
188:     // For now, we'll use the stem features directly as if they're the requested feature
189:     return stemFeatures;
190:   }
191:   
192:   /**
193:    * Update time synchronization (called once per frame)
194:    */
195:   public updateTime(currentTime: number, duration: number): void {
196:     this.timeData[0] = currentTime;
197:     this.timeData[1] = duration;
198:     this.timeData[2] = currentTime / duration; // Normalized progress
199:     this.timeData[3] = 0; // Padding
200:     
201:     this.timeTexture.needsUpdate = true;
202:   }
203:   
204:   /**
205:    * Get shader uniforms for audio texture access
206:    */
207:   public getShaderUniforms(): Record<string, THREE.Uniform> {
208:     return {
209:       uAudioTexture: new THREE.Uniform(this.audioTexture),
210:       uFeatureTexture: new THREE.Uniform(this.featureTexture),
211:       uTimeTexture: new THREE.Uniform(this.timeTexture),
212:       uAudioTextureSize: new THREE.Uniform(new THREE.Vector2(this.textureWidth, this.textureHeight)),
213:       uFeatureTextureSize: new THREE.Uniform(new THREE.Vector2(4, this.textureHeight))
214:     };
215:   }
216:   
217:   /**
218:    * Generate shader code for audio feature access
219:    */
220:   public generateShaderCode(): string {
221:     return `
222:       uniform sampler2D uAudioTexture;
223:       uniform sampler2D uFeatureTexture;
224:       uniform sampler2D uTimeTexture;
225:       uniform vec2 uAudioTextureSize;
226:       uniform vec2 uFeatureTextureSize;
227:       
228:       float sampleAudioFeature(float featureIndex) {
229:         vec4 timeData = texture2D(uTimeTexture, vec2(0.5));
230:         float normalizedTime = timeData.z;
231:         
232:         float rowIndex = floor(featureIndex / 4.0);
233:         vec2 uv = vec2(normalizedTime, rowIndex / uAudioTextureSize.y);
234:         vec4 featureData = texture2D(uAudioTexture, uv);
235:         
236:         // Extract correct channel based on feature index
237:         float channelIndex = mod(featureIndex, 4.0);
238:         if (channelIndex < 0.5) return featureData.r;
239:         else if (channelIndex < 1.5) return featureData.g;
240:         else if (channelIndex < 2.5) return featureData.b;
241:         else return featureData.a;
242:       }
243:       
244:       float sampleAudioFeatureByName(float stemTypeHash, float featureNameHash) {
245:         // Find feature index by name (simplified - in practice you'd use a lookup table)
246:         for (float i = 0.0; i < uFeatureTextureSize.y; i++) {
247:           vec2 featureUv = vec2(0.5, (i + 0.5) / uFeatureTextureSize.y);
248:           vec4 featureInfo = texture2D(uFeatureTexture, featureUv);
249:           
250:           if (featureInfo.y == stemTypeHash && featureInfo.z == featureNameHash) {
251:             return sampleAudioFeature(featureInfo.x);
252:           }
253:         }
254:         return 0.0;
255:       }
256:     `;
257:   }
258:   
259:   /**
260:    * Get feature value by name (for debugging/testing)
261:    */
262:   public getFeatureValue(stemType: string, featureName: string): number {
263:     const key = `${stemType}-${featureName}`;
264:     const featureIndex = this.featureIndexMap.get(key);
265:     if (featureIndex === undefined) return 0;
266:     
267:     const row = Math.floor(featureIndex / 4);
268:     const channel = featureIndex % 4;
269:     const timeIndex = Math.floor(this.timeData[2] * this.textureWidth);
270:     const textureIndex = (timeIndex + row * this.textureWidth) * 4 + channel;
271:     
272:     return this.audioData[textureIndex] || 0;
273:   }
274:   
275:   /**
276:    * Simple string hash function
277:    */
278:   private hashString(str: string): number {
279:     let hash = 0;
280:     for (let i = 0; i < str.length; i++) {
281:       const char = str.charCodeAt(i);
282:       hash = ((hash << 5) - hash) + char;
283:       hash = hash & hash; // Convert to 32-bit integer
284:     }
285:     return Math.abs(hash) / 2147483647; // Normalize to 0-1
286:   }
287:   
288:   /**
289:    * Normalize value to 0-1 range
290:    */
291:   private normalizeValue(value: number, min: number, max: number): number {
292:     return Math.max(0, Math.min(1, (value - min) / (max - min)));
293:   }
294:   
295:   /**
296:    * Dispose of textures
297:    */
298:   public dispose(): void {
299:     this.audioTexture.dispose();
300:     this.featureTexture.dispose();
301:     this.timeTexture.dispose();
302:   }
303: }
```

## File: apps/web/src/lib/visualizer/core/MediaLayerManager.ts
```typescript
  1: import * as THREE from 'three';
  2: 
  3: export interface MediaLayerConfig {
  4:   id: string;
  5:   type: 'canvas' | 'video' | 'image';
  6:   source: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement | string;
  7:   blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'add' | 'subtract';
  8:   opacity: number;
  9:   zIndex: number;
 10:   
 11:   // Audio-reactive bindings
 12:   audioBindings?: {
 13:     feature: string;                    // 'drums-rms', 'bass-spectralCentroid'
 14:     property: 'opacity' | 'scale' | 'rotation' | 'position';
 15:     inputRange: [number, number];       // Audio feature range
 16:     outputRange: [number, number];      // Visual property range
 17:     blendMode: 'multiply' | 'add' | 'replace';
 18:   }[];
 19:   
 20:   // Transform properties
 21:   position: { x: number; y: number };
 22:   scale: { x: number; y: number };
 23:   rotation: number;
 24: }
 25: 
 26: export interface AudioFeatures {
 27:   [key: string]: number;
 28: }
 29: 
 30: export class MediaLayerManager {
 31:   private mediaLayers: Map<string, MediaLayerConfig> = new Map();
 32:   private layerMaterials: Map<string, THREE.ShaderMaterial> = new Map();
 33:   private layerTextures: Map<string, THREE.Texture> = new Map();
 34:   private layerMeshes: Map<string, THREE.Mesh> = new Map();
 35:   
 36:   private scene: THREE.Scene;
 37:   private camera: THREE.OrthographicCamera;
 38:   private renderer: THREE.WebGLRenderer;
 39:   
 40:   constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
 41:     this.scene = scene;
 42:     this.camera = camera as THREE.OrthographicCamera;
 43:     this.renderer = renderer;
 44:   }
 45:   
 46:   /**
 47:    * Add a media layer
 48:    */
 49:   public addMediaLayer(config: MediaLayerConfig): void {
 50:     this.mediaLayers.set(config.id, config);
 51:     
 52:     // Create texture from media source
 53:     const texture = this.createTextureFromSource(config.source, config.type);
 54:     this.layerTextures.set(config.id, texture);
 55:     
 56:     // Create material with audio-reactive uniforms
 57:     const material = this.createMaterial(config, texture);
 58:     this.layerMaterials.set(config.id, material);
 59:     
 60:     // Create mesh
 61:     const mesh = this.createMesh(config, material);
 62:     this.layerMeshes.set(config.id, mesh);
 63:     
 64:     // Add to scene
 65:     this.scene.add(mesh);
 66:   }
 67:   
 68:   /**
 69:    * Remove a media layer
 70:    */
 71:   public removeMediaLayer(id: string): void {
 72:     const mesh = this.layerMeshes.get(id);
 73:     if (mesh) {
 74:       this.scene.remove(mesh);
 75:       mesh.geometry.dispose();
 76:       this.layerMeshes.delete(id);
 77:     }
 78:     
 79:     const material = this.layerMaterials.get(id);
 80:     if (material) {
 81:       material.dispose();
 82:       this.layerMaterials.delete(id);
 83:     }
 84:     
 85:     const texture = this.layerTextures.get(id);
 86:     if (texture) {
 87:       texture.dispose();
 88:       this.layerTextures.delete(id);
 89:     }
 90:     
 91:     this.mediaLayers.delete(id);
 92:   }
 93:   
 94:   /**
 95:    * Update media layer with audio features
 96:    * @deprecated Legacy method - effects now receive modulated parameters through the mapping system
 97:    */
 98:   public updateWithAudioFeatures(audioFeatures: AudioFeatures): void {
 99:     for (const [id, config] of this.mediaLayers) {
100:       if (!config.audioBindings) continue;
101:       
102:       const material = this.layerMaterials.get(id);
103:       if (!material) continue;
104:       
105:       for (const binding of config.audioBindings) {
106:         const featureValue = audioFeatures[binding.feature];
107:         if (featureValue === undefined) continue;
108:         
109:         const mappedValue = this.mapRange(
110:           featureValue,
111:           binding.inputRange[0], binding.inputRange[1],
112:           binding.outputRange[0], binding.outputRange[1]
113:         );
114:         
115:         // Apply to shader uniforms
116:         switch (binding.property) {
117:           case 'opacity':
118:             material.uniforms.uOpacity.value = mappedValue;
119:             break;
120:           case 'scale':
121:             material.uniforms.uScale.value.set(mappedValue, mappedValue);
122:             break;
123:           case 'rotation':
124:             material.uniforms.uRotation.value = mappedValue;
125:             break;
126:           case 'position':
127:             material.uniforms.uPosition.value.set(
128:               config.position.x + mappedValue,
129:               config.position.y + mappedValue
130:             );
131:             break;
132:         }
133:       }
134:     }
135:   }
136:   
137:   /**
138:    * Update textures (for video elements)
139:    */
140:   public updateTextures(): void {
141:     for (const [id, texture] of this.layerTextures) {
142:       if (texture instanceof THREE.VideoTexture) {
143:         texture.needsUpdate = true;
144:       }
145:     }
146:   }
147:   
148:   /**
149:    * Create texture from media source
150:    */
151:   private createTextureFromSource(
152:     source: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement | string,
153:     type: string
154:   ): THREE.Texture {
155:     switch (type) {
156:       case 'video':
157:         if (typeof source === 'string') {
158:           const video = document.createElement('video');
159:           video.src = source;
160:           video.loop = true;
161:           video.muted = true;
162:           video.play();
163:           return new THREE.VideoTexture(video);
164:         } else if (source instanceof HTMLVideoElement) {
165:           return new THREE.VideoTexture(source);
166:         }
167:         break;
168:         
169:       case 'image':
170:         if (typeof source === 'string') {
171:           return new THREE.TextureLoader().load(source);
172:         } else if (source instanceof HTMLImageElement) {
173:           return new THREE.Texture(source);
174:         }
175:         break;
176:         
177:       case 'canvas':
178:         if (source instanceof HTMLCanvasElement) {
179:           return new THREE.CanvasTexture(source);
180:         }
181:         break;
182:     }
183:     
184:     // Fallback to a default texture
185:     return new THREE.Texture();
186:   }
187:   
188:   /**
189:    * Create material with audio-reactive uniforms
190:    */
191:   private createMaterial(config: MediaLayerConfig, texture: THREE.Texture): THREE.ShaderMaterial {
192:     return new THREE.ShaderMaterial({
193:       vertexShader: `
194:         uniform vec2 uPosition;
195:         uniform vec2 uScale;
196:         uniform float uRotation;
197:         varying vec2 vUv;
198:         
199:         void main() {
200:           vUv = uv;
201:           
202:           vec3 pos = position;
203:           
204:           // Apply scale
205:           pos.xy *= uScale;
206:           
207:           // Apply rotation
208:           float c = cos(uRotation);
209:           float s = sin(uRotation);
210:           mat2 rotationMatrix = mat2(c, -s, s, c);
211:           pos.xy = rotationMatrix * pos.xy;
212:           
213:           // Apply position
214:           pos.xy += uPosition;
215:           
216:           gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
217:         }
218:       `,
219:       fragmentShader: `
220:         uniform sampler2D tDiffuse;
221:         uniform float uOpacity;
222:         varying vec2 vUv;
223:         
224:         void main() {
225:           vec4 texel = texture2D(tDiffuse, vUv);
226:           gl_FragColor = vec4(texel.rgb, texel.a * uOpacity);
227:         }
228:       `,
229:       uniforms: {
230:         tDiffuse: new THREE.Uniform(texture),
231:         uOpacity: new THREE.Uniform(config.opacity),
232:         uPosition: new THREE.Uniform(new THREE.Vector2(config.position.x, config.position.y)),
233:         uScale: new THREE.Uniform(new THREE.Vector2(config.scale.x, config.scale.y)),
234:         uRotation: new THREE.Uniform(config.rotation)
235:       },
236:       transparent: true,
237:       depthTest: false,
238:       depthWrite: false
239:     });
240:   }
241:   
242:   /**
243:    * Create mesh for media layer
244:    */
245:   private createMesh(config: MediaLayerConfig, material: THREE.ShaderMaterial): THREE.Mesh {
246:     const geometry = new THREE.PlaneGeometry(1, 1);
247:     const mesh = new THREE.Mesh(geometry, material);
248:     
249:     // Set initial transform
250:     mesh.position.set(config.position.x, config.position.y, -config.zIndex);
251:     mesh.scale.set(config.scale.x, config.scale.y, 1);
252:     mesh.rotation.z = config.rotation;
253:     
254:     return mesh;
255:   }
256:   
257:   /**
258:    * Map value from one range to another
259:    */
260:   private mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
261:     return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
262:   }
263:   
264:   /**
265:    * Get media layer by ID
266:    */
267:   public getMediaLayer(id: string): MediaLayerConfig | undefined {
268:     return this.mediaLayers.get(id);
269:   }
270:   
271:   /**
272:    * Get all media layer IDs
273:    */
274:   public getMediaLayerIds(): string[] {
275:     return [...this.mediaLayers.keys()];
276:   }
277:   
278:   /**
279:    * Update layer configuration
280:    */
281:   public updateLayerConfig(id: string, updates: Partial<MediaLayerConfig>): void {
282:     const config = this.mediaLayers.get(id);
283:     if (!config) return;
284:     
285:     Object.assign(config, updates);
286:     
287:     // Update material uniforms
288:     const material = this.layerMaterials.get(id);
289:     if (material) {
290:       if (updates.opacity !== undefined) {
291:         material.uniforms.uOpacity.value = updates.opacity;
292:       }
293:       if (updates.position !== undefined) {
294:         material.uniforms.uPosition.value.set(updates.position.x, updates.position.y);
295:       }
296:       if (updates.scale !== undefined) {
297:         material.uniforms.uScale.value.set(updates.scale.x, updates.scale.y);
298:       }
299:       if (updates.rotation !== undefined) {
300:         material.uniforms.uRotation.value = updates.rotation;
301:       }
302:     }
303:     
304:     // Update mesh transform
305:     const mesh = this.layerMeshes.get(id);
306:     if (mesh) {
307:       if (updates.position !== undefined) {
308:         mesh.position.set(updates.position.x, updates.position.y, -config.zIndex);
309:       }
310:       if (updates.scale !== undefined) {
311:         mesh.scale.set(updates.scale.x, updates.scale.y, 1);
312:       }
313:       if (updates.rotation !== undefined) {
314:         mesh.rotation.z = updates.rotation;
315:       }
316:       if (updates.zIndex !== undefined) {
317:         mesh.position.z = -updates.zIndex;
318:       }
319:     }
320:   }
321:   
322:   /**
323:    * Dispose of all resources
324:    */
325:   public dispose(): void {
326:     for (const [id] of this.mediaLayers) {
327:       this.removeMediaLayer(id);
328:     }
329:     
330:     this.mediaLayers.clear();
331:     this.layerMaterials.clear();
332:     this.layerTextures.clear();
333:     this.layerMeshes.clear();
334:   }
335: }
```

## File: apps/web/src/lib/visualizer/effects/EffectRegistry.ts
```typescript
 1: import { debugLog } from '@/lib/utils';
 2: import type { VisualEffect } from '@/types/visualizer';
 3: 
 4: export interface EffectConstructor {
 5:   new (config?: any): VisualEffect;
 6: }
 7: 
 8: export interface EffectDefinition {
 9:   id: string;
10:   name: string;
11:   description: string;
12:   category?: string;
13:   version?: string;
14:   author?: string;
15:   constructor: EffectConstructor;
16:   defaultConfig?: any;
17: }
18: 
19: export class EffectRegistry {
20:   private static effects = new Map<string, EffectDefinition>();
21: 
22:   static register(effectDef: EffectDefinition): void {
23:     if (!effectDef?.id || !effectDef?.constructor) {
24:       debugLog.warn('Attempted to register invalid effect definition', effectDef);
25:       return;
26:     }
27:     this.effects.set(effectDef.id, effectDef);
28:     debugLog.log(`[EffectRegistry] Registered effect: ${effectDef.id}`);
29:   }
30: 
31:   static createEffect(effectId: string, config?: any): VisualEffect | null {
32:     const effectDef = this.effects.get(effectId);
33:     if (!effectDef) {
34:       debugLog.warn(`[EffectRegistry] Effect not found: ${effectId}`);
35:       return null;
36:     }
37:     try {
38:       return new effectDef.constructor(config ?? effectDef.defaultConfig);
39:     } catch (error) {
40:       debugLog.error(`[EffectRegistry] Failed to create effect ${effectId}:`, error);
41:       return null;
42:     }
43:   }
44: 
45:   static getAvailableEffects(): EffectDefinition[] {
46:     return Array.from(this.effects.values());
47:   }
48: 
49:   static getEffectById(id: string): EffectDefinition | null {
50:     return this.effects.get(id) ?? null;
51:   }
52: 
53:   static getRegisteredEffectIds(): string[] {
54:     return Array.from(this.effects.keys());
55:   }
56: }
```

## File: apps/web/src/remotion/index.ts
```typescript
1: import { registerRoot } from 'remotion';
2: import { RemotionRoot } from './Root';
3: 
4: registerRoot(RemotionRoot);
```

## File: apps/web/src/types/audio-analysis-data.ts
```typescript
 1: export interface TransientData {
 2:   time: number;
 3:   intensity: number;
 4:   type?: string; // 'kick', 'snare', 'hat', 'generic', etc. - always provided by worker as 'generic' for now
 5:   frequency?: number;
 6: }
 7: 
 8: export interface FeatureNormalizationMeta {
 9:   [featureName: string]: {
10:     originalMin: number;
11:     originalMax: number;
12:     wasNormalized: boolean;
13:   };
14: }
15: 
16: export interface ChromaData {
17:   time: number;
18:   pitch: number;
19:   confidence: number;
20:   chroma: number[];
21: }
22: 
23: export interface WaveformData {
24:   points: number[];
25:   sampleRate: number;
26:   duration: number;
27:   markers: Array<{ time: number; type: 'beat' | 'onset' | 'peak' | 'drop'; intensity: number; frequency?: number }>;
28: }
29: 
30: export interface AudioAnalysisData {
31:   id: string;
32:   fileMetadataId: string;
33:   stemType: string;
34: 
35:   analysisData: {
36:     frameTimes?: Float32Array | number[];
37:     rms: Float32Array | number[];
38:     loudness: Float32Array | number[];
39:     spectralCentroid: Float32Array | number[];
40:     spectralRolloff?: Float32Array | number[];
41:     spectralFlatness?: Float32Array | number[];
42:     zcr?: Float32Array | number[];
43: 
44:     fft: Float32Array | number[];
45:     fftFrequencies?: Float32Array | number[];
46:     amplitudeSpectrum?: Float32Array | number[];
47: 
48:     volume?: Float32Array | number[];
49:     bass?: Float32Array | number[];
50:     mid?: Float32Array | number[];
51:     treble?: Float32Array | number[];
52:     features?: Float32Array | number[];
53:     markers?: Float32Array | number[];
54:     frequencies?: Float32Array | number[];
55:     timeData?: Float32Array | number[];
56: 
57:     stereoWindow_left?: Float32Array | number[];
58:     stereoWindow_right?: Float32Array | number[];
59: 
60:     transients?: TransientData[];
61:     chroma?: ChromaData[];
62: 
63:     // Optional scalar BPM when detected and persisted
64:     bpm?: number;
65: 
66:     // Normalization metadata for time-series features
67:     normalizationMeta?: FeatureNormalizationMeta;
68:   };
69: 
70:   waveformData: WaveformData;
71: 
72:   metadata: {
73:     sampleRate: number;
74:     duration: number;
75:     bufferSize: number;
76:     featuresExtracted: string[];
77:     analysisDuration: number;
78:     bpm?: number;
79:   };
80: 
81:   // Optional convenience duplication for quick access
82:   bpm?: number;
83: }
```

## File: apps/web/src/types/video-composition.ts
```typescript
 1: import type { AudioAnalysisData, LiveMIDIData } from './visualizer';
 2: 
 3: export interface AudioBinding {
 4:   feature: keyof AudioAnalysisData;
 5:   inputRange: [number, number];
 6:   outputRange: [number, number];
 7:   blendMode: 'add' | 'multiply' | 'replace';
 8:   modulationAmount?: number; // 0-1, default 1.0 (100%)
 9: }
10: 
11: export interface MIDIBinding {
12:   source: 'velocity' | 'cc' | 'pitchBend' | 'channelPressure';
13:   inputRange: [number, number];
14:   outputRange: [number, number];
15:   blendMode: 'add' | 'multiply' | 'replace';
16: }
17: 
18: export interface Layer {
19:   id: string;
20:   name: string;
21:   isDeletable?: boolean;
22:   type: LayerType;
23:   src?: string;
24:   effectType?: EffectType;
25:   settings?: any;
26:   position: { x: number; y: number };
27:   scale: { x: number; y: number };
28:   rotation: number;
29:   opacity: number;
30:   audioBindings: AudioBinding[];
31:   midiBindings: MIDIBinding[];
32:   zIndex: number;
33:   blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
34:   startTime: number;
35:   endTime: number;
36:   duration: number;
37: }
38: 
39: export type OverlayType =
40:   | 'waveform'
41:   | 'spectrogram'
42:   | 'peakMeter'
43:   | 'stereometer'
44:   | 'oscilloscope'
45:   | 'spectrumAnalyzer'
46:   | 'vuMeter'
47:   | 'chromaWheel'
48:   | 'consoleFeed';
49: 
50: export type EffectType =
51:   | 'metaballs'
52:   | 'particles'
53:   | 'particleNetwork'
54:   | 'bloom'
55:   | 'imageSlideshow'
56:   | OverlayType;
57: 
58: export type LayerType = 'video' | 'image' | 'effect' | 'overlay';
59: 
60: export interface VideoComposition {
61:   id: string;
62:   projectId: string;
63:   name: string;
64:   layers: Layer[];
65:   width: number;
66:   height: number;
67:   duration: number;
68:   fps: number;
69:   createdAt: Date;
70:   updatedAt: Date;
71: }
72: 
73: export interface LayerClip {
74:   id: string;
75:   layerId: string;
76:   startTime: number;
77:   endTime: number;
78:   parameters: Record<string, any>;
79: }
80: 
81: export interface CompositionTimeline {
82:   duration: number;
83:   currentTime: number;
84:   isPlaying: boolean;
85:   layers: Layer[];
86:   clips: LayerClip[];
87: }
```

## File: apps/web/src/lib/visualizer/effects/BaseShaderEffect.ts
```typescript
  1: import * as THREE from 'three';
  2: import { VisualEffect } from '@/types/visualizer';
  3: import { debugLog } from '@/lib/utils';
  4: import { MultiLayerCompositor } from '../core/MultiLayerCompositor';
  5: 
  6: /**
  7:  * Abstract base class for shader-based visual effects.
  8:  * Provides common functionality for full-screen post-processing effects.
  9:  */
 10: export abstract class BaseShaderEffect implements VisualEffect {
 11:     abstract id: string;
 12:     abstract name: string;
 13:     abstract description: string;
 14:     enabled: boolean = true;
 15:     abstract parameters: Record<string, any>;
 16: 
 17:     protected scene: THREE.Scene;
 18:     protected camera: THREE.OrthographicCamera;
 19:     protected material!: THREE.ShaderMaterial;
 20:     protected mesh!: THREE.Mesh;
 21:     protected uniforms!: Record<string, THREE.IUniform>;
 22:     protected renderer!: THREE.WebGLRenderer;
 23:     protected compositor?: MultiLayerCompositor;
 24:     protected layerId?: string;
 25: 
 26:     constructor() {
 27:         this.scene = new THREE.Scene();
 28:         this.scene.background = null; // Transparent for layer compositing
 29:         this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
 30:     }
 31: 
 32:     /**
 33:      * Set the compositor and layer ID to pull texture from layers beneath
 34:      */
 35:     public setCompositor(compositor: MultiLayerCompositor, layerId: string): void {
 36:         this.compositor = compositor;
 37:         this.layerId = layerId;
 38:     }
 39: 
 40:     /**
 41:      * Override this to define custom uniforms beyond the standard ones
 42:      */
 43:     protected abstract getCustomUniforms(): Record<string, THREE.IUniform>;
 44: 
 45:     /**
 46:      * Override this to provide the fragment shader code
 47:      */
 48:     protected abstract getFragmentShader(): string;
 49: 
 50:     /**
 51:      * Standard vertex shader (can be overridden if needed)
 52:      */
 53:     protected getVertexShader(): string {
 54:         return `
 55:       varying vec2 vUv;
 56:       
 57:       void main() {
 58:         vUv = uv;
 59:         gl_Position = vec4(position, 1.0);
 60:       }
 61:     `;
 62:     }
 63: 
 64:     /**
 65:      * Set up standard uniforms + custom uniforms
 66:      */
 67:     protected setupUniforms(): void {
 68:         const size = this.renderer ? this.renderer.getSize(new THREE.Vector2()) : new THREE.Vector2(1024, 1024);
 69: 
 70:         // Standard uniforms available to all shader effects
 71:         this.uniforms = {
 72:             uTexture: { value: null },
 73:             uTime: { value: 0.0 },
 74:             uResolution: { value: new THREE.Vector2(size.x, size.y) },
 75:             uMousePos: { value: new THREE.Vector2(0.5, 0.5) },
 76:             ...this.getCustomUniforms()
 77:         };
 78:     }
 79: 
 80:     /**
 81:      * Create shader material with error handling
 82:      */
 83:     protected createMaterial(): void {
 84:         try {
 85:             this.material = new THREE.ShaderMaterial({
 86:                 vertexShader: this.getVertexShader(),
 87:                 fragmentShader: this.getFragmentShader(),
 88:                 uniforms: this.uniforms,
 89:                 transparent: true,
 90:                 side: THREE.DoubleSide,
 91:                 depthWrite: false,
 92:                 depthTest: false,
 93:                 toneMapped: false // Prevent ACES Filmic from compressing effect output
 94:             });
 95:         } catch (error) {
 96:             debugLog.error(`❌ ${this.name} shader compilation error:`, error);
 97:             // Fallback to basic material
 98:             this.material = new THREE.MeshBasicMaterial({
 99:                 color: 0xff00ff,
100:                 transparent: true,
101:                 opacity: 0.5
102:             }) as any;
103:         }
104:     }
105: 
106:     /**
107:      * Create full-screen quad mesh
108:      */
109:     protected createMesh(): void {
110:         const geometry = new THREE.PlaneGeometry(2, 2);
111:         this.mesh = new THREE.Mesh(geometry, this.material);
112:         this.mesh.position.set(0, 0, 0);
113:         this.mesh.scale.set(2, 2, 1);
114:         this.scene.add(this.mesh);
115:     }
116: 
117:     /**
118:      * Initialize the effect
119:      */
120:     init(renderer: THREE.WebGLRenderer): void {
121:         this.renderer = renderer;
122:         this.setupUniforms();
123:         this.createMaterial();
124:         this.createMesh();
125:         debugLog.log(`✅ ${this.name} initialized`);
126:     }
127: 
128:     /**
129:      * Update effect - syncs parameters to uniforms and updates source texture
130:      * @param deltaTime - Time delta in seconds (for live editor mode, increments uTime)
131:      */
132:     update(deltaTime: number): void {
133:         if (!this.enabled || !this.uniforms) return;
134: 
135:         // Update standard uniforms
136:         // In live editor mode, increment time for smooth animation
137:         this.uniforms.uTime.value += deltaTime;
138: 
139:         if (this.renderer) {
140:             const size = this.renderer.getSize(new THREE.Vector2());
141:             this.uniforms.uResolution.value.set(size.x, size.y);
142:         }
143: 
144:         // Get source texture from compositor (layers beneath)
145:         if (this.compositor && this.layerId) {
146:             const sourceTexture = this.compositor.getAccumulatedTextureBeforeLayer(this.layerId);
147:             if (sourceTexture && this.uniforms.uTexture.value !== sourceTexture) {
148:                 this.uniforms.uTexture.value = sourceTexture;
149:             }
150:         }
151: 
152:         // Sync parameters to uniforms (to be implemented by subclasses)
153:         this.syncParametersToUniforms();
154:     }
155: 
156:     /**
157:      * Update effect with absolute time (for deterministic Remotion rendering)
158:      * This method sets uTime directly instead of incrementing it.
159:      * @param absoluteTime - Absolute time in seconds (frame / fps)
160:      */
161:     updateWithTime(absoluteTime: number): void {
162:         if (!this.enabled || !this.uniforms) return;
163: 
164:         // Set time directly for deterministic behavior
165:         // This ensures the same frame always produces the same visual output
166:         this.uniforms.uTime.value = absoluteTime;
167: 
168:         if (this.renderer) {
169:             const size = this.renderer.getSize(new THREE.Vector2());
170:             this.uniforms.uResolution.value.set(size.x, size.y);
171:         }
172: 
173:         // Get source texture from compositor (layers beneath)
174:         if (this.compositor && this.layerId) {
175:             const sourceTexture = this.compositor.getAccumulatedTextureBeforeLayer(this.layerId);
176:             if (sourceTexture && this.uniforms.uTexture.value !== sourceTexture) {
177:                 this.uniforms.uTexture.value = sourceTexture;
178:             }
179:         }
180: 
181:         // Sync parameters to uniforms (to be implemented by subclasses)
182:         this.syncParametersToUniforms();
183:     }
184: 
185:     /**
186:      * Override this to sync custom parameters to uniforms
187:      */
188:     protected abstract syncParametersToUniforms(): void;
189: 
190:     /**
191:      * Update a single parameter - to be implemented by subclasses
192:      */
193:     abstract updateParameter(paramName: string, value: any): void;
194: 
195:     /**
196:      * Get the scene for rendering
197:      */
198:     getScene(): THREE.Scene {
199:         return this.scene;
200:     }
201: 
202:     /**
203:      * Get the camera for rendering
204:      */
205:     getCamera(): THREE.Camera {
206:         return this.camera;
207:     }
208: 
209:     /**
210:      * Handle window resize
211:      */
212:     resize(width: number, height: number): void {
213:         if (this.uniforms && this.uniforms.uResolution) {
214:             this.uniforms.uResolution.value.set(width, height);
215:         }
216:     }
217: 
218:     /**
219:      * Clean up resources
220:      */
221:     destroy(): void {
222:         if (this.mesh) {
223:             this.scene.remove(this.mesh);
224:             this.mesh.geometry.dispose();
225:             this.material.dispose();
226:         }
227:     }
228: }
```

## File: apps/web/src/lib/export-utils.ts
```typescript
  1: import { useTimelineStore } from '@/stores/timelineStore';
  2: import {
  3:   type FeatureMapping,
  4:   useVisualizerStore,
  5: } from '@/stores/visualizerStore';
  6: import { useProjectSettingsStore } from '@/stores/projectSettingsStore';
  7: import type { RayboxCompositionProps } from '@/remotion/Root';
  8: import type { AudioAnalysisData } from '@/types/audio-analysis-data';
  9: import { DEFAULT_VISUALIZATION_SETTINGS } from 'phonoglyph-types';
 10: import type { VisualizationSettings } from 'phonoglyph-types';
 11: 
 12: /**
 13:  * File object structure expected from project files.
 14:  */
 15: interface ProjectFile {
 16:   id?: string;
 17:   downloadUrl?: string;
 18:   is_master?: boolean;
 19:   file_name?: string;
 20:   file_type?: string;
 21:   upload_status?: string;
 22:   [key: string]: any;
 23: }
 24: 
 25: /**
 26:  * Gathers all project data needed for Remotion export.
 27:  * Actively hydrates layer assets with fresh URLs to ensure the export is self-healing.
 28:  */
 29: export function getProjectExportPayload(
 30:   projectId: string,
 31:   cachedAnalysis: AudioAnalysisData[],
 32:   projectFiles: ProjectFile[],
 33:   stemUrlMap: Record<string, string> = {},
 34: ): RayboxCompositionProps {
 35:   // 1. Get Store State
 36:   const timelineState = useTimelineStore.getState();
 37:   const visualizerState = useVisualizerStore.getState();
 38:   const projectSettings = useProjectSettingsStore.getState();
 39: 
 40:   // 2. Extract and Hydrate Layers
 41:   // Deep clone layers to avoid mutating the active store during hydration
 42:   const rawLayers = timelineState.layers;
 43:   const layers = JSON.parse(JSON.stringify(rawLayers)).map((layer: any) => {
 44:     // Hydrate Image Slideshows with fresh URLs from stemUrlMap
 45:     if (layer.effectType === 'imageSlideshow' && layer.settings) {
 46:       const imageIds = layer.settings.imageIds as string[];
 47: 
 48:       // If we have IDs and a URL map, attempt to resolve fresh URLs
 49:       if (Array.isArray(imageIds) && imageIds.length > 0) {
 50:         const currentImages = layer.settings.images as string[] | undefined;
 51:         // Check if current URLs are old signed URLs (need refresh)
 52:         const hasOldUrls = currentImages?.some(url => 
 53:           url.includes('cloudflarestorage') || 
 54:           url.includes('phonoglyph-uploads') ||
 55:           url.includes('X-Amz-Signature')
 56:         );
 57:         
 58:         const freshImages = imageIds
 59:           .map((id) => stemUrlMap[id]) // Look up fresh direct URL
 60:           .filter(Boolean); // Remove any that failed to resolve
 61: 
 62:         // Always update if we have fresh URLs, or if current URLs are old signed URLs
 63:         if (freshImages.length > 0 || hasOldUrls) {
 64:           // Prefer fresh URLs, but keep existing if fresh ones aren't available yet
 65:           layer.settings.images = freshImages.length > 0 ? freshImages : currentImages;
 66:         }
 67:       }
 68:     }
 69:     return layer;
 70:   });
 71: 
 72:   const mappings: Record<string, FeatureMapping> = visualizerState.mappings;
 73:   const baseParameterValues: Record<string, Record<string, any>> =
 74:     visualizerState.baseParameterValues;
 75:   const featureDecayTimes: Record<string, number> = visualizerState.featureDecayTimes;
 76:   const featureSensitivities: Record<string, number> = visualizerState.featureSensitivities;
 77: 
 78:   type VisualizationSettingsWithAspect = VisualizationSettings & {
 79:     aspectRatio?: string;
 80:   };
 81: 
 82:   const visualizerSettings = (visualizerState as {
 83:     settings?: Partial<VisualizationSettingsWithAspect>;
 84:     aspectRatio?: string;
 85:   }).settings;
 86: 
 87:   const defaultAspectRatio =
 88:     (DEFAULT_VISUALIZATION_SETTINGS as VisualizationSettingsWithAspect)
 89:       .aspectRatio ?? '9:16';
 90: 
 91:   // Prefer the live store aspectRatio (driven by the UI) over anything cached
 92:   const resolvedAspectRatio =
 93:     visualizerState.aspectRatio ??
 94:     visualizerSettings?.aspectRatio ??
 95:     defaultAspectRatio;
 96: 
 97:   const visualizationSettings: VisualizationSettingsWithAspect = {
 98:     ...DEFAULT_VISUALIZATION_SETTINGS,
 99:     ...visualizerSettings,
100:     aspectRatio: resolvedAspectRatio,
101:   };
102: 
103:   const audioAnalysisData = cachedAnalysis;
104: 
105:   // 3. Find Master Audio
106:   let masterAudioUrl = '';
107: 
108:   const masterFile = projectFiles.find((file) => file.is_master === true);
109: 
110:   if (masterFile?.id) {
111:     masterAudioUrl = stemUrlMap[masterFile.id] || '';
112:     if (!masterAudioUrl && masterFile.downloadUrl) {
113:       masterAudioUrl = masterFile.downloadUrl;
114:     }
115:   } else if (projectFiles.length > 0) {
116:     // Fallback: look for audio files
117:     const firstAudioFile = projectFiles.find(
118:       (file) => file.file_type === 'audio' || file.downloadUrl,
119:     );
120: 
121:     if (firstAudioFile?.id) {
122:       masterAudioUrl =
123:         stemUrlMap[firstAudioFile.id] || firstAudioFile.downloadUrl || '';
124:     } else if (firstAudioFile?.downloadUrl) {
125:       masterAudioUrl = firstAudioFile.downloadUrl;
126:     }
127:   }
128: 
129:   // 4. Return Object
130:   return {
131:     layers,
132:     audioAnalysisData,
133:     visualizationSettings,
134:     masterAudioUrl,
135:     mappings,
136:     baseParameterValues,
137:     featureDecayTimes,
138:     featureSensitivities,
139:     backgroundColor: projectSettings.backgroundColor,
140:     isBackgroundVisible: projectSettings.isBackgroundVisible,
141:   };
142: }
```

## File: apps/web/src/remotion/Root.tsx
```typescript
  1: import { type CalculateMetadataFunction, Composition } from 'remotion';
  2: import { RayboxComposition } from './RayboxComposition';
  3: import type { AudioAnalysisData } from '@/types/audio-analysis-data'; // Use the cached type
  4: import type { Layer } from '@/types/video-composition';
  5: import type { VisualizationSettings } from 'phonoglyph-types';
  6: 
  7: type VisualizationSettingsWithAspect = VisualizationSettings & { aspectRatio?: string };
  8: type AspectRatioKey =
  9:   | 'mobile'
 10:   | 'tiktok'
 11:   | 'youtube'
 12:   | 'instagram'
 13:   | 'landscape'
 14:   | '16:9'
 15:   | '9:16'
 16:   | '1:1';
 17: 
 18: const ASPECT_RATIO_DIMENSIONS: Record<AspectRatioKey, { width: number; height: number }> = {
 19:   mobile: { width: 1080, height: 1920 },
 20:   tiktok: { width: 1080, height: 1920 },
 21:   youtube: { width: 1920, height: 1080 },
 22:   instagram: { width: 1080, height: 1080 },
 23:   landscape: { width: 1920, height: 1200 },
 24:   '16:9': { width: 1920, height: 1080 },
 25:   '9:16': { width: 1080, height: 1920 },
 26:   '1:1': { width: 1080, height: 1080 },
 27: };
 28: 
 29: // Robust payload loading: prefer the JSON, fall back to Debug module
 30: // eslint-disable-next-line @typescript-eslint/no-require-imports
 31: let TEST_PAYLOAD: RayboxCompositionProps | null = null;
 32: try {
 33:   const payload = require('./debug-payload.json') as unknown;
 34:   TEST_PAYLOAD = payload as RayboxCompositionProps;
 35: } catch (e) {
 36:   console.warn('⚠️ Could not load debug-payload.json:', e);
 37:   try {
 38:     // eslint-disable-next-line @typescript-eslint/no-require-imports
 39:     const debugModule = require('./Debug') as { TEST_PAYLOAD?: unknown };
 40:     TEST_PAYLOAD = debugModule.TEST_PAYLOAD as RayboxCompositionProps;
 41:   } catch (e2) {
 42:     console.warn('⚠️ Could not load Debug module:', e2);
 43:   }
 44: }
 45: 
 46: export interface RayboxCompositionProps extends Record<string, unknown> {
 47:   layers: Layer[];
 48:   // This contains the full timeline analysis for Master + all Stems
 49:   audioAnalysisData: AudioAnalysisData[];
 50:   visualizationSettings: VisualizationSettingsWithAspect;
 51:   // The only audio track to be rendered in the output
 52:   masterAudioUrl: string;
 53:   // Audio feature mappings for effect parameters
 54:   mappings?: Record<string, { featureId: string | null; modulationAmount: number }>;
 55:   // Base parameter values before modulation
 56:   baseParameterValues?: Record<string, Record<string, any>>;
 57:   // User-configured decay times for peaks features (e.g., "drums-peaks": 0.3)
 58:   featureDecayTimes?: Record<string, number>;
 59:   // User-configured sensitivity for peaks features (e.g., "drums-peaks": 0.5 for 50%)
 60:   // Higher values = keep more transients, lower = filter out quiet ones
 61:   featureSensitivities?: Record<string, number>;
 62:   // URL to fetch analysis data from R2 (used when payload is too large for Lambda)
 63:   analysisUrl?: string;
 64:   // Background color for the visualizer (hex string, e.g. '#1a0033')
 65:   backgroundColor?: string;
 66:   // Whether the background color layer is visible
 67:   isBackgroundVisible?: boolean;
 68: }
 69: 
 70: const defaultProps: RayboxCompositionProps = {
 71:   layers: [],
 72:   audioAnalysisData: [],
 73:   visualizationSettings: {
 74:     colorScheme: 'mixed',
 75:     pixelsPerSecond: 50,
 76:     showTrackLabels: true,
 77:     showVelocity: true,
 78:     minKey: 21,
 79:     maxKey: 108,
 80:   },
 81:   masterAudioUrl: '',
 82: };
 83: 
 84: const resolveAspectRatioDimensions = (
 85:   rawAspectRatio: string | undefined,
 86: ): { width: number; height: number } => {
 87:   if (!rawAspectRatio) {
 88:     return ASPECT_RATIO_DIMENSIONS['9:16'];
 89:   }
 90: 
 91:   const normalized = rawAspectRatio.toLowerCase();
 92: 
 93:   if (normalized in ASPECT_RATIO_DIMENSIONS) {
 94:     return ASPECT_RATIO_DIMENSIONS[normalized as AspectRatioKey];
 95:   }
 96: 
 97:   if (normalized.includes(':')) {
 98:     const [widthPart, heightPart] = normalized.split(':');
 99:     const widthRatio = Number(widthPart);
100:     const heightRatio = Number(heightPart);
101: 
102:     if (
103:       Number.isFinite(widthRatio) &&
104:       Number.isFinite(heightRatio) &&
105:       widthRatio > 0 &&
106:       heightRatio > 0
107:     ) {
108:       if (widthRatio >= heightRatio) {
109:         const width = 1920;
110:         return { width, height: Math.round((heightRatio / widthRatio) * width) };
111:       }
112:       const height = 1920;
113:       return { width: Math.round((widthRatio / heightRatio) * height), height };
114:     }
115:   }
116: 
117:   return ASPECT_RATIO_DIMENSIONS['9:16'];
118: };
119: 
120: const calculateMetadata: CalculateMetadataFunction<RayboxCompositionProps> = async ({
121:   props,
122: }) => {
123:   // FPS is set on the Composition component (30), so we use that value here
124:   const safeFps = 60;
125: 
126:   let finalAudioData = props.audioAnalysisData;
127: 
128:   // If the API gave us a URL because the data was too big for the trigger payload:
129:   if (props.analysisUrl) {
130:     console.log('☁️ Fetching heavy analysis from R2...');
131:     try {
132:       const res = await fetch(props.analysisUrl);
133:       if (!res.ok) {
134:         throw new Error(`Failed to fetch analysis data: ${res.status} ${res.statusText}`);
135:       }
136:       finalAudioData = await res.json();
137:       console.log(`✅ Fetched ${finalAudioData.length} analysis entries from R2`);
138:     } catch (error) {
139:       console.error('❌ Failed to fetch analysis data from R2:', error);
140:       // Fall back to empty array if fetch fails
141:       finalAudioData = [];
142:     }
143:   }
144: 
145:   // Debug logging for payload visibility in the terminal
146:   if (!props.layers || props.layers.length === 0) {
147:     console.log(
148:       '⚠️ calculateMetadata received EMPTY layers. Check debug-payload.json!',
149:     );
150:   } else {
151:     console.log(
152:       `✅ calculateMetadata: ${props.layers.length} layers, Aspect: ${props.visualizationSettings?.aspectRatio}`,
153:     );
154:   }
155: 
156:   const layers = props?.layers ?? [];
157:   const { width, height } = resolveAspectRatioDimensions(
158:     props.visualizationSettings?.aspectRatio,
159:   );
160: 
161:   // Prefer explicit duration on the payload if provided
162:   const durationFromProps = (props as Partial<{ duration?: number }>).duration;
163:   let duration =
164:     typeof durationFromProps === 'number' && !Number.isNaN(durationFromProps)
165:       ? durationFromProps
166:       : undefined;
167: 
168:   // If no explicit duration, derive from the end of the last layer
169:   if (duration == null || Number.isNaN(duration)) {
170:     if (layers.length > 0) {
171:       const layerEndTimes = layers
172:         .map((l) => l.endTime)
173:         .filter((t) => typeof t === 'number' && !Number.isNaN(t));
174: 
175:       if (layerEndTimes.length > 0) {
176:         duration = Math.max(...layerEndTimes);
177:       }
178:     }
179:   }
180: 
181:   // Calculate duration based on the actual data we just fetched
182:   if ((duration == null || !Number.isFinite(duration) || duration <= 0) && finalAudioData.length > 0) {
183:     duration = finalAudioData[0]?.metadata?.duration || 30;
184:   }
185: 
186:   // Default to 30 seconds if we couldn't determine duration
187:   if (duration == null || !Number.isFinite(duration) || duration <= 0) {
188:     duration = 30;
189:   }
190: 
191:   return {
192:     durationInFrames: Math.ceil(duration * safeFps),
193:     width,
194:     height,
195:     props: {
196:       ...props,
197:       audioAnalysisData: finalAudioData, // Inject the data into the component props
198:     },
199:   };
200: };
201: 
202: export const RemotionRoot = () => {
203:   return (
204:     <>
205:       <Composition
206:         id="RayboxMain"
207:         component={RayboxComposition}
208:         fps={60}
209:         width={1080}
210:         height={1920}
211:         defaultProps={defaultProps}
212:         calculateMetadata={calculateMetadata}
213:       />
214:       <Composition
215:         id="Debug"
216:         component={RayboxComposition}
217:         width={1080}
218:         height={1920}
219:         fps={60}
220:         defaultProps={TEST_PAYLOAD ?? defaultProps}
221:         calculateMetadata={calculateMetadata}
222:       />
223:     </>
224:   );
225: };
```

## File: apps/web/remotion.config.ts
```typescript
 1: import { Config } from '@remotion/cli/config';
 2: import path from 'path';
 3: 
 4: console.log('[remotion.config] Loading configuration...');
 5: 
 6: // Set the public path for S3 subfolder deployment
 7: Config.setPublicPath('/sites/raybox-renderer/');
 8: 
 9: Config.overrideWebpackConfig((config) => {
10:   // Resolve the @/ alias to ./src relative to the current working directory (web app root)
11:   const srcPath = path.resolve(process.cwd(), 'src');
12:   
13:   config.resolve = config.resolve || {};
14:   config.resolve.alias = {
15:     ...(config.resolve.alias || {}),
16:     '@': srcPath,
17:   };
18:   
19:   return config;
20: });
21: 
22: // Force software rendering for stability in headless mode (CLI commands only)
23: // swangle is the most stable for environments where hardware acceleration is finicky
24: // Note: This only affects CLI commands. For Lambda, set chromiumOptions.gl in renderMediaOnLambda
25: // For preview, use --gl flag or CHROMIUM_OPENGL_RENDERER environment variable
26: Config.setChromiumOpenGlRenderer('swangle');
27: 
28: // Increase delayRender timeout from default 30s to 120s (2 minutes)
29: // This is needed for loading large payloads and R2 images during initialization
30: Config.setDelayRenderTimeoutInMilliseconds(120000);
31: console.log('[remotion.config] Set delayRender timeout to 120000ms');
```

## File: apps/web/src/lib/visualizer/core/MultiLayerCompositor.ts
```typescript
  1: import * as THREE from 'three';
  2: import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
  3: import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
  4: import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
  5: import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
  6: import { TexturePass } from 'three/examples/jsm/postprocessing/TexturePass.js';
  7: 
  8: export interface LayerRenderTarget {
  9:   id: string;
 10:   renderTarget: THREE.WebGLRenderTarget;
 11:   scene: THREE.Scene;
 12:   camera: THREE.Camera;
 13:   enabled: boolean;
 14:   blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'add' | 'subtract';
 15:   opacity: number;
 16:   zIndex: number;
 17:   material?: THREE.ShaderMaterial;
 18: }
 19: 
 20: export interface CompositorConfig {
 21:   width: number;
 22:   height: number;
 23:   enableAntialiasing?: boolean;
 24:   pixelRatio?: number;
 25: }
 26: 
 27: export class MultiLayerCompositor {
 28:   private renderer: THREE.WebGLRenderer;
 29:   private config: CompositorConfig;
 30:   
 31:   // Layer management
 32:   private layers: Map<string, LayerRenderTarget> = new Map();
 33:   private layerOrder: string[] = [];
 34:   
 35:   // Render targets
 36:   private mainRenderTarget: THREE.WebGLRenderTarget;
 37:   private tempRenderTarget: THREE.WebGLRenderTarget;
 38:   private accumulationTargets: Map<string, THREE.WebGLRenderTarget> = new Map();
 39:   
 40:   // Shared geometry for full-screen rendering
 41:   private quadGeometry: THREE.PlaneGeometry;
 42:   private quadCamera: THREE.OrthographicCamera;
 43:   
 44:   // Blend mode shaders
 45:   private blendShaders: Map<string, string> = new Map();
 46: 
 47:   // Post-processing
 48:   private postProcessingComposer!: EffectComposer;
 49:   private texturePass!: TexturePass;
 50:   private fxaaPass?: ShaderPass;
 51:   
 52:   constructor(renderer: THREE.WebGLRenderer, config: CompositorConfig) {
 53:     this.renderer = renderer;
 54:     this.config = {
 55:       enableAntialiasing: true,
 56:       pixelRatio: window.devicePixelRatio || 1,
 57:       ...config
 58:     };
 59:     
 60:     // Ensure transparent clearing for all off-screen targets
 61:     this.renderer.setClearColor(0x000000, 0);
 62:     this.renderer.setClearAlpha(0);
 63: 
 64:     this.mainRenderTarget = this.createRenderTarget();
 65:     this.tempRenderTarget = this.createRenderTarget();
 66:     
 67:     // Create shared geometry and camera
 68:     this.quadGeometry = new THREE.PlaneGeometry(2, 2);
 69:     this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
 70:     
 71:     // Initialize blend mode shaders
 72:     this.initializeBlendShaders();
 73: 
 74:     // Initialize post-processing (bloom, etc.)
 75:     this.initializePostProcessing();
 76:   }
 77:   
 78:   /**
 79:    * Create a new layer
 80:    */
 81:   public createLayer(
 82:     id: string,
 83:     scene: THREE.Scene,
 84:     camera: THREE.Camera,
 85:     options: Partial<Omit<LayerRenderTarget, 'id' | 'scene' | 'camera'>> = {}
 86:   ): LayerRenderTarget {
 87:     const renderTarget = this.createRenderTarget();
 88:     
 89:     const layer: LayerRenderTarget = {
 90:       id,
 91:       renderTarget,
 92:       scene,
 93:       camera,
 94:       enabled: true,
 95:       blendMode: 'normal',
 96:       opacity: 1.0,
 97:       zIndex: 0,
 98:       ...options
 99:     };
100:     
101:     this.layers.set(id, layer);
102:     this.layerOrder.push(id);
103:     this.sortLayers();
104:     
105:     return layer;
106:   }
107: 
108:   /**
109:    * Create a render target with standard configuration
110:    */
111:   private createRenderTarget(): THREE.WebGLRenderTarget {
112:     const RTClass: any = THREE.WebGLRenderTarget;
113:     return new RTClass(
114:       this.config.width,
115:       this.config.height,
116:       {
117:         format: THREE.RGBAFormat,
118:         type: THREE.UnsignedByteType,
119:         minFilter: THREE.LinearFilter,
120:         magFilter: THREE.LinearFilter,
121:         generateMipmaps: false,
122:         samples: this.config.enableAntialiasing !== false ? 4 : 0
123:       }
124:     );
125:   }
126:   
127:   /**
128:    * Remove a layer
129:    */
130:   public removeLayer(id: string): void {
131:     const layer = this.layers.get(id);
132:     if (layer) {
133:       layer.renderTarget.dispose();
134:       this.layers.delete(id);
135:       this.layerOrder = this.layerOrder.filter(layerId => layerId !== id);
136:     }
137:     
138:     const accTarget = this.accumulationTargets.get(id);
139:     if (accTarget) {
140:       accTarget.dispose();
141:       this.accumulationTargets.delete(id);
142:     }
143:   }
144:   
145:   /**
146:    * Update layer properties
147:    */
148:   public updateLayer(id: string, updates: Partial<LayerRenderTarget>): void {
149:     const layer = this.layers.get(id);
150:     if (layer) {
151:       Object.assign(layer, updates);
152:       if (updates.zIndex !== undefined) {
153:         this.sortLayers();
154:       }
155:     }
156:   }
157:   
158:   /**
159:    * Sort layers by z-index
160:    */
161:   private sortLayers(): void {
162:     this.layerOrder.sort((a, b) => {
163:       const layerA = this.layers.get(a);
164:       const layerB = this.layers.get(b);
165:       return (layerA?.zIndex || 0) - (layerB?.zIndex || 0);
166:     });
167:   }
168:   
169:   /**
170:    * Main render method
171:    */
172:   public render(): void {
173:     // Step 1: Render each layer to its render target
174:     // IMPORTANT: For layers that depend on accumulated textures from layers below
175:     // (e.g., bloom, ASCII filter), we must refresh their accumulation targets
176:     // AFTER the prior layers have been rendered, so they read current-frame data
177:     // instead of stale previous-frame data.
178:     let renderedLayers = 0;
179:     for (const layerId of this.layerOrder) {
180:       const layer = this.layers.get(layerId);
181:       if (!layer || !layer.enabled) continue;
182: 
183:       // If this layer has an accumulation target (it reads from layers below),
184:       // refresh it now using the freshly-rendered prior layers' render targets
185:       if (this.accumulationTargets.has(layerId)) {
186:         this.refreshAccumulationTarget(layerId);
187:       }
188: 
189:       this.renderer.setRenderTarget(layer.renderTarget);
190:       // Clear color/depth/stencil with transparent background
191:       this.renderer.clear(true, true, true);
192:       this.renderer.render(layer.scene, layer.camera);
193:       renderedLayers++;
194:     }
195:     
196:     if (renderedLayers === 0) {
197:       console.warn('⚠️ [MultiLayerCompositor] No layers rendered!');
198:     }
199:     
200:     // Step 2: Composite layers using GPU shaders
201:     this.compositeLayersToMain();
202:     
203:     // Step 3: Post-processing chain and final output
204:     // Update the texture pass input to the composited target
205:     this.texturePass.map = this.mainRenderTarget.texture;
206:     
207:     // Save autoClear state and disable it temporarily
208:     const autoClear = this.renderer.autoClear;
209:     this.renderer.autoClear = false;
210:     
211:     this.renderer.setRenderTarget(null);
212:     
213:     // CRITICAL: Clear canvas with transparency before post-processing renders
214:     this.renderer.clear(true, true, true);
215:     
216:     this.postProcessingComposer.render();
217:     
218:     // Restore autoClear state
219:     this.renderer.autoClear = autoClear;
220:   }
221:   
222:   /**
223:    * Composite all layers to main render target
224:    */
225:   private compositeLayersToMain(): void {
226:     // 1. Save the renderer's current autoClear state
227:     const autoClear = this.renderer.autoClear;
228:     // 2. CRITICAL: Disable auto clearing for the compositing process
229:     this.renderer.autoClear = false;
230: 
231:     this.renderer.setRenderTarget(this.mainRenderTarget);
232:     
233:     // 3. Perform a single, manual clear at the very beginning
234:     this.renderer.clear(true, true, true);
235:     
236:     // 4. Composite layers in order. Now, each render will draw ON TOP of the previous one.
237:     for (const layerId of this.layerOrder) {
238:       const layer = this.layers.get(layerId);
239:       if (!layer || !layer.enabled) continue;
240:       
241:       this.renderLayerWithBlending(layer);
242:     }
243: 
244:     // 5. Restore the original autoClear state for other rendering operations
245:     this.renderer.autoClear = autoClear;
246:   }
247:   
248:   /**
249:    * Render a single layer with blending
250:    */
251:   private renderLayerWithBlending(layer: LayerRenderTarget): void {
252:     const blendShader = this.getBlendModeShader(layer.blendMode);
253:     
254:     // Determine THREE.js blending mode based on layer blend mode
255:     let blendMode: THREE.Blending = THREE.NormalBlending;
256:     if (layer.blendMode === 'add') {
257:       blendMode = THREE.AdditiveBlending as THREE.Blending;
258:     } else if (layer.blendMode === 'multiply') {
259:       blendMode = THREE.MultiplyBlending as THREE.Blending;
260:     } else if (layer.blendMode === 'screen') {
261:       blendMode = THREE.CustomBlending as THREE.Blending;
262:     }
263:     
264:     const material = new THREE.ShaderMaterial({
265:       vertexShader: `
266:         varying vec2 vUv;
267:         void main() {
268:           vUv = uv;
269:           gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
270:         }
271:       `,
272:       fragmentShader: blendShader,
273:       uniforms: {
274:         tDiffuse: new THREE.Uniform(layer.renderTarget.texture),
275:         opacity: new THREE.Uniform(layer.opacity)
276:       },
277:       transparent: true,
278:       blending: blendMode,
279:       depthTest: false,
280:       depthWrite: false,
281:       premultipliedAlpha: true, // CRITICAL FIX: Changed from false to true for proper alpha blending
282:       toneMapped: false // Intermediate compositing must stay linear - tone map only at final output
283:     });
284:     
285:     const mesh = new THREE.Mesh(this.quadGeometry, material);
286:     const scene = new THREE.Scene();
287:     scene.background = null; // Ensure transparent background
288:     scene.add(mesh);
289:     
290:     this.renderer.render(scene, this.quadCamera);
291:     
292:     // Cleanup
293:     material.dispose();
294:     mesh.geometry.dispose();
295:   }
296:   
297:   // Initialize post-processing chain
298:   private initializePostProcessing(): void {
299:     // Create EffectComposer with alpha support
300:     const renderTarget = new THREE.WebGLRenderTarget(
301:       this.config.width,
302:       this.config.height,
303:       {
304:         format: THREE.RGBAFormat,
305:         type: THREE.UnsignedByteType,
306:         minFilter: THREE.LinearFilter,
307:         magFilter: THREE.LinearFilter,
308:         generateMipmaps: false,
309:         stencilBuffer: false,
310:         depthBuffer: false
311:       }
312:     );
313:     
314:     this.postProcessingComposer = new EffectComposer(this.renderer, renderTarget);
315:     
316:     // CRITICAL: Prevent EffectComposer from clearing our transparent background
317:     this.postProcessingComposer.renderToScreen = true;
318:     
319:     // Feed the composited texture into the composer
320:     this.texturePass = new TexturePass(this.mainRenderTarget.texture);
321:     
322:     // Configure TexturePass material for alpha transparency
323:     if (this.texturePass.material) {
324:       this.texturePass.material.transparent = true;
325:       this.texturePass.material.blending = THREE.NormalBlending;
326:       this.texturePass.material.depthTest = false;
327:       this.texturePass.material.depthWrite = false;
328:     }
329:     
330:     this.postProcessingComposer.addPass(this.texturePass);
331: 
332:     // FXAA to reduce aliasing on lines and sprite edges
333:     // CRITICAL FIX: Create alpha-preserving version of FXAAShader
334:     const AlphaPreservingFXAAShader = {
335:       uniforms: THREE.UniformsUtils.clone(FXAAShader.uniforms), // Properly clone uniforms as THREE.Uniform objects
336:       vertexShader: FXAAShader.vertexShader,
337:       fragmentShader: FXAAShader.fragmentShader.replace(
338:         // The original shader discards alpha. Find this line:
339:         'gl_FragColor = vec4( rgb, luma );',
340:         // And replace it with a version that preserves the original alpha:
341:         'gl_FragColor = vec4( rgb, texture2D( tDiffuse, vUv ).a );'
342:       )
343:     };
344:     
345:     // Use the alpha-preserving shader
346:     this.fxaaPass = new ShaderPass(AlphaPreservingFXAAShader);
347:     const pixelRatio = this.renderer.getPixelRatio();
348:     this.fxaaPass.uniforms['resolution'].value.set(1 / (this.config.width * pixelRatio), 1 / (this.config.height * pixelRatio));
349:     
350:     // Critical: Configure FXAA pass material to preserve alpha
351:     if (this.fxaaPass.material) {
352:       this.fxaaPass.material.transparent = true;
353:       this.fxaaPass.material.blending = THREE.NormalBlending;
354:       this.fxaaPass.material.depthTest = false;
355:       this.fxaaPass.material.depthWrite = false;
356:     }
357:     
358:     this.postProcessingComposer.addPass(this.fxaaPass);
359:   }
360:   
361:   /**
362:    * Initialize blend mode shaders
363:    */
364:   private initializeBlendShaders(): void {
365:     this.blendShaders.set('normal', `
366:       uniform sampler2D tDiffuse;
367:       uniform float opacity;
368:       varying vec2 vUv;
369:       
370:       void main() {
371:         vec4 texel = texture2D(tDiffuse, vUv);
372:         gl_FragColor = vec4(texel.rgb, texel.a * opacity);
373:       }
374:     `);
375:     
376:     this.blendShaders.set('multiply', `
377:       uniform sampler2D tDiffuse;
378:       uniform float opacity;
379:       varying vec2 vUv;
380:       
381:       void main() {
382:         vec4 texel = texture2D(tDiffuse, vUv);
383:         gl_FragColor = vec4(texel.rgb * texel.rgb, texel.a * opacity);
384:       }
385:     `);
386:     
387:     this.blendShaders.set('screen', `
388:       uniform sampler2D tDiffuse;
389:       uniform float opacity;
390:       varying vec2 vUv;
391:       
392:       void main() {
393:         vec4 texel = texture2D(tDiffuse, vUv);
394:         gl_FragColor = vec4(1.0 - (1.0 - texel.rgb) * (1.0 - texel.rgb), texel.a * opacity);
395:       }
396:     `);
397:     
398:     this.blendShaders.set('overlay', `
399:       uniform sampler2D tDiffuse;
400:       uniform float opacity;
401:       varying vec2 vUv;
402:       
403:       void main() {
404:         vec4 texel = texture2D(tDiffuse, vUv);
405:         vec3 base = vec3(0.5);
406:         vec3 overlay = mix(
407:           2.0 * base * texel.rgb, 
408:           1.0 - 2.0 * (1.0 - base) * (1.0 - texel.rgb), 
409:           step(0.5, base)
410:         );
411:         gl_FragColor = vec4(overlay, texel.a * opacity);
412:       }
413:     `);
414:     
415:     this.blendShaders.set('add', `
416:       uniform sampler2D tDiffuse;
417:       uniform float opacity;
418:       varying vec2 vUv;
419:       
420:       void main() {
421:         vec4 texel = texture2D(tDiffuse, vUv);
422:         gl_FragColor = vec4(texel.rgb + texel.rgb, texel.a * opacity);
423:       }
424:     `);
425:     
426:     this.blendShaders.set('subtract', `
427:       uniform sampler2D tDiffuse;
428:       uniform float opacity;
429:       varying vec2 vUv;
430:       
431:       void main() {
432:         vec4 texel = texture2D(tDiffuse, vUv);
433:         gl_FragColor = vec4(max(texel.rgb - texel.rgb, 0.0), texel.a * opacity);
434:       }
435:     `);
436:   }
437:   
438:   /**
439:    * Get blend mode shader
440:    */
441:   private getBlendModeShader(blendMode: string): string {
442:     return this.blendShaders.get(blendMode) || this.blendShaders.get('normal')!;
443:   }
444:   
445:   /**
446:    * Get layer by ID
447:    */
448:   public getLayer(id: string): LayerRenderTarget | undefined {
449:     return this.layers.get(id);
450:   }
451:   
452:   /**
453:    * Get all layer IDs
454:    */
455:   public getLayerIds(): string[] {
456:     return [...this.layerOrder];
457:   }
458: 
459:   /**
460:    * Refresh an accumulation target using the freshly-rendered layer render targets.
461:    * Called during render() AFTER prior layers have been rendered to their render targets,
462:    * ensuring the accumulation uses current-frame data instead of stale previous-frame data.
463:    * This fixes bloom/filter effects showing one-frame-behind content in Lambda renders.
464:    */
465:   private refreshAccumulationTarget(layerId: string): void {
466:     const targetIndex = this.layerOrder.indexOf(layerId);
467:     if (targetIndex <= 0) return;
468: 
469:     const accumulationTarget = this.accumulationTargets.get(layerId);
470:     if (!accumulationTarget) return;
471: 
472:     const previousRenderTarget = this.renderer.getRenderTarget();
473:     const autoClear = this.renderer.autoClear;
474:     this.renderer.autoClear = false;
475: 
476:     this.renderer.setRenderTarget(accumulationTarget);
477:     this.renderer.clear(true, true, true);
478: 
479:     for (let i = 0; i < targetIndex; i++) {
480:       const prevLayerId = this.layerOrder[i];
481:       const layer = this.layers.get(prevLayerId);
482:       if (!layer || !layer.enabled) continue;
483:       this.renderLayerWithBlending(layer);
484:     }
485: 
486:     this.renderer.setRenderTarget(previousRenderTarget);
487:     this.renderer.autoClear = autoClear;
488:   }
489: 
490:   /**
491:    * Get the accumulated texture from all layers before a specific layer
492:    * This composites all layers up to (but not including) the target layer
493:    *
494:    * FIXED: Uses a unique render target for each requesting layer ID.
495:    * This prevents feedback loops where multiple layers sharing 'tempRenderTarget'
496:    * overwrite each other's input textures within the same frame.
497:    */
498:   public getAccumulatedTextureBeforeLayer(layerId: string): THREE.Texture | null {
499:     const targetIndex = this.layerOrder.indexOf(layerId);
500:     if (targetIndex === -1 || targetIndex === 0) {
501:       // Layer not found or it's the first layer, return null (no previous layers)
502:       return null;
503:     }
504: 
505:     let accumulationTarget = this.accumulationTargets.get(layerId);
506:     if (!accumulationTarget) {
507:       accumulationTarget = this.createRenderTarget();
508:       this.accumulationTargets.set(layerId, accumulationTarget);
509:     }
510: 
511:     const previousRenderTarget = this.renderer.getRenderTarget();
512:     const autoClear = this.renderer.autoClear;
513:     this.renderer.autoClear = false;
514: 
515:     this.renderer.setRenderTarget(accumulationTarget);
516:     this.renderer.clear(true, true, true);
517: 
518:     for (let i = 0; i < targetIndex; i++) {
519:       const prevLayerId = this.layerOrder[i];
520:       const layer = this.layers.get(prevLayerId);
521:       if (!layer || !layer.enabled) continue;
522:       this.renderLayerWithBlending(layer);
523:     }
524: 
525:     this.renderer.setRenderTarget(previousRenderTarget);
526:     this.renderer.autoClear = autoClear;
527: 
528:     return accumulationTarget.texture;
529:   }
530:   
531:   /**
532:    * Resize render targets
533:    */
534:   public resize(width: number, height: number): void {
535:     this.config.width = width;
536:     this.config.height = height;
537:     
538:     // Resize all render targets
539:     this.mainRenderTarget.setSize(width, height);
540:     this.tempRenderTarget.setSize(width, height);
541:     for (const target of this.accumulationTargets.values()) {
542:       target.setSize(width, height);
543:     }
544:     
545:     // Resize layer render targets
546:     for (const layer of this.layers.values()) {
547:       layer.renderTarget.setSize(width, height);
548:     }
549: 
550:     // Resize post-processing
551:     if (this.postProcessingComposer) {
552:       this.postProcessingComposer.setSize(width, height);
553:     }
554:     if (this.fxaaPass) {
555:       const pixelRatio = this.renderer.getPixelRatio();
556:       (this.fxaaPass.uniforms as any).resolution.value.set(1 / (width * pixelRatio), 1 / (height * pixelRatio));
557:     }
558:   }
559:   
560:   /**
561:    * Dispose of resources
562:    */
563:   public dispose(): void {
564:     this.mainRenderTarget.dispose();
565:     this.tempRenderTarget.dispose();
566:     
567:     for (const layer of this.layers.values()) {
568:       layer.renderTarget.dispose();
569:     }
570:     
571:     for (const target of this.accumulationTargets.values()) {
572:       target.dispose();
573:     }
574:     this.accumulationTargets.clear();
575:     
576:     this.quadGeometry.dispose();
577:     this.layers.clear();
578:     this.layerOrder = [];
579:   }
580: }
```

## File: apps/web/src/remotion/RemotionOverlayRenderer.tsx
```typescript
  1: import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
  2: import { useCurrentFrame, useVideoConfig, delayRender, continueRender } from 'remotion';
  3: import { HudOverlay } from '@/components/hud/HudOverlay';
  4: import type { Layer } from '@/types/video-composition';
  5: import type { AudioAnalysisData as CachedAudioAnalysisData } from '@/types/audio-analysis-data';
  6: import { extractAudioDataAtTime } from './RayboxComposition';
  7: 
  8: type RemotionOverlayRendererProps = {
  9:   layers: Layer[];
 10:   audioAnalysisData: CachedAudioAnalysisData[];
 11:   masterAudioUrl?: string;
 12: };
 13: 
 14: // Helper: get feature keys for overlay type (copied from HudOverlayManager)
 15: function getFeatureKeyForOverlay(type: string): string[] {
 16:   switch (type) {
 17:     case 'waveform':
 18:     case 'oscilloscope':
 19:       return ['rms', 'loudness'];
 20:     case 'spectrogram':
 21:     case 'spectrumAnalyzer':
 22:       return ['fft', 'spectralCentroid', 'rms', 'loudness'];
 23:     case 'peakMeter':
 24:       return ['rms', 'loudness'];
 25:     case 'stereometer':
 26:       return ['spectralCentroid', 'rms'];
 27:     case 'vuMeter':
 28:       return ['rms', 'loudness'];
 29:     case 'chromaWheel':
 30:       return ['chroma', 'rms'];
 31:     default:
 32:       return ['rms'];
 33:   }
 34: }
 35: 
 36: /**
 37:  * Extract a stereo window from a decoded AudioBuffer at a given time.
 38:  * Mirrors the live preview's getStereoWindow() from use-stem-audio-controller.ts
 39:  * so the stereometer shows identical real audio data in Lambda renders.
 40:  */
 41: function extractStereoWindow(
 42:   buffer: AudioBuffer,
 43:   currentTime: number,
 44:   windowSize: number = 1024,
 45: ): { left: number[]; right: number[] } | null {
 46:   const sampleRate = buffer.sampleRate;
 47:   const playbackTime = buffer.duration > 0 ? currentTime % buffer.duration : 0;
 48:   const currentSample = Math.floor(playbackTime * sampleRate);
 49:   const start = currentSample - windowSize;
 50:   const end = currentSample;
 51:   const numChannels = buffer.numberOfChannels;
 52: 
 53:   const extractChannel = (channelData: Float32Array): number[] => {
 54:     if (start < 0) {
 55:       // Wrap around buffer start
 56:       const fromEnd = Array.from(channelData.slice(buffer.length + start, buffer.length));
 57:       const fromStart = Array.from(channelData.slice(0, end));
 58:       return fromEnd.concat(fromStart);
 59:     } else if (end > buffer.length) {
 60:       // Wrap around buffer end
 61:       const beforeWrap = Array.from(channelData.slice(start, buffer.length));
 62:       const afterWrap = Array.from(channelData.slice(0, end - buffer.length));
 63:       return beforeWrap.concat(afterWrap);
 64:     } else {
 65:       return Array.from(channelData.slice(start, end));
 66:     }
 67:   };
 68: 
 69:   const leftChannel = buffer.getChannelData(0);
 70:   const left = extractChannel(leftChannel);
 71: 
 72:   let right: number[];
 73:   if (numChannels >= 2) {
 74:     const rightChannel = buffer.getChannelData(1);
 75:     right = extractChannel(rightChannel);
 76:   } else {
 77:     // Mono: duplicate to both channels (same as live preview)
 78:     right = [...left];
 79:   }
 80: 
 81:   return { left, right };
 82: }
 83: 
 84: export const RemotionOverlayRenderer: React.FC<RemotionOverlayRendererProps> = ({
 85:   layers,
 86:   audioAnalysisData,
 87:   masterAudioUrl,
 88: }) => {
 89:   // Use Remotion's hook directly - this gets the frame value during render
 90:   const frame = useCurrentFrame();
 91:   const { fps, durationInFrames, width: videoWidth, height: videoHeight } = useVideoConfig();
 92:   const videoDuration = fps > 0 ? durationInFrames / fps : 30; // Fallback to 30s if no duration
 93:   const currentTime = fps > 0 ? frame / fps : 0;
 94:   const cachedAnalysis = audioAnalysisData as CachedAudioAnalysisData[];
 95: 
 96:   // Decode the master audio to an AudioBuffer for real stereo data (stereometer).
 97:   // This runs once on mount, cached across all frames within this Lambda chunk.
 98:   const audioBufferRef = useRef<AudioBuffer | null>(null);
 99:   const [audioReady, setAudioReady] = useState(!masterAudioUrl);
100:   const [delayHandle] = useState(() => {
101:     // Only delay render if we have a stereometer overlay and a master audio URL
102:     const hasStereometer = layers.some(l => l.type === 'overlay' && l.effectType === 'stereometer');
103:     if (hasStereometer && masterAudioUrl) {
104:       return delayRender('Decoding master audio for stereometer');
105:     }
106:     return null;
107:   });
108: 
109:   useEffect(() => {
110:     if (!masterAudioUrl || delayHandle === null) return;
111: 
112:     let cancelled = false;
113: 
114:     (async () => {
115:       try {
116:         const response = await fetch(masterAudioUrl);
117:         const arrayBuffer = await response.arrayBuffer();
118:         // OfflineAudioContext is available in headless Chrome (Lambda)
119:         const offlineCtx = new OfflineAudioContext(2, 1, 44100);
120:         const decoded = await offlineCtx.decodeAudioData(arrayBuffer);
121:         if (!cancelled) {
122:           audioBufferRef.current = decoded;
123:           setAudioReady(true);
124:           continueRender(delayHandle);
125:         }
126:       } catch (err) {
127:         console.error('Failed to decode master audio for stereometer:', err);
128:         if (!cancelled) {
129:           setAudioReady(true);
130:           continueRender(delayHandle);
131:         }
132:       }
133:     })();
134: 
135:     return () => { cancelled = true; };
136:   }, [masterAudioUrl, delayHandle]);
137: 
138:   const overlayLayers = useMemo(
139:     () => layers.filter((layer) => layer.type === 'overlay'),
140:     [layers],
141:   );
142: 
143:   const activeOverlays = useMemo(
144:     () =>
145:       overlayLayers.filter(
146:         (layer) =>
147:           currentTime >= (layer.startTime ?? 0) &&
148:           currentTime <= (layer.endTime ?? Number.POSITIVE_INFINITY),
149:       ),
150:     [overlayLayers, currentTime],
151:   );
152: 
153:   // Compute feature data for an overlay layer – adapted from HudOverlayManager,
154:   // but using cached audio analysis + extractAudioDataAtTime instead of audioController hooks.
155:   const getFeatureDataForOverlay = useCallback(
156:     (layer: Layer) => {
157:       const settings = (layer as any).settings || {};
158:       const stemId = settings.stemId || settings.stem?.id;
159:       const overlayType = layer.effectType as string;
160: 
161:       if (cachedAnalysis.length === 0) {
162:         return null;
163:       }
164:       // Stereometer can synthesise data without a stemId — use master stem as fallback.
165:       // All other overlay types need a valid stemId to look up their analysis data.
166:       if (!stemId && overlayType !== 'stereometer') {
167:         return null;
168:       }
169: 
170:       // Find the analysis for this stem
171:       let analysis = stemId ? cachedAnalysis.find((a) => a.fileMetadataId === stemId) : null;
172: 
173:       // FALLBACK: If strict ID match fails, try matching by stemType
174:       if (!analysis) {
175:         const requestedStemType = settings.stemType || 'master';
176:         analysis = cachedAnalysis.find(a => a.stemType === requestedStemType);
177:       }
178:       // Last resort for stereometer: use any available analysis
179:       if (!analysis && overlayType === 'stereometer') {
180:         analysis = cachedAnalysis[0] ?? null;
181:       }
182:       if (!analysis || !analysis.analysisData) {
183:         return null;
184:       }
185: 
186:       const featureKeys = getFeatureKeyForOverlay(overlayType);
187: 
188:       const frameTimes = analysis.analysisData.frameTimes as
189:         | Float32Array
190:         | number[]
191:         | undefined;
192:       const derivedDurationFromFrames =
193:         frameTimes && frameTimes.length > 0
194:           ? (frameTimes as any)[frameTimes.length - 1]
195:           : undefined;
196:       const metadataDuration = (analysis as any).metadata?.duration as
197:         | number
198:         | undefined;
199:       const analysisDurationField = (analysis.analysisData as any)
200:         .analysisDuration as number | undefined;
201: 
202:       // FIX: Use videoDuration as ultimate fallback instead of 1 second
203:       // This prevents overlays from "finishing" immediately and freezing
204:       const analysisDuration =
205:         metadataDuration ?? derivedDurationFromFrames ?? analysisDurationField ?? videoDuration;
206:       const progress = Math.max(0, Math.min(currentTime / analysisDuration, 1));
207: 
208:       // For spectrum overlays
209:       if (overlayType === 'spectrogram' || overlayType === 'spectrumAnalyzer') {
210:         // Use the shared extractor to get the FFT data for the current time
211:         const extracted = extractAudioDataAtTime(
212:           cachedAnalysis,
213:           analysis.fileMetadataId,
214:           currentTime,
215:           analysis.stemType,
216:         );
217: 
218:         if (extracted?.frequencies?.length) {
219:           // For spectrogram, we might want a buffer, but for now let's return the current frame
220:           // If the overlay needs a buffer, it should manage it or we need to reconstruct it here
221:           // properly. However, the issue described is "static" rendering, which usually means
222:           // the data isn't updating. Returning the correct frame data fixes that.
223: 
224:           // If the component expects a buffer (history), we can try to generate a small one
225:           // by sampling previous frames, but for a single frame render, just the current
226:           // FFT is the most critical part.
227: 
228:           // Let's look at how HudOverlay uses this. It likely expects 'fft' to be the current frame.
229:           // The previous code was generating a fake buffer.
230: 
231:           // Let's reconstruct a small buffer by sampling backwards if needed, 
232:           // but primarily ensure 'fft' is correct.
233: 
234:           const buffer: Array<Float32Array> = [];
235:           // Sample a few frames back to give some history if needed
236:           const numHistoryFrames = 5;
237:           for (let i = numHistoryFrames; i >= 0; i--) {
238:             const t = currentTime - (i * 0.05); // 50ms steps
239:             const histExtracted = extractAudioDataAtTime(
240:               cachedAnalysis,
241:               analysis.fileMetadataId,
242:               Math.max(0, t),
243:               analysis.stemType
244:             );
245:             if (histExtracted?.frequencies) {
246:               buffer.push(new Float32Array(histExtracted.frequencies));
247:             } else {
248:               buffer.push(new Float32Array(extracted.frequencies.length).fill(0));
249:             }
250:           }
251: 
252:           return {
253:             fft: new Float32Array(extracted.frequencies),
254:             fftBuffer: buffer,
255:           };
256:         }
257: 
258:         return null;
259:       }
260: 
261:       // For stereometer: Extract real stereo channel data from the decoded AudioBuffer.
262:       // This mirrors the live preview's getStereoWindow() from use-stem-audio-controller.ts —
263:       // reading actual left/right PCM samples from the audio file at the current playback time.
264:       if (overlayType === 'stereometer') {
265:         if (audioBufferRef.current) {
266:           const stereoWindow = extractStereoWindow(audioBufferRef.current, currentTime, 1024);
267:           if (stereoWindow) {
268:             return { stereoWindow };
269:           }
270:         }
271:         return null;
272:       }
273: 
274:       // For consoleFeed: Use time-domain window as raw audio buffer
275:       if (overlayType === 'consoleFeed') {
276:         const extracted = extractAudioDataAtTime(
277:           cachedAnalysis,
278:           analysis.fileMetadataId,
279:           currentTime,
280:           analysis.stemType,
281:         );
282: 
283:         if (extracted?.timeData?.length) {
284:           return { audioBuffer: extracted.timeData };
285:         }
286: 
287:         return null;
288:       }
289: 
290:       // For chroma wheel – use cached chroma data directly
291:       if (overlayType === 'chromaWheel') {
292:         if (analysis.analysisData.chroma && Array.isArray(analysis.analysisData.chroma)) {
293:           return { chroma: analysis.analysisData.chroma };
294:         }
295:         return null;
296:       }
297: 
298:       // For VU meter – derive RMS / peak from cached arrays
299:       if (overlayType === 'vuMeter') {
300:         let rmsValue = 0;
301:         let peakValue = 0;
302: 
303:         if (analysis.analysisData.rms && Array.isArray(analysis.analysisData.rms)) {
304:           const idx = Math.floor(progress * (analysis.analysisData.rms.length - 1));
305:           rmsValue = analysis.analysisData.rms[idx] || 0;
306:         }
307:         if (analysis.analysisData.loudness && Array.isArray(analysis.analysisData.loudness)) {
308:           const idx = Math.floor(progress * (analysis.analysisData.loudness.length - 1));
309:           peakValue = analysis.analysisData.loudness[idx] || 0;
310:         }
311: 
312:         return { rms: rmsValue, peak: peakValue };
313:       }
314: 
315:       // Generic array-based features (waveform, peakMeter, etc.)
316:       let featureArr: number[] | null = null;
317:       for (const key of featureKeys) {
318:         const arr = (analysis.analysisData as any)[key];
319:         if (arr && Array.isArray(arr) && arr.length > 0) {
320:           featureArr = arr;
321:           break;
322:         }
323:       }
324: 
325:       if (!featureArr) {
326:         // Fallback: try any available array feature
327:         // Note: analysis is already validated above (line 81), so it's guaranteed to be defined here
328:         const availableFeatures = Object.keys(analysis!.analysisData).filter(
329:           (key) =>
330:             Array.isArray((analysis!.analysisData as any)[key]) &&
331:             (analysis!.analysisData as any)[key].length > 0,
332:         );
333:         if (availableFeatures.length > 0) {
334:           featureArr = (analysis!.analysisData as any)[availableFeatures[0]];
335:         }
336:       }
337: 
338:       if (!featureArr) return null;
339: 
340:       const idx = Math.floor(progress * (featureArr.length - 1));
341: 
342:       // For waveform and oscilloscope, return a window of values
343:       if (overlayType === 'waveform' || overlayType === 'oscilloscope') {
344:         const windowSize = 100;
345:         const endIdx = idx + 1;
346:         const startIdx = Math.max(0, endIdx - windowSize);
347:         return featureArr.slice(startIdx, endIdx);
348:       }
349: 
350:       // For peak meter, return single value
351:       if (overlayType === 'peakMeter') {
352:         return featureArr[idx] || 0;
353:       }
354: 
355:       // Default: single scalar
356:       return featureArr[idx];
357:     },
358:     [cachedAnalysis, currentTime],
359:   );
360: 
361:   if (activeOverlays.length === 0) {
362:     return null;
363:   }
364: 
365:   return (
366:     <div
367:       id="remotion-hud-overlays-container"
368:       className="absolute inset-0 pointer-events-none z-20 overflow-hidden"
369:     >
370:       {activeOverlays.map((layer) => {
371:         const featureData = getFeatureDataForOverlay(layer);
372:         return (
373:           <HudOverlay
374:             key={layer.id}
375:             layer={layer}
376:             featureData={featureData}
377:             // Pass video dimensions for headless rendering - avoids 0x0 canvas issue
378:             videoWidth={videoWidth}
379:             videoHeight={videoHeight}
380:             // Pass frame/fps explicitly to avoid calling hooks twice
381:             frame={frame}
382:             fps={fps}
383:             // No-op callbacks: overlays are not editable in Remotion render
384:             onOpenModal={() => { }}
385:             onUpdate={() => { }}
386:             isSelected={false}
387:             isInteractive={false}
388:             onSelect={() => { }}
389:           />
390:         );
391:       })}
392:     </div>
393:   );
394: };
```

## File: apps/web/src/lib/visualizer/core/VisualizerManager.ts
```typescript
   1: import * as THREE from 'three';
   2: import { getRemotionEnvironment } from 'remotion';
   3: import { VisualEffect, VisualizerConfig, LiveMIDIData, AudioAnalysisData, VisualizerControls } from '@/types/visualizer';
   4: import { MultiLayerCompositor } from './MultiLayerCompositor';
   5: import { VisualizationPreset } from '@/types/stem-visualization';
   6: import { debugLog } from '@/lib/utils';
   7: import { AudioTextureManager, AudioFeatureData } from './AudioTextureManager';
   8: import { MediaLayerManager } from './MediaLayerManager';
   9: 
  10: export class VisualizerManager {
  11:   private static instanceCounter = 0;
  12:   private instanceId: number;
  13:   
  14:   private scene!: THREE.Scene;
  15:   private camera!: THREE.PerspectiveCamera;
  16:   private renderer!: THREE.WebGLRenderer;
  17:   private canvas: HTMLCanvasElement;
  18:   private animationId: number | null = null;
  19:   private clock: THREE.Clock;
  20:   
  21:   private effects: Map<string, VisualEffect> = new Map();
  22:   private isPlaying = false;
  23:   private lastTime = 0;
  24:   
  25:   // FIX: Add state to hold timeline data
  26:   private timelineLayers: any[] = [];
  27:   private timelineCurrentTime: number = 0;
  28:   
  29:   // Deterministic rendering state
  30:   private currentFrame: number = 0;
  31:   private currentFPS: number = 60;
  32:   private deterministicTime: number = 0;
  33:   
  34:   // Audio analysis
  35:   private audioContext: AudioContext | null = null;
  36:   private audioSources: AudioBufferSourceNode[] = [];
  37:   private currentAudioBuffer: AudioBuffer | null = null;
  38:   
  39:   // Layered compositor
  40:   private multiLayerCompositor!: MultiLayerCompositor;
  41:   
  42:   // Background color layer
  43:   private backgroundMaterial!: THREE.MeshBasicMaterial;
  44:   private backgroundMesh!: THREE.Mesh;
  45:   
  46:   // GPU compositing system
  47:   private audioTextureManager: AudioTextureManager | null = null;
  48:   private mediaLayerManager: MediaLayerManager | null = null;
  49:   
  50:   // Performance monitoring
  51:   private frameCount = 0;
  52:   private debugFrameCount = 0; // Separate counter for debug logging
  53:   private fps = 60;
  54:   private lastFPSUpdate = 0;
  55:   private consecutiveSlowFrames = 0;
  56:   private maxSlowFrames = 10; // Emergency pause after 10 consecutive slow frames
  57:   
  58:   // Rendering context flag (true when running inside Remotion Lambda)
  59:   private isRenderingContext = false;
  60: 
  61:   // Visualization parameters
  62:   private visualParams = {
  63:     globalScale: 1.0,
  64:     rotationSpeed: 0.0,
  65:     colorIntensity: 1.0,
  66:     emissionIntensity: 1.0,
  67:     positionOffset: 0.0,
  68:     heightScale: 1.0,
  69:     hueRotation: 0.0,
  70:     brightness: 1.0,
  71:     complexity: 0.5,
  72:     particleSize: 1.0,
  73:     opacity: 1.0,
  74:     animationSpeed: 1.0,
  75:     particleCount: 5000
  76:   };
  77:   
  78:   constructor(canvas: HTMLCanvasElement, config: VisualizerConfig) {
  79:     debugLog.log('🎭 VisualizerManager constructor called');
  80:     this.instanceId = ++VisualizerManager.instanceCounter;
  81:     this.canvas = canvas;
  82:     this.clock = new THREE.Clock();
  83:     
  84:     this.initScene(config);
  85:     this.setupEventListeners();
  86:     this.initCompositor(config);
  87:     this.initAudioTextureManager();
  88:     this.initMediaLayerManager();
  89:     debugLog.log('🎭 VisualizerManager constructor complete');
  90:   }
  91:   
  92:   private initScene(config: VisualizerConfig) {
  93:     // Scene setup
  94:     this.scene = new THREE.Scene();
  95:     this.scene.background = null; // Transparent background for proper layer compositing
  96:     this.scene.fog = new THREE.Fog(0x000000, 10, 50);
  97:     
  98:       // Camera setup - use aspect ratio from config if available, otherwise use 1:1
  99:   const initialAspectRatio = config.aspectRatio 
 100:     ? config.aspectRatio.width / config.aspectRatio.height 
 101:     : 1; // Default to square aspect ratio
 102:   
 103:   this.camera = new THREE.PerspectiveCamera(
 104:     75,
 105:     initialAspectRatio,
 106:     0.1,
 107:     1000
 108:   );
 109:     this.camera.position.set(0, 0, 5);
 110:     
 111:     // Renderer setup with error handling and fallbacks
 112:     // Detect if we are currently rendering a video or still
 113:     const isRendering = getRemotionEnvironment().isRendering;
 114:     this.isRenderingContext = isRendering;
 115:     
 116:     try {
 117:       // First, check if canvas already has a context to avoid conflicts
 118:       const existingContext = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
 119:       if (existingContext) {
 120:         debugLog.log('🔄 Found existing WebGL context, will attempt to reuse');
 121:       }
 122:       
 123:       this.renderer = new THREE.WebGLRenderer({
 124:         canvas: this.canvas,
 125:         antialias: !isRendering, // Disable AA during software render for speed
 126:         alpha: true,
 127:         // CRITICAL: Only true during Remotion rendering
 128:         preserveDrawingBuffer: isRendering,
 129:         powerPreference: isRendering ? 'high-performance' : 'default',
 130:         failIfMajorPerformanceCaveat: false // Allow software rendering
 131:       });
 132:       
 133:       // Verify WebGL context was created successfully
 134:       const gl = this.renderer.getContext();
 135:       if (!gl) {
 136:         throw new Error('Failed to create WebGL context. WebGL may not be supported in this environment.');
 137:       }
 138:       
 139:       // Log context version for debugging
 140:       const isWebGL2 = gl instanceof WebGL2RenderingContext;
 141:       debugLog.log('✅ WebGL Renderer created successfully');
 142:       debugLog.log('🔧 WebGL Context:', isWebGL2 ? 'WebGL 2' : 'WebGL 1');
 143:       debugLog.log('🎬 Remotion rendering mode:', isRendering);
 144:     } catch (error) {
 145:       debugLog.error('❌ Primary WebGL renderer failed:', error);
 146:       
 147:       // Try minimal fallback settings
 148:       try {
 149:         debugLog.log('🔄 Attempting fallback renderer with minimal settings...');
 150:         this.renderer = new THREE.WebGLRenderer({
 151:           canvas: this.canvas,
 152:           antialias: !isRendering,
 153:           alpha: true,
 154:           preserveDrawingBuffer: isRendering,
 155:           powerPreference: isRendering ? 'high-performance' : 'low-power',
 156:           failIfMajorPerformanceCaveat: false
 157:         });
 158:         
 159:         // Verify fallback context was created
 160:         const fallbackGl = this.renderer.getContext();
 161:         if (!fallbackGl) {
 162:           throw new Error('Fallback renderer failed to create WebGL context');
 163:         }
 164:         
 165:         const isWebGL2 = fallbackGl instanceof WebGL2RenderingContext;
 166:         debugLog.log('✅ Fallback renderer created successfully');
 167:         debugLog.log('🔧 Fallback WebGL Context:', isWebGL2 ? 'WebGL 2' : 'WebGL 1');
 168:       } catch (fallbackError) {
 169:         debugLog.error('❌ Fallback renderer also failed:', fallbackError);
 170:         const errorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
 171:         throw new Error(`WebGL initialization failed: ${errorMessage}. This may indicate a headless rendering environment issue. Check remotion.config.ts for GL backend settings.`);
 172:       }
 173:     }
 174:     
 175:     this.renderer.setSize(config.canvas.width, config.canvas.height);
 176:     // Fix: Handle headless/server environments where window.devicePixelRatio doesn't exist
 177:     const devicePixelRatio = typeof window !== 'undefined' && window.devicePixelRatio 
 178:       ? window.devicePixelRatio 
 179:       : 1;
 180:     this.renderer.setPixelRatio(Math.min(devicePixelRatio, config.canvas.pixelRatio || 1));
 181:     // Fix: Use opaque background for Remotion rendering
 182:     // Transparent backgrounds can appear black in video output if not composited properly
 183:     // Use a dark background that will show content properly
 184:     this.renderer.setClearColor(0x000000, 1); // Opaque black background for video rendering
 185:     
 186:     const clearColor = this.renderer.getClearColor(new THREE.Color());
 187:     const clearAlpha = this.renderer.getClearAlpha();
 188:     debugLog.log('🎮 VisualizerManager: Renderer clear color =', clearColor.getHex().toString(16), 'alpha =', clearAlpha);
 189:     debugLog.log('🎮 Renderer configured with size:', config.canvas.width, 'x', config.canvas.height);
 190:     
 191:     // Performance optimizations for 30fps
 192:     this.renderer.setAnimationLoop(null); // Use manual RAF control
 193:     this.renderer.info.autoReset = false; // Manual reset for performance monitoring
 194:     
 195:     // Enable tone mapping for better color reproduction
 196:     this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
 197:     this.renderer.toneMappingExposure = 1.0;
 198:     
 199:     // Disable shadows for better performance
 200:     this.renderer.shadowMap.enabled = false;
 201:     this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
 202:   }
 203: 
 204:   private initCompositor(config: VisualizerConfig) {
 205:     this.multiLayerCompositor = new MultiLayerCompositor(this.renderer, {
 206:       width: config.canvas.width,
 207:       height: config.canvas.height,
 208:       enableAntialiasing: !this.isRenderingContext,
 209:       pixelRatio: Math.min(window.devicePixelRatio, config.canvas.pixelRatio || 2)
 210:     });
 211:     
 212:     // --- START: BACKGROUND COLOR LAYER IMPLEMENTATION ---
 213:     // Create a dedicated scene for the background color
 214:     const backgroundScene = new THREE.Scene();
 215:     const backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
 216:     
 217:     // Create a material we can control. Start with black.
 218:     this.backgroundMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
 219:     
 220:     // Create a full-screen quad
 221:     this.backgroundMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.backgroundMaterial);
 222:     backgroundScene.add(this.backgroundMesh);
 223:     
 224:     // Add it to the compositor with a very low zIndex (-100) so it renders first
 225:     this.multiLayerCompositor.createLayer('backgroundColor', backgroundScene, backgroundCamera, {
 226:       zIndex: -100,
 227:       enabled: true
 228:     });
 229:     // --- END: BACKGROUND COLOR LAYER IMPLEMENTATION ---
 230:     
 231:     // Add base scene as background layer (change zIndex to be above the color layer)
 232:     this.multiLayerCompositor.createLayer('base', this.scene, this.camera, { zIndex: -1, enabled: true });
 233:   }
 234: 
 235:   private initAudioTextureManager() {
 236:     this.audioTextureManager = new AudioTextureManager();
 237:     debugLog.log('🎵 AudioTextureManager initialized');
 238:   }
 239: 
 240:   private initMediaLayerManager() {
 241:     this.mediaLayerManager = new MediaLayerManager(this.scene, this.camera, this.renderer);
 242:     debugLog.log('🎬 MediaLayerManager initialized');
 243:   }
 244:   
 245:   private async initAudioAnalyzer() {
 246:     if (!this.audioContext) {
 247:       debugLog.log('🎵 Creating AudioContext after user interaction...');
 248:       this.audioContext = new AudioContext();
 249:       // Resume the context to ensure it's active
 250:       await this.audioContext.resume();
 251:     }
 252:     
 253:     try {
 254:       // This method is no longer used as AudioAnalyzer is removed.
 255:       // Keeping it for now to avoid breaking existing calls, but it will be removed.
 256:       debugLog.log('🎵 Audio analyzer initialization (placeholder)');
 257:     } catch (error) {
 258:       debugLog.error('❌ Failed to initialize audio analyzer:', error);
 259:     }
 260:   }
 261:   
 262:   private setupEventListeners() {
 263:     // Handle window resize
 264:     const handleResize = () => {
 265:       const width = this.canvas.clientWidth;
 266:       const height = this.canvas.clientHeight;
 267:       
 268:       // Use the new responsive resize method
 269:       this.handleViewportResize(width, height);
 270:     };
 271:     
 272:     window.addEventListener('resize', handleResize);
 273:     
 274:     // Handle visibility change (pause when not visible)
 275:     document.addEventListener('visibilitychange', () => {
 276:       if (document.hidden && this.isPlaying) {
 277:         this.pause();
 278:       }
 279:     });
 280:     
 281:     // Handle WebGL context lost/restored
 282:     this.canvas.addEventListener('webglcontextlost', (event) => {
 283:       debugLog.warn('⚠️ WebGL context lost!');
 284:       event.preventDefault();
 285:       this.pause(); // Stop rendering
 286:     });
 287:     
 288:     this.canvas.addEventListener('webglcontextrestored', () => {
 289:       debugLog.log('✅ WebGL context restored, reinitializing...');
 290:       // Context restoration would require reinitializing all GPU resources
 291:       // For now, we'll just log and suggest a page refresh
 292:       debugLog.log('🔄 Please refresh the page to restore full functionality');
 293:     });
 294:   }
 295:   
 296:   // Effect management
 297:   public addEffect(layerId: string, effect: VisualEffect) {
 298:     debugLog.log(`➕ [VisualizerManager] Adding effect: ${layerId}, type: ${effect.constructor.name}`);
 299:     try {
 300:       debugLog.log(`🎨 Adding effect: ${effect.name} (for layer ${layerId})`);
 301:       effect.init(this.renderer);
 302:       
 303:       // If this is an ASCII filter effect, set the compositor reference
 304:       // Check by class name or if setCompositor method exists
 305:       if ('setCompositor' in effect && typeof (effect as any).setCompositor === 'function') {
 306:         debugLog.log(`🔗 [VisualizerManager] Setting compositor for effect: ${effect.name} (${effect.id})`);
 307:         (effect as any).setCompositor(this.multiLayerCompositor, layerId);
 308:       }
 309:       
 310:       this.effects.set(layerId, effect);
 311:       // Register a layer for this effect using the unique layerId
 312:       this.multiLayerCompositor.createLayer(layerId, effect.getScene(), effect.getCamera(), {
 313:         zIndex: this.effects.size,
 314:         enabled: effect.enabled
 315:       });
 316:       
 317:       debugLog.log(`✅ Added effect: ${effect.name}. Total effects: ${this.effects.size}`);
 318:     } catch (error) {
 319:       debugLog.error(`❌ Failed to add effect ${effect.name}:`, error);
 320:     }
 321:   }
 322:   
 323:   public addEffectWithId(effect: VisualEffect, customId: string) {
 324:     try {
 325:       debugLog.log(`🎨 Adding effect with custom ID: ${effect.name} (${customId})`);
 326:       // Don't call init again - effect is already initialized by addEffect()
 327:       // Just add the reference with the custom ID
 328:       this.effects.set(customId, effect);
 329:       
 330:       debugLog.log(`✅ Added effect reference with custom ID: ${effect.name} (${customId}). Total effects: ${this.effects.size}`);
 331:     } catch (error) {
 332:       debugLog.error(`❌ Failed to add effect ${effect.name} with custom ID ${customId}:`, error);
 333:     }
 334:   }
 335:   
 336:   public removeEffect(effectId: string) {
 337:     const effect = this.effects.get(effectId);
 338:     if (effect) {
 339:       effect.destroy();
 340:       this.effects.delete(effectId);
 341:       this.multiLayerCompositor.removeLayer(effectId);
 342:       debugLog.log(`✅ Removed effect and compositor layer: ${effect.name}. Remaining effects: ${this.effects.size}`);
 343:     }
 344:   }
 345:   
 346:   getEffect(effectId: string): VisualEffect | undefined {
 347:     return this.effects.get(effectId);
 348:   }
 349:   
 350:   getAllEffects(): VisualEffect[] {
 351:     return Array.from(this.effects.values());
 352:   }
 353: 
 354:   // Get all layer IDs that have a specific effect type
 355:   getLayerIdsByEffectType(effectType: string): string[] {
 356:     const layerIds: string[] = [];
 357:     this.effects.forEach((effect, layerId) => {
 358:       if (effect.id === effectType) {
 359:         layerIds.push(layerId);
 360:       }
 361:     });
 362:     return layerIds;
 363:   }
 364: 
 365:   // Get the first effect instance of a specific type (for parameter inspection)
 366:   getEffectByType(effectType: string): VisualEffect | undefined {
 367:     for (const [_, effect] of this.effects) {
 368:       if (effect.id === effectType) {
 369:         return effect;
 370:       }
 371:     }
 372:     return undefined;
 373:   }
 374:   
 375:   enableEffect(effectId: string): void {
 376:     const effect = this.effects.get(effectId);
 377:     if (effect) {
 378:       effect.enabled = true;
 379:       this.multiLayerCompositor.updateLayer(effectId, { enabled: true });
 380:       debugLog.log(`✅ Enabled effect: ${effect.name} (${effectId})`);
 381:     } else {
 382:       debugLog.warn(`⚠️ Effect not found: ${effectId}`);
 383:     }
 384:   }
 385:   
 386:   disableEffect(effectId: string): void {
 387:     const effect = this.effects.get(effectId);
 388:     if (effect) {
 389:       effect.enabled = false;
 390:       this.multiLayerCompositor.updateLayer(effectId, { enabled: false });
 391:       debugLog.log(`❌ Disabled effect: ${effect.name} (${effectId})`);
 392:     }
 393:   }
 394:   
 395:   // Legacy show/hide helpers removed; layers are toggled via compositor
 396:   
 397:   // Playback control
 398:   play(): void {
 399:     // Don't start animation loop if we're in Remotion rendering mode
 400:     // Remotion handles frame-by-frame rendering, we don't need RAF loop
 401:     const isRendering = getRemotionEnvironment().isRendering;
 402:     if (isRendering) {
 403:       debugLog.log(`🎬 Play() called during Remotion rendering - animation loop disabled`);
 404:       return;
 405:     }
 406:     
 407:     debugLog.log(`🎬 Play() called. Current state: isPlaying=${this.isPlaying}, effects=${this.effects.size}`);
 408:     if (!this.isPlaying) {
 409:       this.isPlaying = true;
 410:       this.clock.start();
 411:       this.animate();
 412:       debugLog.log(`🎬 Animation started`);
 413:       
 414:       // Start audio playback
 415:       this.audioSources.forEach((source, index) => {
 416:         try {
 417:           source.start(0);
 418:           debugLog.log(`🎵 Started audio source ${index}`);
 419:         } catch (error) {
 420:           debugLog.warn(`⚠️ Audio source ${index} already playing or ended`);
 421:         }
 422:       });
 423:     }
 424:   }
 425:   
 426:   pause(): void {
 427:     this.isPlaying = false;
 428:     this.clock.stop();
 429:     if (this.animationId) {
 430:       cancelAnimationFrame(this.animationId);
 431:       this.animationId = null;
 432:     }
 433:     
 434:     // Stop audio playback
 435:     this.audioSources.forEach((source, index) => {
 436:       try {
 437:         source.stop();
 438:         debugLog.log(`🎵 Stopped audio source ${index}`);
 439:       } catch (error) {
 440:         debugLog.warn(`⚠️ Audio source ${index} already stopped`);
 441:       }
 442:     });
 443:   }
 444:   
 445:   stop(): void {
 446:     this.pause();
 447:     this.clock.elapsedTime = 0;
 448:   }
 449:   
 450:   /**
 451:    * Frame-based update method for Remotion compatibility.
 452:    * This is the "Single Source of Truth" for time and seeds.
 453:    * Calculates deterministic time from frame number and FPS.
 454:    * @param frame - Current frame number from Remotion
 455:    * @param fps - Frames per second from Remotion
 456:    */
 457:   public update(frame: number, fps: number): void {
 458:     this.currentFrame = frame;
 459:     this.currentFPS = fps;
 460:     
 461:     // Calculate deterministic time: frame / fps
 462:     // This ensures the same frame always produces the same time, regardless of environment
 463:     const timeInSeconds = frame / fps;
 464:     this.deterministicTime = timeInSeconds;
 465:     
 466:     // Update timeline current time to match
 467:     this.timelineCurrentTime = timeInSeconds;
 468:     
 469:     // 1. Sync all shaders to the EXACT frame-time, respecting layer start/end times
 470:     this.effects.forEach((effect, layerId) => {
 471:       // Gate effect activation by timeline layer startTime/endTime
 472:       const effectLayer = this.timelineLayers.find(l => l.id === layerId);
 473:       const isLayerActive = effect.enabled && effectLayer
 474:         ? (timeInSeconds >= effectLayer.startTime && timeInSeconds <= effectLayer.endTime)
 475:         : false;
 476: 
 477:       // Update compositor layer visibility based on timing
 478:       if (this.multiLayerCompositor) {
 479:         this.multiLayerCompositor.updateLayer(layerId, { enabled: isLayerActive });
 480:       }
 481: 
 482:       // Only update active effects
 483:       if (!isLayerActive) return;
 484: 
 485:       // Set uTime directly (not incrementing) for deterministic behavior
 486:       // Check if effect has uniforms property (BaseShaderEffect and custom effects)
 487:       if ('uniforms' in effect && effect.uniforms && (effect as any).uniforms.uTime) {
 488:         (effect as any).uniforms.uTime.value = timeInSeconds;
 489:       }
 490: 
 491:       // Use the frame number as a seed for any CPU-side randomness
 492:       if ('setSeed' in effect && typeof (effect as any).setSeed === 'function') {
 493:         (effect as any).setSeed(frame);
 494:       }
 495: 
 496:       // Update effect with deterministic time
 497:       // Pass absolute time instead of deltaTime for deterministic updates
 498:       if (typeof (effect as any).updateWithTime === 'function') {
 499:         (effect as any).updateWithTime(timeInSeconds);
 500:       } else {
 501:         // Fallback: use deltaTime of 1/fps for effects that haven't been updated yet
 502:         effect.update(1 / fps);
 503:       }
 504:     });
 505:     
 506:     // 2. Handle stateful/ping-pong effects that need warm-up
 507:     if (getRemotionEnvironment().isRendering && frame > 0) {
 508:       // For effects that depend on previous frames (like water ripples simulation),
 509:       // we may need to warm up the simulation by running previous frames
 510:       // This is only needed for effects that maintain state between frames
 511:       // Most shader effects are stateless and don't need this
 512:     }
 513:   }
 514: 
 515:   /**
 516:    * Frame-based rendering method for Remotion compatibility.
 517:    * This method can be called explicitly with a specific time and deltaTime,
 518:    * decoupling rendering from the browser clock.
 519:    * @param time - Current time in milliseconds (replaces performance.now())
 520:    * @param deltaTime - Time delta in seconds (replaces clock.getDelta())
 521:    * @deprecated Use update(frame, fps) for deterministic rendering. This method is kept for backward compatibility.
 522:    */
 523:   public renderFrame(time: number, deltaTime: number): void {
 524:     // Note: timelineCurrentTime is managed by updateTimelineState() called from
 525:     // ThreeVisualizer.tsx (Live Mode) and RayboxComposition.tsx (Remotion).
 526:     // We should NOT override it here with system time, as that causes layers to
 527:     // disappear when the page has been open longer than the layer's duration.
 528: 
 529:     // In live editor mode, use the provided time/deltaTime
 530:     // In Remotion mode, use the deterministic time from update()
 531:     const isRendering = getRemotionEnvironment().isRendering;
 532:     const effectiveTime = isRendering ? this.deterministicTime : time / 1000;
 533:     
 534:     // Update all enabled effects
 535:     let activeEffectCount = 0;
 536:     
 537:     // Debug: Log effect and timeline state
 538:     if (this.effects.size === 0) {
 539:       debugLog.warn('⚠️ [VisualizerManager] No effects registered. Effects count:', this.effects.size);
 540:     }
 541:     
 542:     if (this.timelineLayers.length === 0) {
 543:       debugLog.warn('⚠️ [VisualizerManager] No timeline layers. Timeline layers count:', this.timelineLayers.length);
 544:     }
 545:     
 546:     this.effects.forEach((effect, layerId) => {
 547:       // Find the corresponding layer from the timeline state using the correct key
 548:       const effectLayer = this.timelineLayers.find(l => l.id === layerId);
 549: 
 550:       // Determine if the layer should be active.
 551:       const isLayerActive = effect.enabled && effectLayer 
 552:         ? (this.timelineCurrentTime >= effectLayer.startTime && this.timelineCurrentTime <= effectLayer.endTime)
 553:         : false;
 554: 
 555:       // Debug logging for first few frames
 556:       if (this.debugFrameCount < 5 && effectLayer) {
 557:         debugLog.log(`🎬 [Frame ${this.debugFrameCount}] Layer ${layerId}:`, {
 558:           enabled: effect.enabled,
 559:           currentTime: this.timelineCurrentTime,
 560:           startTime: effectLayer.startTime,
 561:           endTime: effectLayer.endTime,
 562:           isActive: isLayerActive
 563:         });
 564:       }
 565: 
 566:       // Update the compositor's render state for this layer
 567:       this.multiLayerCompositor.updateLayer(layerId, { enabled: isLayerActive });
 568: 
 569:       // Run the effect's update logic if it's active
 570:       if (isLayerActive) {
 571:           activeEffectCount++;
 572:           
 573:           try {
 574:             // In Remotion mode, use deterministic time
 575:             // In live editor mode, use deltaTime for smooth animation
 576:             if (isRendering && this.deterministicTime !== undefined) {
 577:               // Set uTime directly for deterministic behavior
 578:               // Check if effect has uniforms property
 579:               if ('uniforms' in effect && effect.uniforms && (effect as any).uniforms.uTime) {
 580:                 (effect as any).uniforms.uTime.value = this.deterministicTime;
 581:               }
 582:               // Use updateWithTime if available, otherwise fallback to update
 583:               if (typeof (effect as any).updateWithTime === 'function') {
 584:                 (effect as any).updateWithTime(this.deterministicTime);
 585:               } else {
 586:                 effect.update(deltaTime);
 587:               }
 588:             } else {
 589:               // Live editor: use deltaTime for smooth animation
 590:               effect.update(deltaTime);
 591:             }
 592:           } catch (error) {
 593:             debugLog.error(`❌ Effect ${layerId} update failed:`, error);
 594:           }
 595:       }
 596:     });
 597:     
 598:     if (this.debugFrameCount < 5) {
 599:       debugLog.log(`🎬 [Frame ${this.debugFrameCount}] Active effects: ${activeEffectCount}, Total effects: ${this.effects.size}, Timeline time: ${this.timelineCurrentTime.toFixed(3)}s`);
 600:     }
 601:     
 602:     this.debugFrameCount++;
 603:     
 604:     // Update GPU audio texture system
 605:     if (this.audioTextureManager && this.currentAudioData) {
 606:       // Convert audio analysis to GPU texture format using existing structure
 607:       const audioFeatureData: AudioFeatureData = {
 608:         features: {
 609:           'main': [this.currentAudioData.volume, this.currentAudioData.bass, this.currentAudioData.mid, this.currentAudioData.treble]
 610:         },
 611:         duration: 0, // Will be set when real audio is loaded
 612:         sampleRate: 44100,
 613:         stemTypes: ['main']
 614:       };
 615:       
 616:       // Update audio texture with timeline position (not system time)
 617:       // This ensures audio sampling matches the track position, not page uptime
 618:       this.audioTextureManager.updateTime(this.timelineCurrentTime, 0); // Note: duration is 0 here, fine for now or pass actual duration if available
 619:     }
 620:     
 621:     // Update media layer textures (for video elements)
 622:     if (this.mediaLayerManager) {
 623:       this.mediaLayerManager.updateTextures();
 624:     }
 625:     
 626:     // Render all layers via compositor
 627:     this.multiLayerCompositor.render();
 628:   }
 629: 
 630:   private animate = () => {
 631:     if (!this.isPlaying) return;
 632:     
 633:     this.animationId = requestAnimationFrame(this.animate);
 634:     
 635:     // IMPLEMENT 30FPS CAP - Much more reasonable for audio-visual sync
 636:     const now = performance.now();
 637:     const elapsed = now - this.lastTime;
 638:     const targetFrameTime = 1000 / 30; // 33.33ms for 30fps
 639:     
 640:     if (elapsed < targetFrameTime) {
 641:       return; // Skip this frame to maintain 30fps cap
 642:     }
 643:     
 644:     // Only skip frames if we're severely behind (emergency performance protection)
 645:     const frameTime = elapsed;
 646:     if (frameTime > 100) { // If frame takes more than 100ms (10fps), skip next frame
 647:       this.consecutiveSlowFrames++;
 648:       
 649:       // Emergency pause if too many consecutive slow frames
 650:       if (this.consecutiveSlowFrames >= this.maxSlowFrames) {
 651:         debugLog.error(`🚨 Emergency pause: ${this.maxSlowFrames} consecutive slow frames detected. Pausing to prevent browser freeze.`);
 652:         this.pause();
 653:         // Suggest recovery action
 654:         setTimeout(() => {
 655:           debugLog.log('💡 Tip: Try refreshing the page or closing other browser tabs to improve performance.');
 656:         }, 1000);
 657:         return;
 658:       }
 659:       
 660:       this.lastTime = now;
 661:       return;
 662:     } else {
 663:       this.consecutiveSlowFrames = 0; // Reset counter on good frame
 664:     }
 665:     
 666:     const deltaTime = Math.min(this.clock.getDelta(), 0.1); // Cap delta time to prevent large jumps
 667:     const currentTime = now;
 668:     
 669:     // Update FPS counter
 670:     this.frameCount++;
 671:     if (currentTime - this.lastFPSUpdate > 1000) {
 672:       this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFPSUpdate));
 673:       this.frameCount = 0;
 674:       this.lastFPSUpdate = currentTime;
 675:     }
 676:     
 677:     // Performance monitoring - check memory usage
 678:     if (this.frameCount % 300 === 0) { // Every 10 seconds at 30fps
 679:       const memInfo = this.getMemoryUsage();
 680:       if (memInfo.geometries > 100 || memInfo.textures > 50) {
 681:         debugLog.warn(`⚠️ High memory usage detected: ${memInfo.geometries} geometries, ${memInfo.textures} textures`);
 682:       }
 683:     }
 684:     
 685:     // Call renderFrame with calculated time and deltaTime
 686:     this.renderFrame(currentTime, deltaTime);
 687:     
 688:     this.lastTime = currentTime;
 689:   };
 690:   
 691:   /**
 692:    * FIX: Public method to synchronize the visualizer with the timeline's state.
 693:    * This should be called from a useEffect hook in the UI.
 694:    */
 695:   public updateTimelineState(layers: any[], currentTime: number): void {
 696:     this.timelineLayers = layers;
 697:     this.timelineCurrentTime = currentTime;
 698: 
 699:     // Sync layer z-indices from timeline to compositor
 700:     if (this.multiLayerCompositor) {
 701:       layers.forEach(layer => {
 702:         if (typeof layer.zIndex === 'number') {
 703:           // The compositor handles re-sorting internally when zIndex is updated
 704:           this.multiLayerCompositor.updateLayer(layer.id, { zIndex: layer.zIndex });
 705:         }
 706:       });
 707:     }
 708:   }
 709:   
 710:   // Update methods for real data
 711:   updateMIDIData(midiData: LiveMIDIData): void {
 712:     // Store MIDI data to be used in next animation frame
 713:     this.currentMidiData = midiData;
 714:     debugLog.log('🎵 MIDI data received:', midiData);
 715:   }
 716: 
 717:   updateAudioData(audioData: AudioAnalysisData): void {
 718:     // Store audio data to be used in next animation frame
 719:     this.currentAudioData = audioData;
 720:     debugLog.log('🎵 Audio data received:', audioData);
 721:   }
 722: 
 723:   /**
 724:    * Public method to manually set audio data (for Remotion frame-based rendering)
 725:    * @param data - AudioAnalysisData to set
 726:    */
 727:   public setAudioData(data: AudioAnalysisData): void {
 728:     this.currentAudioData = data;
 729:   }
 730:   
 731:   
 732:   updateEffectParameter(effectId: string, paramName: string, value: any): void {
 733:     // Try to get effect by layer ID first
 734:     let effect = this.effects.get(effectId);
 735:     
 736:     // Debug logging for metaballs specifically
 737:     const isMetaballs = effectId === 'layer-1765752490965';
 738:     
 739:     // If not found, assume effectId is an effect type (like 'metaballs')
 740:     // and update ALL instances of that effect type
 741:     if (!effect) {
 742:       const layerIds = this.getLayerIdsByEffectType(effectId);
 743:       if (layerIds.length > 0) {
 744:         // Update all instances of this effect type
 745:         layerIds.forEach(layerId => {
 746:           const effectInstance = this.effects.get(layerId);
 747:           if (effectInstance && effectInstance.parameters.hasOwnProperty(paramName)) {
 748:             const oldValue = (effectInstance.parameters as any)[paramName];
 749:             (effectInstance.parameters as any)[paramName] = value;
 750:             if (isMetaballs) {
 751:               debugLog.log('🔧 [VisualizerManager] Updated effect parameter (by type):', {
 752:                 effectId,
 753:                 layerId,
 754:                 paramName,
 755:                 oldValue,
 756:                 newValue: value,
 757:                 hasUpdateMethod: typeof (effectInstance as any).updateParameter === 'function',
 758:               });
 759:             }
 760:             if (typeof (effectInstance as any).updateParameter === 'function') {
 761:               (effectInstance as any).updateParameter(paramName, value);
 762:             }
 763:           } else if (isMetaballs) {
 764:             debugLog.warn('🔧 [VisualizerManager] Parameter not found (by type):', {
 765:               effectId,
 766:               layerId,
 767:               paramName,
 768:               availableParams: effectInstance ? Object.keys(effectInstance.parameters) : [],
 769:             });
 770:           }
 771:         });
 772:         return;
 773:       }
 774:       if (isMetaballs) {
 775:         debugLog.warn(`🔧 [VisualizerManager] Effect ${effectId} not found (neither as layer ID nor effect type)`);
 776:       }
 777:       debugLog.warn(`⚠️ Effect ${effectId} not found (neither as layer ID nor effect type)`);
 778:       return;
 779:     }
 780:     
 781:     // Handle direct layer ID lookup
 782:     if (effect.parameters.hasOwnProperty(paramName)) {
 783:       const oldValue = (effect.parameters as any)[paramName];
 784:       (effect.parameters as any)[paramName] = value;
 785:       
 786:       if (isMetaballs) {
 787:         debugLog.log('🔧 [VisualizerManager] Updated effect parameter (direct):', {
 788:           effectId,
 789:           paramName,
 790:           oldValue,
 791:           newValue: value,
 792:           hasUpdateMethod: typeof (effect as any).updateParameter === 'function',
 793:           currentParams: Object.keys(effect.parameters),
 794:         });
 795:       }
 796:       
 797:       // If the effect has an updateParameter method, call it for immediate updates
 798:       if (typeof (effect as any).updateParameter === 'function') {
 799:         (effect as any).updateParameter(paramName, value);
 800:         if (isMetaballs) {
 801:           debugLog.log('🔧 [VisualizerManager] Called updateParameter method');
 802:         }
 803:       }
 804:     } else {
 805:       if (isMetaballs) {
 806:         debugLog.warn('🔧 [VisualizerManager] Parameter not found (direct):', {
 807:           effectId,
 808:           paramName,
 809:           availableParams: Object.keys(effect.parameters),
 810:         });
 811:       }
 812:       debugLog.warn(`⚠️ Parameter ${paramName} not found in effect ${effectId}`);
 813:     }
 814:   }
 815:   
 816:   private currentMidiData?: LiveMIDIData;
 817:   private currentAudioData?: AudioAnalysisData;
 818:   
 819:   // Performance monitoring
 820:   getFPS(): number {
 821:     return this.fps;
 822:   }
 823:   
 824:   getMemoryUsage(): { geometries: number; textures: number; programs: number } {
 825:     return {
 826:       geometries: this.renderer.info.memory.geometries,
 827:       textures: this.renderer.info.memory.textures,
 828:       programs: this.renderer.info.programs?.length || 0
 829:     };
 830:   }
 831:   
 832:   // Cleanup
 833:   dispose(): void {
 834:     debugLog.log(`🗑️ VisualizerManager.dispose() called. Effects: ${this.effects.size}`);
 835:     this.stop();
 836:     
 837:     // Dispose compositor
 838:     if (this.multiLayerCompositor) {
 839:       this.multiLayerCompositor.dispose();
 840:     }
 841:     
 842:     // Dispose all effects
 843:     debugLog.log(`🗑️ Disposing ${this.effects.size} effects`);
 844:     this.effects.forEach(effect => effect.destroy());
 845:     this.effects.clear();
 846:     debugLog.log(`🗑️ Effects cleared. Remaining: ${this.effects.size}`);
 847:     
 848:     // Dispose Three.js resources
 849:     this.scene.traverse((object) => {
 850:       if (object instanceof THREE.Mesh) {
 851:         object.geometry.dispose();
 852:         if (object.material instanceof Array) {
 853:           object.material.forEach(material => material.dispose());
 854:         } else {
 855:           object.material.dispose();
 856:         }
 857:       }
 858:     });
 859:     
 860:     this.renderer.dispose();
 861:   }
 862: 
 863:   public async loadAudioBuffer(buffer: ArrayBuffer): Promise<void> {
 864:     if (!this.audioContext) {
 865:       throw new Error('AudioContext not initialized');
 866:     }
 867:     try {
 868:       // Log buffer info for debugging
 869:       debugLog.log('Audio buffer length:', buffer.byteLength);
 870:       debugLog.log('First 16 bytes:', Array.from(new Uint8Array(buffer.slice(0, 16))));
 871:       this.currentAudioBuffer = await this.audioContext.decodeAudioData(buffer);
 872:       // Create audio source for playback
 873:       const audioSource = this.audioContext.createBufferSource();
 874:       audioSource.buffer = this.currentAudioBuffer;
 875:       audioSource.connect(this.audioContext.destination);
 876:       // Store the source for control
 877:       if (!this.audioSources) {
 878:         this.audioSources = [];
 879:       }
 880:       this.audioSources.push(audioSource);
 881:       // Remove any call to audioAnalyzer/analyzeStem
 882:     } catch (error) {
 883:       debugLog.error('❌ Failed to load audio buffer:', error);
 884:       throw error;
 885:     }
 886:   }
 887: 
 888:   // Parameter setters
 889:   public setGlobalScale(value: number) {
 890:     this.visualParams.globalScale = value;
 891:     this.effects.forEach(effect => {
 892:       if ('setScale' in effect) {
 893:         (effect as any).setScale(value);
 894:       }
 895:     });
 896:   }
 897: 
 898:   public setRotationSpeed(value: number) {
 899:     this.visualParams.rotationSpeed = value;
 900:     this.effects.forEach(effect => {
 901:       if ('setRotationSpeed' in effect) {
 902:         (effect as any).setRotationSpeed(value);
 903:       }
 904:     });
 905:   }
 906: 
 907:   public setColorIntensity(value: number) {
 908:     this.visualParams.colorIntensity = value;
 909:     this.effects.forEach(effect => {
 910:       if ('setColorIntensity' in effect) {
 911:         (effect as any).setColorIntensity(value);
 912:       }
 913:     });
 914:   }
 915: 
 916:   public setEmissionIntensity(value: number) {
 917:     this.visualParams.emissionIntensity = value;
 918:     this.effects.forEach(effect => {
 919:       if ('setEmissionIntensity' in effect) {
 920:         (effect as any).setEmissionIntensity(value);
 921:       }
 922:     });
 923:   }
 924: 
 925:   public setPositionOffset(value: number) {
 926:     this.visualParams.positionOffset = value;
 927:     this.effects.forEach(effect => {
 928:       if ('setPositionOffset' in effect) {
 929:         (effect as any).setPositionOffset(value);
 930:       }
 931:     });
 932:   }
 933: 
 934:   public setHeightScale(value: number) {
 935:     this.visualParams.heightScale = value;
 936:     this.effects.forEach(effect => {
 937:       if ('setHeightScale' in effect) {
 938:         (effect as any).setHeightScale(value);
 939:       }
 940:     });
 941:   }
 942: 
 943:   public setHueRotation(value: number) {
 944:     this.visualParams.hueRotation = value;
 945:     this.effects.forEach(effect => {
 946:       if ('setHueRotation' in effect) {
 947:         (effect as any).setHueRotation(value);
 948:       }
 949:     });
 950:   }
 951: 
 952:   public setBrightness(value: number) {
 953:     this.visualParams.brightness = value;
 954:     this.effects.forEach(effect => {
 955:       if ('setBrightness' in effect) {
 956:         (effect as any).setBrightness(value);
 957:       }
 958:     });
 959:   }
 960: 
 961:   public setComplexity(value: number) {
 962:     this.visualParams.complexity = value;
 963:     this.effects.forEach(effect => {
 964:       if ('setComplexity' in effect) {
 965:         (effect as any).setComplexity(value);
 966:       }
 967:     });
 968:   }
 969: 
 970:   public setParticleSize(value: number) {
 971:     this.visualParams.particleSize = value;
 972:     this.effects.forEach(effect => {
 973:       if ('setParticleSize' in effect) {
 974:         (effect as any).setParticleSize(value);
 975:       }
 976:     });
 977:   }
 978: 
 979:   public setOpacity(value: number) {
 980:     this.visualParams.opacity = value;
 981:     this.effects.forEach(effect => {
 982:       if ('setOpacity' in effect) {
 983:         (effect as any).setOpacity(value);
 984:       }
 985:     });
 986:   }
 987: 
 988:   public setAnimationSpeed(value: number) {
 989:     this.visualParams.animationSpeed = value;
 990:     this.effects.forEach(effect => {
 991:       if ('setAnimationSpeed' in effect) {
 992:         (effect as any).setAnimationSpeed(value);
 993:       }
 994:     });
 995:   }
 996: 
 997:   public setParticleCount(value: number) {
 998:     this.visualParams.particleCount = value;
 999:     this.effects.forEach(effect => {
1000:       if ('setParticleCount' in effect) {
1001:         (effect as any).setParticleCount(value);
1002:       }
1003:     });
1004:   }
1005: 
1006:   public updateSettings(settings: Record<string, number>) {
1007:     Object.entries(settings).forEach(([key, value]) => {
1008:       switch (key) {
1009:         case 'globalIntensity':
1010:           this.setColorIntensity(value);
1011:           this.setEmissionIntensity(value);
1012:           break;
1013:         case 'smoothingFactor':
1014:           // Apply to all effects that support smoothing
1015:           this.effects.forEach(effect => {
1016:             if ('setSmoothingFactor' in effect) {
1017:               (effect as any).setSmoothingFactor(value);
1018:             }
1019:           });
1020:           break;
1021:         case 'responsiveness':
1022:           // Apply to all effects that support responsiveness
1023:           this.effects.forEach(effect => {
1024:             if ('setResponsiveness' in effect) {
1025:               (effect as any).setResponsiveness(value);
1026:             }
1027:           });
1028:           break;
1029:       }
1030:     });
1031:   }
1032: 
1033:   // Method to handle responsive resizing (no letterboxing, always fill canvas)
1034:   public handleViewportResize(canvasWidth: number, canvasHeight: number) {
1035:     this.renderer.setSize(canvasWidth, canvasHeight);
1036:     this.camera.aspect = canvasWidth / canvasHeight;
1037:     this.camera.updateProjectionMatrix();
1038:     
1039:     // Update resolution uniforms and resize handlers for all effects
1040:     this.effects.forEach(effect => {
1041:       // Update resolution uniforms
1042:       if ('uniforms' in effect && (effect as any).uniforms?.uResolution) {
1043:         (effect as any).uniforms.uResolution.value.set(canvasWidth, canvasHeight);
1044:       }
1045:       
1046:       // Call resize method if effect has one (for updating internal cameras)
1047:       if ('resize' in effect && typeof (effect as any).resize === 'function') {
1048:         (effect as any).resize(canvasWidth, canvasHeight);
1049:       }
1050:     });
1051:     
1052:     // Resize compositor targets
1053:     if (this.multiLayerCompositor) {
1054:       this.multiLayerCompositor.resize(canvasWidth, canvasHeight);
1055:     }
1056:     debugLog.log('🎨 Responsive resize:', canvasWidth, canvasHeight, 'aspect:', this.camera.aspect);
1057:   }
1058: 
1059:   // 2D Composition Layer for future video/image integration
1060:   public createCompositionLayer() {
1061:     // Create an orthographic camera for 2D composition
1062:     const aspectRatio = this.camera.aspect;
1063:     const frustumSize = 2;
1064:     const orthographicCamera = new THREE.OrthographicCamera(
1065:       frustumSize * aspectRatio / -2,
1066:       frustumSize * aspectRatio / 2,
1067:       frustumSize / 2,
1068:       frustumSize / -2,
1069:       0.1,
1070:       1000
1071:     );
1072:     orthographicCamera.position.set(0, 0, 1);
1073:     orthographicCamera.lookAt(0, 0, 0);
1074: 
1075:     // Create a composition scene for 2D elements
1076:     const compositionScene = new THREE.Scene();
1077:     
1078:     return {
1079:       scene: compositionScene,
1080:       camera: orthographicCamera,
1081:       addVideoLayer: (video: HTMLVideoElement, position: {x: number, y: number}, scale: {x: number, y: number}) => {
1082:         const texture = new THREE.VideoTexture(video);
1083:         const plane = new THREE.PlaneGeometry(1, 1);
1084:         const material = new THREE.MeshBasicMaterial({ map: texture });
1085:         const mesh = new THREE.Mesh(plane, material);
1086:         
1087:         // Position in 2D space (orthographic camera)
1088:         mesh.position.set(position.x, position.y, 0);
1089:         mesh.scale.set(scale.x, scale.y, 1);
1090:         
1091:         compositionScene.add(mesh);
1092:         return mesh;
1093:       },
1094:       addImageLayer: (image: HTMLImageElement, position: {x: number, y: number}, scale: {x: number, y: number}) => {
1095:         // [CHANGE 4] Enable CORS for textures
1096:         const loader = new THREE.TextureLoader();
1097:         loader.setCrossOrigin('anonymous'); 
1098:         
1099:         const texture = loader.load(image.src, undefined, undefined, (err) => {
1100:             console.error("Error loading texture:", image.src, err);
1101:         });
1102:         const plane = new THREE.PlaneGeometry(1, 1);
1103:         const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true }); // Ensure transparent is true
1104:         const mesh = new THREE.Mesh(plane, material);
1105:         
1106:         // Position in 2D space (orthographic camera)
1107:         mesh.position.set(position.x, position.y, 0);
1108:         mesh.scale.set(scale.x, scale.y, 1);
1109:         
1110:         compositionScene.add(mesh);
1111:         return mesh;
1112:       }
1113:     };
1114:   }
1115: 
1116:   // GPU Compositing System Access Methods
1117:   
1118:   public getAudioTextureManager(): AudioTextureManager | null {
1119:     return this.audioTextureManager;
1120:   }
1121: 
1122:   public getMediaLayerManager(): MediaLayerManager | null {
1123:     return this.mediaLayerManager;
1124:   }
1125: 
1126:   /**
1127:    * Get the multi-layer compositor for direct rendering access
1128:    * Used by Remotion to render after deterministic update
1129:    */
1130:   public getCompositor(): MultiLayerCompositor {
1131:     return this.multiLayerCompositor;
1132:   }
1133: 
1134:   // GPU compositing always on via MultiLayerCompositor
1135: 
1136:   public loadAudioAnalysisForGPU(analysisData: AudioFeatureData): void {
1137:     if (this.audioTextureManager) {
1138:       this.audioTextureManager.loadAudioAnalysis(analysisData);
1139:       debugLog.log('🎵 Audio analysis loaded into GPU textures');
1140:     }
1141:   }
1142: 
1143:   // Background Color Control Methods
1144:   
1145:   /**
1146:    * Set the background color of the visualizer
1147:    * @param color - THREE.js compatible color (hex, string, or Color object)
1148:    */
1149:   public setBackgroundColor(color: THREE.ColorRepresentation): void {
1150:     if (this.backgroundMaterial) {
1151:       this.backgroundMaterial.color.set(color);
1152:       debugLog.log('🎨 Background color set to:', color);
1153:     }
1154:   }
1155: 
1156:   /**
1157:    * Control the visibility of the background color layer
1158:    * @param visible - true to show background, false for full transparency
1159:    */
1160:   public setBackgroundVisibility(visible: boolean): void {
1161:     if (this.backgroundMesh) {
1162:       this.backgroundMesh.visible = visible;
1163:       debugLog.log('🎨 Background visibility set to:', visible);
1164:     }
1165:   }
1166: }
```

## File: apps/web/src/lib/visualizer/effects/EffectDefinitions.ts
```typescript
  1: import { EffectRegistry } from './EffectRegistry';
  2: import { MetaballsEffect } from './MetaballsEffect';
  3: import { ParticleNetworkEffect } from './ParticleNetworkEffect';
  4: import { ImageSlideshowEffect } from './ImageSlideshowEffect';
  5: import { AsciiFilterEffect } from './AsciiFilterEffect';
  6: 
  7: // Stylize category imports
  8: import { ChromaticAbberationEffect } from './ChromaticAbberationEffect';
  9: import { CRTEffect } from './CRTEffect';
 10: import { DitherEffect } from './DitherEffect';
 11: import { GlitchEffect } from './GlitchEffect';
 12: import { GrainEffect } from './GrainEffect';
 13: import { HalftoneEffect } from './HalftoneEffect';
 14: import { PixelateEffect } from './PixelateEffect';
 15: import { PosterizeEffect } from './PosterizeEffect';
 16: 
 17: // Blur category imports
 18: import { BlurEffect } from './BlurEffect';
 19: import { BokehEffect } from './BokehEffect';
 20: import { DiffusionEffect } from './DiffusionEffect';
 21: import { FogEffect } from './FogEffect';
 22: import { ProgressiveBlurEffect } from './ProgressiveBlurEffect';
 23: import { RadialBlurEffect } from './RadialBlurEffect';
 24: 
 25: // Distort category imports
 26: import { BulgeEffect } from './BulgeEffect';
 27: import { FbmEffect } from './FbmEffect';
 28: import { LiquifyEffect } from './LiquifyEffect';
 29: import { NoiseEffect } from './NoiseEffect';
 30: import { PolarEffect } from './PolarEffect';
 31: import { RippleEffect } from './RippleEffect';
 32: import { SineWavesEffect } from './SineWavesEffect';
 33: import { SkyboxEffect } from './SkyboxEffect';
 34: import { StretchEffect } from './StretchEffect';
 35: import { SwirlEffect } from './SwirlEffect';
 36: import { TrailEffect } from './TrailEffect';
 37: import { WaterRipplesEffect } from './WaterRipplesEffect';
 38: import { WavesEffect } from './WavesEffect';
 39: 
 40: // Light category imports
 41: import { BeamEffect } from './BeamEffect';
 42: import { BloomEffect } from './BloomEffect';
 43: import { GodRaysEffect } from './GodRaysEffect';
 44: import { LightTrailEffect } from './LightTrailEffect';
 45: import { WaterCausticsEffect } from './WaterCausticsEffect';
 46: 
 47: // Misc category imports
 48: import { CircleEffect } from './CircleEffect';
 49: import { GlitterEffect } from './GlitterEffect';
 50: import { GradientFillEffect } from './GradientFillEffect';
 51: import { NoiseFillEffect } from './NoiseFillEffect';
 52: import { PatternEffect } from './PatternEffect';
 53: import { ReplicateEffect } from './ReplicateEffect';
 54: import { VideoEffect } from './VideoEffect';
 55: import { WispsEffect } from './WispsEffect';
 56: 
 57: // Register built-in effects at module import time
 58: EffectRegistry.register({
 59:   id: 'metaballs',
 60:   name: 'MIDI Metaballs',
 61:   description: 'Fluid droplet-like spheres that respond to MIDI notes',
 62:   category: 'organic',
 63:   version: '1.0.0',
 64:   constructor: MetaballsEffect,
 65:   defaultConfig: {}
 66: });
 67: 
 68: EffectRegistry.register({
 69:   id: 'particleNetwork',
 70:   name: 'Particle Network',
 71:   description: 'Glowing particle network that responds to MIDI and audio',
 72:   category: 'particles',
 73:   version: '1.0.0',
 74:   constructor: ParticleNetworkEffect,
 75:   defaultConfig: {
 76:     connectionLineWidth: 1.0,
 77:     connectionColor: '#ffffff'
 78:   }
 79: });
 80: 
 81: EffectRegistry.register({
 82:   id: 'imageSlideshow',
 83:   name: 'Image Slideshow',
 84:   description: 'Slideshow that advances on audio transients',
 85:   category: 'media',
 86:   version: '1.0.0',
 87:   constructor: ImageSlideshowEffect,
 88:   defaultConfig: {
 89:     triggerValue: 0,
 90:     threshold: 0.5,
 91:     images: [],
 92:     opacity: 1.0,
 93:     position: { x: 0.5, y: 0.5 },
 94:     size: { width: 1.0, height: 1.0 },
 95:     slideEvents: [] // STATELESS: pre-computed transients for Lambda rendering
 96:   }
 97: });
 98: 
 99: // STYLIZE CATEGORY EFFECTS
100: 
101: EffectRegistry.register({
102:   id: 'asciiFilter',
103:   name: 'ASCII Filter',
104:   description: 'Converts input to ASCII art with audio-reactive parameters',
105:   category: 'stylize',
106:   version: '1.0.0',
107:   constructor: AsciiFilterEffect,
108:   defaultConfig: {
109:     textSize: 0.4,
110:     gamma: 1.2,
111:     opacity: 0.87,
112:     contrast: 1.4,
113:     invert: 0.0,
114:     threshold: 0.5,
115:     falloff: 0.2,
116:     hideBackground: false,
117:     color: [1.0, 1.0, 1.0] // White by default
118:   }
119: });
120: 
121: EffectRegistry.register({
122:   id: 'chromaticAbberation',
123:   name: 'Chromatic Abberation',
124:   description: 'RGB color channel offset for lens distortion effect',
125:   category: 'stylize',
126:   version: '1.0.0',
127:   constructor: ChromaticAbberationEffect,
128:   defaultConfig: {
129:     amount: 0.2,
130:     direction: 0.0
131:   }
132: });
133: 
134: EffectRegistry.register({
135:   id: 'crt',
136:   name: 'CRT Monitor',
137:   description: 'Vintage CRT monitor effect with phosphors and scanlines',
138:   category: 'stylize',
139:   version: '1.0.0',
140:   constructor: CRTEffect,
141:   defaultConfig: {
142:     curvature: 0.0,
143:     scanlines: 0.5,
144:     vignetteIntensity: 0.5,
145:     noise: 0.5
146:   }
147: });
148: 
149: EffectRegistry.register({
150:   id: 'dither',
151:   name: 'Dither',
152:   description: 'Ordered dithering for retro pixelart look',
153:   category: 'stylize',
154:   version: '1.0.0',
155:   constructor: DitherEffect,
156:   defaultConfig: {
157:     bayerMatrix: 4,
158:     colors: 16,
159:     scale: 1.0
160:   }
161: });
162: 
163: EffectRegistry.register({
164:   id: 'glitch',
165:   name: 'Digital Glitch',
166:   description: 'VHS-style digital glitch with corruption and aberration',
167:   category: 'stylize',
168:   version: '1.0.0',
169:   constructor: GlitchEffect,
170:   defaultConfig: {
171:     blockSize: 0.5,
172:     offset: 0.5,
173:     chromatic: 0.5,
174:     frequency: 0.5
175:   }
176: });
177: 
178: EffectRegistry.register({
179:   id: 'grain',
180:   name: 'Film Grain',
181:   description: 'Adds film grain noise for vintage look',
182:   category: 'stylize',
183:   version: '1.0.0',
184:   constructor: GrainEffect,
185:   defaultConfig: {
186:     amount: 0.5,
187:     size: 1.0,
188:     colorized: false,
189:     luminance: false
190:   }
191: });
192: 
193: EffectRegistry.register({
194:   id: 'halftone',
195:   name: 'Halftone',
196:   description: 'CMYK halftone printing effect',
197:   category: 'stylize',
198:   version: '1.0.0',
199:   constructor: HalftoneEffect,
200:   defaultConfig: {
201:     dotSize: 0.75,
202:     angle: 0.0,
203:     shape: 'circle',
204:     smoothness: 0.75
205:   }
206: });
207: 
208: EffectRegistry.register({
209:   id: 'pixelate',
210:   name: 'Pixelate',
211:   description: 'Mosaic pixelation effect',
212:   category: 'stylize',
213:   version: '1.0.0',
214:   constructor: PixelateEffect,
215:   defaultConfig: {
216:     pixelSize: 0.5,
217:     shape: 'square'
218:   }
219: });
220: 
221: EffectRegistry.register({
222:   id: 'posterize',
223:   name: 'Posterize',
224:   description: 'Reduces color levels for poster art effect',
225:   category: 'stylize',
226:   version: '1.0.0',
227:   constructor: PosterizeEffect,
228:   defaultConfig: {
229:     levels: 8,
230:     gamma: 1.0
231:   }
232: });
233: 
234: // BLUR CATEGORY EFFECTS
235: 
236: EffectRegistry.register({
237:   id: 'blur',
238:   name: 'Gaussian Blur',
239:   description: 'Smooth Gaussian blur with configurable intensity',
240:   category: 'blur',
241:   version: '1.0.0',
242:   constructor: BlurEffect,
243:   defaultConfig: {
244:     intensity: 0.5,
245:     radius: 5.0,
246:     quality: 1.0
247:   }
248: });
249: 
250: EffectRegistry.register({
251:   id: 'radialBlur',
252:   name: 'Radial Blur',
253:   description: 'Rotational blur around a center point',
254:   category: 'blur',
255:   version: '1.0.0',
256:   constructor: RadialBlurEffect,
257:   defaultConfig: {
258:     intensity: 0.4,
259:     centerX: 0.5,
260:     centerY: 0.5,
261:     angle: 10.0
262:   }
263: });
264: 
265: EffectRegistry.register({
266:   id: 'bokeh',
267:   name: 'Bokeh Blur',
268:   description: 'Depth-of-field bokeh blur effect',
269:   category: 'blur',
270:   version: '1.0.0',
271:   constructor: BokehEffect,
272:   defaultConfig: {
273:     intensity: 0.5,
274:     focalDepth: 0.5,
275:     aperture: 0.8
276:   }
277: });
278: 
279: EffectRegistry.register({
280:   id: 'diffusion',
281:   name: 'Diffusion',
282:   description: 'Soft diffusion glow effect',
283:   category: 'blur',
284:   version: '1.0.0',
285:   constructor: DiffusionEffect,
286:   defaultConfig: {
287:     intensity: 0.5,
288:     size: 1.5
289:   }
290: });
291: 
292: EffectRegistry.register({
293:   id: 'fog',
294:   name: 'Fog',
295:   description: 'Animated fog effect with noise',
296:   category: 'blur',
297:   version: '1.0.0',
298:   constructor: FogEffect,
299:   defaultConfig: {
300:     density: 0.3,
301:     speed: 0.5,
302:     color: [1.0, 1.0, 1.0]
303:   }
304: });
305: 
306: EffectRegistry.register({
307:   id: 'progressiveBlur',
308:   name: 'Progressive Blur',
309:   description: 'Blur that increases with distance from center',
310:   category: 'blur',
311:   version: '1.0.0',
312:   constructor: ProgressiveBlurEffect,
313:   defaultConfig: {
314:     intensity: 0.6,
315:     centerX: 0.5,
316:     centerY: 0.5
317:   }
318: });
319: 
320: // DISTORT CATEGORY EFFECTS
321: 
322: EffectRegistry.register({
323:   id: 'bulge',
324:   name: 'Bulge',
325:   description: 'Bulge/pinch distortion effect',
326:   category: 'distort',
327:   version: '1.0.0',
328:   constructor: BulgeEffect,
329:   defaultConfig: {
330:     intensity: 0.5,
331:     centerX: 0.5,
332:     centerY: 0.5,
333:     radius: 0.4
334:   }
335: });
336: 
337: EffectRegistry.register({
338:   id: 'fbm',
339:   name: 'FBM Distortion',
340:   description: 'Fluid marble-like distortion using Fractal Brownian Motion',
341:   category: 'distort',
342:   version: '1.0.0',
343:   constructor: FbmEffect,
344:   defaultConfig: {
345:     intensity: 0.5,
346:     speed: 0.5,
347:     scale: 1.0
348:   }
349: });
350: 
351: EffectRegistry.register({
352:   id: 'liquify',
353:   name: 'Liquify',
354:   description: 'Sine-based liquid distortion effect',
355:   category: 'distort',
356:   version: '1.0.0',
357:   constructor: LiquifyEffect,
358:   defaultConfig: {
359:     intensity: 0.5,
360:     frequency: 1.0,
361:     speed: 0.5
362:   }
363: });
364: 
365: EffectRegistry.register({
366:   id: 'noise',
367:   name: 'BCC Noise',
368:   description: 'Body-Centered Cubic noise distortion',
369:   category: 'distort',
370:   version: '1.0.0',
371:   constructor: NoiseEffect,
372:   defaultConfig: {
373:     intensity: 0.5,
374:     scale: 1.0,
375:     speed: 0.5
376:   }
377: });
378: 
379: EffectRegistry.register({
380:   id: 'polar',
381:   name: 'Polar',
382:   description: 'Cartesian to polar coordinates transformation',
383:   category: 'distort',
384:   version: '1.0.0',
385:   constructor: PolarEffect,
386:   defaultConfig: {
387:     intensity: 1.0,
388:     rotation: 0.0,
389:     centerX: 0.5,
390:     centerY: 0.5
391:   }
392: });
393: 
394: EffectRegistry.register({
395:   id: 'ripple',
396:   name: 'Ripple',
397:   description: 'Concentric ripple distortion',
398:   category: 'distort',
399:   version: '1.0.0',
400:   constructor: RippleEffect,
401:   defaultConfig: {
402:     intensity: 0.05,
403:     frequency: 10.0,
404:     speed: 1.0,
405:     centerX: 0.5,
406:     centerY: 0.5
407:   }
408: });
409: 
410: EffectRegistry.register({
411:   id: 'sineWaves',
412:   name: 'Sine Waves',
413:   description: 'Sinusoidal wave distortion',
414:   category: 'distort',
415:   version: '1.0.0',
416:   constructor: SineWavesEffect,
417:   defaultConfig: {
418:     intensity: 0.5,
419:     frequency: 20.0,
420:     speed: 0.5,
421:     waveX: true,
422:     waveY: true
423:   }
424: });
425: 
426: EffectRegistry.register({
427:   id: 'skybox',
428:   name: 'Skybox Projection',
429:   description: 'Equirectangular 360 projection',
430:   category: 'distort',
431:   version: '1.0.0',
432:   constructor: SkyboxEffect,
433:   defaultConfig: {
434:     fov: 90.0,
435:     rotationX: 0.5,
436:     rotationY: 0.5,
437:     zoom: 1.0
438:   }
439: });
440: 
441: EffectRegistry.register({
442:   id: 'stretch',
443:   name: 'Stretch',
444:   description: 'Directional stretch/compression distortion',
445:   category: 'distort',
446:   version: '1.0.0',
447:   constructor: StretchEffect,
448:   defaultConfig: {
449:     intensity: 0.5,
450:     angle: 0.0,
451:     centerX: 0.5,
452:     centerY: 0.5
453:   }
454: });
455: 
456: EffectRegistry.register({
457:   id: 'swirl',
458:   name: 'Swirl',
459:   description: 'Swirl/twist distortion effect',
460:   category: 'distort',
461:   version: '1.0.0',
462:   constructor: SwirlEffect,
463:   defaultConfig: {
464:     intensity: 0.8,
465:     centerX: 0.5,
466:     centerY: 0.5,
467:     radius: 0.4
468:   }
469: });
470: 
471: EffectRegistry.register({
472:   id: 'trail',
473:   name: 'Trail',
474:   description: 'Motion trail / afterimage effect',
475:   category: 'distort',
476:   version: '1.0.0',
477:   constructor: TrailEffect,
478:   defaultConfig: {
479:     intensity: 0.5,
480:     decay: 0.9
481:   }
482: });
483: 
484: EffectRegistry.register({
485:   id: 'waterRipples',
486:   name: 'Water Ripples',
487:   description: 'Water surface ripple simulation',
488:   category: 'distort',
489:   version: '1.0.0',
490:   constructor: WaterRipplesEffect,
491:   defaultConfig: {
492:     intensity: 0.5,
493:     speed: 1.0
494:   }
495: });
496: 
497: EffectRegistry.register({
498:   id: 'waves',
499:   name: 'Noise Waves',
500:   description: 'Perlin noise wave distortion',
501:   category: 'distort',
502:   version: '1.0.0',
503:   constructor: WavesEffect,
504:   defaultConfig: {
505:     intensity: 0.5,
506:     speed: 1.0
507:   }
508: });
509: 
510: // LIGHT CATEGORY EFFECTS
511: 
512: EffectRegistry.register({
513:   id: 'beam',
514:   name: 'Beam',
515:   description: 'Animated scanning light beam',
516:   category: 'Light',
517:   version: '1.0.0',
518:   constructor: BeamEffect,
519:   defaultConfig: {
520:     intensity: 1.0,
521:     speed: 0.5,
522:     width: 0.5,
523:     angle: 0.0,
524:     color: '#661aff'
525:   }
526: });
527: 
528: EffectRegistry.register({
529:   id: 'bloom',
530:   name: 'Bloom',
531:   description: 'High-quality bloom effect',
532:   category: 'Light',
533:   version: '1.0.0',
534:   constructor: BloomEffect,
535:   defaultConfig: {
536:     intensity: 1.0,
537:     threshold: 0.5,
538:     radius: 1.0
539:   }
540: });
541: 
542: EffectRegistry.register({
543:   id: 'godRays',
544:   name: 'God Rays',
545:   description: 'Volumetric light scattering',
546:   category: 'Light',
547:   version: '1.0.0',
548:   constructor: GodRaysEffect,
549:   defaultConfig: {
550:     intensity: 1.0,
551:     decay: 0.96,
552:     density: 0.5,
553:     weight: 0.4,
554:     lightX: 0.5,
555:     lightY: 0.5
556:   }
557: });
558: 
559: EffectRegistry.register({
560:   id: 'lightTrail',
561:   name: 'Light Trail',
562:   description: 'Mouse/Touch light trail effect',
563:   category: 'Light',
564:   version: '1.0.0',
565:   constructor: LightTrailEffect,
566:   defaultConfig: {
567:     intensity: 1.0,
568:     trailLength: 0.8,
569:     color: '#0082f7'
570:   }
571: });
572: 
573: EffectRegistry.register({
574:   id: 'waterCaustics',
575:   name: 'Water Caustics',
576:   description: 'Water surface caustics simulation',
577:   category: 'Light',
578:   version: '1.0.0',
579:   constructor: WaterCausticsEffect,
580:   defaultConfig: {
581:     intensity: 0.8,
582:     speed: 0.5,
583:     refraction: 0.5,
584:     color: '#99b3e6'
585:   }
586: });
587: 
588: // MISC CATEGORY EFFECTS
589: 
590: EffectRegistry.register({
591:   id: 'circle',
592:   name: 'Circle',
593:   description: 'Circular mask overlay',
594:   category: 'Misc',
595:   version: '1.0.0',
596:   constructor: CircleEffect,
597:   defaultConfig: {
598:     radius: 0.25,
599:     feather: 0.1,
600:     centerX: 0.5,
601:     centerY: 0.5,
602:     color: '#661aff',
603:     opacity: 1.0
604:   }
605: });
606: 
607: EffectRegistry.register({
608:   id: 'glitter',
609:   name: 'Glitter',
610:   description: 'Voronoi-based sparkle effect',
611:   category: 'Misc',
612:   version: '1.0.0',
613:   constructor: GlitterEffect,
614:   defaultConfig: {
615:     intensity: 1.0,
616:     scale: 1.0,
617:     speed: 0.5
618:   }
619: });
620: 
621: EffectRegistry.register({
622:   id: 'gradientFill',
623:   name: 'Gradient Fill',
624:   description: 'Procedural linear gradient with OKLab mixing',
625:   category: 'Misc',
626:   version: '1.0.0',
627:   constructor: GradientFillEffect,
628:   defaultConfig: {
629:     color1: '#000000',
630:     color2: '#ffffff',
631:     angle: 0.0,
632:     speed: 0.0,
633:     opacity: 1.0
634:   }
635: });
636: 
637: EffectRegistry.register({
638:   id: 'noiseFill',
639:   name: 'Noise Fill',
640:   description: 'Procedural BCC noise pattern',
641:   category: 'Misc',
642:   version: '1.0.0',
643:   constructor: NoiseFillEffect,
644:   defaultConfig: {
645:     color1: '#ffd198',
646:     color2: '#9600e6',
647:     scale: 1.0,
648:     speed: 0.5,
649:     opacity: 1.0
650:   }
651: });
652: 
653: EffectRegistry.register({
654:   id: 'pattern',
655:   name: 'Pattern',
656:   description: 'Procedural geometric patterns',
657:   category: 'Misc',
658:   version: '1.0.0',
659:   constructor: PatternEffect,
660:   defaultConfig: {
661:     patternType: 0,
662:     scale: 1.0,
663:     color: '#fa1ee3',
664:     opacity: 1.0
665:   }
666: });
667: 
668: EffectRegistry.register({
669:   id: 'replicate',
670:   name: 'Replicate',
671:   description: 'Trail and aberration effect',
672:   category: 'Misc',
673:   version: '1.0.0',
674:   constructor: ReplicateEffect,
675:   defaultConfig: {
676:     spacing: 0.35,
677:     speed: 0.5,
678:     rotation: 0.0,
679:     opacity: 1.0
680:   }
681: });
682: 
683: EffectRegistry.register({
684:   id: 'video',
685:   name: 'Video Overlay',
686:   description: 'Video texture overlay (requires video source)',
687:   category: 'Misc',
688:   version: '1.0.0',
689:   constructor: VideoEffect,
690:   defaultConfig: {
691:     scale: 1.0,
692:     rotation: 0.0,
693:     posX: 0.5,
694:     posY: 0.5,
695:     opacity: 1.0
696:   }
697: });
698: 
699: EffectRegistry.register({
700:   id: 'wisps',
701:   name: 'Wisps',
702:   description: 'Flowing smoke/wisp effect',
703:   category: 'Misc',
704:   version: '1.0.0',
705:   constructor: WispsEffect,
706:   defaultConfig: {
707:     speed: 0.5,
708:     scale: 1.0,
709:     intensity: 1.0,
710:     color: '#ffffff'
711:   }
712: });
```

## File: apps/api/src/routers/render.ts
```typescript
  1: import { z } from 'zod';
  2: import { router, protectedProcedure } from '../trpc';
  3: import { TRPCError } from '@trpc/server';
  4: import { renderMediaOnLambda, getRenderProgress } from '@remotion/lambda';
  5: import { logger } from '../lib/logger';
  6: import { r2Client, BUCKET_NAME } from '../services/r2-storage';
  7: import { PutObjectCommand } from '@aws-sdk/client-s3';
  8: 
  9: // Zod schemas for the render payload
 10: const audioBindingSchema = z.object({
 11:   feature: z.string(),
 12:   inputRange: z.tuple([z.number(), z.number()]),
 13:   outputRange: z.tuple([z.number(), z.number()]),
 14:   blendMode: z.enum(['add', 'multiply', 'replace']),
 15:   modulationAmount: z.number().optional(),
 16: });
 17: 
 18: const midiBindingSchema = z.object({
 19:   source: z.enum(['velocity', 'cc', 'pitchBend', 'channelPressure']),
 20:   inputRange: z.tuple([z.number(), z.number()]),
 21:   outputRange: z.tuple([z.number(), z.number()]),
 22:   blendMode: z.enum(['add', 'multiply', 'replace']),
 23: });
 24: 
 25: const layerSchema = z.object({
 26:   id: z.string(),
 27:   name: z.string(),
 28:   isDeletable: z.boolean().optional(),
 29:   type: z.string(),
 30:   src: z.string().optional(),
 31:   effectType: z.string().optional(),
 32:   settings: z.any().optional(),
 33:   position: z.object({ x: z.number(), y: z.number() }),
 34:   scale: z.object({ x: z.number(), y: z.number() }),
 35:   rotation: z.number(),
 36:   opacity: z.number(),
 37:   audioBindings: z.array(audioBindingSchema),
 38:   midiBindings: z.array(midiBindingSchema),
 39:   zIndex: z.number(),
 40:   blendMode: z.enum(['normal', 'multiply', 'screen', 'overlay']),
 41:   startTime: z.number(),
 42:   endTime: z.number(),
 43:   duration: z.number(),
 44: });
 45: 
 46: const visualizationSettingsSchema = z.object({
 47:   colorScheme: z.string().optional(),
 48:   pixelsPerSecond: z.number().optional(),
 49:   showTrackLabels: z.boolean().optional(),
 50:   showVelocity: z.boolean().optional(),
 51:   minKey: z.number().optional(),
 52:   maxKey: z.number().optional(),
 53:   aspectRatio: z.string().optional(), // youtube, tiktok, instagram, etc.
 54: });
 55: 
 56: // AudioAnalysisData schema - simplified to handle arrays as numbers
 57: const audioAnalysisDataSchema = z.object({
 58:   id: z.string(),
 59:   fileMetadataId: z.string(),
 60:   stemType: z.string(),
 61:   analysisData: z.object({
 62:     frameTimes: z.union([z.array(z.number()), z.any()]).optional(),
 63:     rms: z.union([z.array(z.number()), z.any()]),
 64:     loudness: z.union([z.array(z.number()), z.any()]),
 65:     spectralCentroid: z.union([z.array(z.number()), z.any()]),
 66:     spectralRolloff: z.union([z.array(z.number()), z.any()]).optional(),
 67:     spectralFlatness: z.union([z.array(z.number()), z.any()]).optional(),
 68:     zcr: z.union([z.array(z.number()), z.any()]).optional(),
 69:     fft: z.union([z.array(z.number()), z.any()]),
 70:     fftFrequencies: z.union([z.array(z.number()), z.any()]).optional(),
 71:     amplitudeSpectrum: z.union([z.array(z.number()), z.any()]).optional(),
 72:     volume: z.union([z.array(z.number()), z.any()]).optional(),
 73:     bass: z.union([z.array(z.number()), z.any()]).optional(),
 74:     mid: z.union([z.array(z.number()), z.any()]).optional(),
 75:     treble: z.union([z.array(z.number()), z.any()]).optional(),
 76:     features: z.union([z.array(z.number()), z.any()]).optional(),
 77:     markers: z.union([z.array(z.number()), z.any()]).optional(),
 78:     frequencies: z.union([z.array(z.number()), z.any()]).optional(),
 79:     timeData: z.union([z.array(z.number()), z.any()]).optional(),
 80:     stereoWindow_left: z.union([z.array(z.number()), z.any()]).optional(),
 81:     stereoWindow_right: z.union([z.array(z.number()), z.any()]).optional(),
 82:     transients: z.array(z.any()).optional(),
 83:     chroma: z.array(z.any()).optional(),
 84:     bpm: z.number().optional(),
 85:   }),
 86:   waveformData: z.object({
 87:     points: z.array(z.number()),
 88:     sampleRate: z.number(),
 89:     duration: z.number(),
 90:     markers: z.array(z.any()).optional(),
 91:   }),
 92:   metadata: z.object({
 93:     sampleRate: z.number(),
 94:     duration: z.number(),
 95:     bufferSize: z.number(),
 96:     featuresExtracted: z.array(z.string()),
 97:     analysisDuration: z.number(),
 98:     bpm: z.number().optional(),
 99:   }),
100:   bpm: z.number().optional(),
101: });
102: 
103: const triggerRenderSchema = z.object({
104:   layers: z.array(layerSchema),
105:   audioAnalysisData: z.array(audioAnalysisDataSchema),
106:   visualizationSettings: visualizationSettingsSchema,
107:   masterAudioUrl: z.string(),
108:   // Audio feature mappings for effect parameters (optional)
109:   mappings: z.record(
110:     z.string(),
111:     z.object({
112:       featureId: z.string().nullable(),
113:       modulationAmount: z.number(),
114:     })
115:   ).optional(),
116:   // Base parameter values before modulation (optional)
117:   baseParameterValues: z.record(
118:     z.string(),
119:     z.record(z.string(), z.any())
120:   ).optional(),
121:   // Audio modulation settings (TASK 4: previously stripped by Zod)
122:   featureDecayTimes: z.record(z.string(), z.number()).optional(),
123:   featureSensitivities: z.record(z.string(), z.number()).optional(),
124:   // Background color settings
125:   backgroundColor: z.string().optional(),
126:   isBackgroundVisible: z.boolean().optional(),
127: });
128: 
129: export const renderRouter = router({
130:   triggerRender: protectedProcedure
131:     .input(triggerRenderSchema)
132:     .mutation(async ({ input, ctx }) => {
133:       try {
134:         const region = 'us-east-1';
135:         const serveUrl = 'https://remotionlambda-useast1-zq6uoa8xhi.s3.us-east-1.amazonaws.com/sites/raybox-renderer/';
136:         const composition = 'RayboxMain';
137: 
138:         // 1. Generate a unique key for this render's analysis
139:         const analysisKey = `analysis-cache/${ctx.user.id}-${Date.now()}.json`;
140: 
141:         // 2. Upload the heavy audioAnalysisData to R2 as a static file
142:         // We do this here so the Lambda doesn't have to talk to Supabase
143:         await (r2Client as any).send(new PutObjectCommand({
144:           Bucket: BUCKET_NAME,
145:           Key: analysisKey,
146:           Body: JSON.stringify(input.audioAnalysisData),
147:           ContentType: 'application/json',
148:         }));
149: 
150:         const analysisUrl = `https://assets.raybox.fm/${analysisKey}`;
151: 
152:         logger.log('Uploaded analysis data to R2:', {
153:           key: analysisKey,
154:           url: analysisUrl,
155:           dataSize: JSON.stringify(input.audioAnalysisData).length,
156:         });
157: 
158:         // Hardcoded to stable nodejs20.x function — 4-0-436 (nodejs24.x) has
159:         // Chromium sandbox failures causing all renders to crash. Do not change this
160:         // to a dynamic selector until the nodejs24 issue is resolved.
161:         const functionName = 'remotion-render-4-0-390-mem3008mb-disk2048mb-300sec';
162:         logger.log(`Using stable Remotion function: ${functionName}`);
163: 
164:         logger.log('Triggering Remotion render:', {
165:           region,
166:           functionName,
167:           serveUrl,
168:           composition,
169:           userId: ctx.user.id,
170:           analysisUrl,
171:         });
172: 
173:         // 3. Trigger Lambda with retry logic for rate limits
174:         const maxRetries = 3;
175:         const baseDelayMs = 2000;
176:         let lastError: Error | null = null;
177: 
178:         for (let attempt = 0; attempt < maxRetries; attempt++) {
179:           try {
180:             const renderResult = await renderMediaOnLambda({
181:               region,
182:               functionName,
183:               serveUrl,
184:               composition,
185:               inputProps: {
186:                 ...input,
187:                 audioAnalysisData: [], // EMPTY THIS OUT to keep payload small
188:                 analysisUrl: analysisUrl, // PASS THE LINK INSTEAD
189:               },
190:               codec: 'h264',
191:               concurrencyPerRender: 1000,
192:               framesPerLambda: 20, // Match working render (w3sheoepsg) - 20 frames per Lambda works
193:               logLevel: 'verbose',
194:               timeoutInMilliseconds: 120000, // 120s — must exceed component's delayRender timeouts (60s slideshow, 120s init)
195:               chromiumOptions: {
196:                 gl: 'swangle', // Software WebGL via ANGLE+SwiftShader for no-GPU Lambda
197:                 // Required: explicit flag to allow software WebGL fallback.
198:                 // Without this, Chromium's passthrough decoder crashes (exit_code=9)
199:                 // when automatic fallback to SwiftShader is attempted and blocked.
200:                 args: ['--enable-unsafe-swiftshader'],
201:               },
202:             } as any);
203: 
204:             const { renderId, bucketName } = renderResult;
205:             const cloudWatchLogs = (renderResult as any).cloudWatchLogs;
206: 
207:             logger.log('Render triggered successfully:', { renderId, bucketName, functionName, cloudWatchLogs });
208: 
209:             return {
210:               renderId,
211:               bucketName,
212:               functionName,
213:               cloudWatchLogs,
214:             };
215:           } catch (error) {
216:             lastError = error instanceof Error ? error : new Error(String(error));
217:             const isRateLimit = lastError.message.includes('Rate Exceeded') ||
218:                                 lastError.message.includes('concurrency') ||
219:                                 lastError.message.includes('ConcurrentInvocationLimit');
220: 
221:             if (isRateLimit && attempt < maxRetries - 1) {
222:               const delayMs = baseDelayMs * Math.pow(2, attempt);
223:               logger.warn(`Lambda rate limit hit, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`);
224:               await new Promise(resolve => setTimeout(resolve, delayMs));
225:             } else {
226:               throw lastError;
227:             }
228:           }
229:         }
230: 
231:         // Should not reach here, but just in case
232:         throw lastError;
233:       } catch (error) {
234:         logger.error('Failed to trigger render:', error);
235:         throw new TRPCError({
236:           code: 'INTERNAL_SERVER_ERROR',
237:           message: error instanceof Error ? error.message : 'Failed to trigger render',
238:         });
239:       }
240:     }),
241: 
242:   getRenderStatus: protectedProcedure
243:     .input(
244:       z.object({
245:         renderId: z.string(),
246:         bucketName: z.string(),
247:         functionName: z.string(),
248:       })
249:     )
250:     .mutation(async ({ input }) => {
251:       try {
252:         const region = 'us-east-1';
253: 
254:         logger.log('Getting render status:', {
255:           region,
256:           functionName: input.functionName,
257:           renderId: input.renderId,
258:           bucketName: input.bucketName,
259:         });
260: 
261:         const progress = await getRenderProgress({
262:           renderId: input.renderId,
263:           bucketName: input.bucketName,
264:           functionName: input.functionName,
265:           region,
266:           skipLambdaInvocation: true,
267:         });
268: 
269:         logger.log('Render status retrieved:', {
270:           renderId: input.renderId,
271:           overallProgress: progress.overallProgress,
272:           done: progress.done,
273:         });
274: 
275:         return progress;
276:       } catch (error) {
277:         logger.error('Failed to get render status:', error);
278:         throw new TRPCError({
279:           code: 'INTERNAL_SERVER_ERROR',
280:           message: error instanceof Error ? error.message : 'Failed to get render status',
281:         });
282:       }
283:     }),
284: });
```

## File: apps/web/src/remotion/RayboxComposition.tsx
```typescript
  1: import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
  2: import {
  3:   useCurrentFrame,
  4:   useVideoConfig,
  5:   Audio,
  6:   delayRender,
  7:   continueRender,
  8:   random,
  9: } from 'remotion';
 10: import { VisualizerManager } from '@/lib/visualizer/core/VisualizerManager';
 11: import { EffectRegistry } from '@/lib/visualizer/effects/EffectRegistry';
 12: // Import EffectDefinitions to ensure effects are registered
 13: import '@/lib/visualizer/effects/EffectDefinitions';
 14: import type { RayboxCompositionProps } from './Root';
 15: import type { AudioAnalysisData as SimpleAudioAnalysisData } from '@/types/visualizer';
 16: import type { AudioAnalysisData as CachedAudioAnalysisData } from '@/types/audio-analysis-data';
 17: import type { SpawnEvent } from '@/lib/visualizer/effects/ParticleNetworkEffect';
 18: import { parseParamKey } from '@/lib/visualizer/paramKeys';
 19: import { debugLog } from '@/lib/utils';
 20: import { RemotionOverlayRenderer } from './RemotionOverlayRenderer';
 21: 
 22: const VALID_STEMS = new Set(['master', 'drums', 'bass', 'vocals', 'melody', 'other']);
 23: 
 24: /**
 25:  * Default decay times for stateless peaks calculation.
 26:  * Fast decay for drums, medium for bass/vocals/melody.
 27:  */
 28: const DEFAULT_PEAK_DECAY_TIMES: Record<string, number> = {
 29:   'drums-peaks': 0.3,   // Fast decay for drums
 30:   'bass-peaks': 0.5,    // Medium decay for bass
 31:   'vocals-peaks': 0.4,  // Medium-fast for vocals
 32:   'melody-peaks': 0.5,  // Medium for melody
 33:   'master-peaks': 0.4,  // Default
 34:   'other-peaks': 0.5,
 35: };
 36: 
 37: const DEFAULT_DECAY_TIME = 0.5;
 38: 
 39: /**
 40:  * Physics constants for momentum accumulator model.
 41:  *
 42:  * Unlike the old damped spring (wobble) model, this creates organic directional drift:
 43:  * - Peak hits → parameter gets bumped in a random direction (±1)
 44:  * - No spring-back/return-to-zero by default
 45:  * - Decay adds inertia (slows rate of change, doesn't pull back to zero)
 46:  * - Soft bounds gently push back toward base value at extremes
 47:  */
 48: const MOMENTUM_LOOKBACK_MULTIPLIER = 3; // Look back decayTime * this for transients
 49: const SOFT_BOUND_STRENGTH = 0.3;        // How strongly to pull back at extremes
 50: 
 51: /**
 52:  * Default sensitivity values for peaks features.
 53:  * 0.5 = 50% (keep upper half of transients by intensity)
 54:  * 1.0 = 100% (keep all transients)
 55:  */
 56: const DEFAULT_PEAK_SENSITIVITIES: Record<string, number> = {
 57:   'drums-peaks': 0.5,
 58:   'bass-peaks': 0.5,
 59:   'vocals-peaks': 0.5,
 60:   'melody-peaks': 0.5,
 61:   'master-peaks': 0.5,
 62:   'other-peaks': 0.5,
 63: };
 64: 
 65: /**
 66:  * Helper to filter transients by sensitivity.
 67:  * Ported from MappingSourcesPanel.tsx filterTransientsBySensitivity.
 68:  *
 69:  * @param sensitivity - 0-1 range, where 1 keeps all transients, 0 keeps only the strongest
 70:  */
 71: function filterTransientsBySensitivity(
 72:   transients: Array<{ time: number; intensity: number; type?: string }>,
 73:   sensitivity: number
 74: ): Array<{ time: number; intensity: number; type?: string }> {
 75:   if (!transients || transients.length === 0) return transients;
 76:   const clamped = Math.max(0, Math.min(1, sensitivity));
 77:   if (clamped >= 0.999) return transients;
 78: 
 79:   const intensities = transients
 80:     .map(t => t.intensity)
 81:     .filter(v => Number.isFinite(v))
 82:     .sort((a, b) => a - b);
 83: 
 84:   if (!intensities.length) return transients;
 85: 
 86:   const index = Math.floor((1 - clamped) * (intensities.length - 1));
 87:   const threshold = intensities[index];
 88: 
 89:   return transients.filter(t => (Number.isFinite(t.intensity) ? t.intensity : 0) >= threshold);
 90: }
 91: 
 92: /**
 93:  * Stateless peaks calculation for Remotion/Lambda rendering using momentum accumulator model.
 94:  *
 95:  * Algorithm (Momentum Accumulator):
 96:  * 1. Filter transients by sensitivity (remove quiet "noise" peaks)
 97:  * 2. For each transient in lookback window, add directional impulse (random ±1 per transient)
 98:  * 3. Impulses decay exponentially but don't oscillate (no sine wave = no wobble)
 99:  * 4. Apply soft bounds to gently push back toward base value at extremes
100:  *
101:  * Key differences from old wobble model:
102:  * - No oscillation (monotonic decay instead of sin wave)
103:  * - Random direction per transient creates organic drift
104:  * - Soft bounds instead of hard clamp
105:  * - Value drifts naturally, doesn't snap back to zero
106:  *
107:  * @param userDecayTimes - User-configured decay times from the export payload
108:  * @param userSensitivities - User-configured sensitivity values (0-1)
109:  * @param baseValue - The user's slider base value (default 0.5)
110:  */
111: function calculatePeaksValueStateless(
112:   transients: Array<{ time: number; intensity: number; type?: string }>,
113:   time: number,
114:   featureId: string,
115:   userDecayTimes?: Record<string, number>,
116:   userSensitivities?: Record<string, number>,
117:   frameForDebug?: number,
118:   baseValue: number = 0.5
119: ): number {
120:   if (!transients || transients.length === 0) return baseValue;
121: 
122:   // Priority: user-configured > hardcoded defaults > fallback
123:   const sensitivity = userSensitivities?.[featureId]
124:     ?? DEFAULT_PEAK_SENSITIVITIES[featureId]
125:     ?? 0.5; // Default to 50%
126: 
127:   // Filter transients by sensitivity BEFORE processing
128:   const filteredTransients = filterTransientsBySensitivity(transients, sensitivity);
129: 
130:   // DEBUG: Log sensitivity filtering
131:   if (frameForDebug !== undefined && frameForDebug < 5) {
132:     console.log(`[Peaks Debug] frame=${frameForDebug} ${featureId}: ${transients.length} → ${filteredTransients.length} transients (sensitivity=${sensitivity})`);
133:   }
134: 
135:   // If no transients remain after filtering, return base value
136:   if (!filteredTransients || filteredTransients.length === 0) {
137:     return baseValue;
138:   }
139: 
140:   // Priority: user-configured > hardcoded defaults > fallback
141:   const decayTime = userDecayTimes?.[featureId]
142:     ?? DEFAULT_PEAK_DECAY_TIMES[featureId]
143:     ?? DEFAULT_DECAY_TIME;
144: 
145:   // Lookback window based on decay time
146:   const lookbackWindow = decayTime * MOMENTUM_LOOKBACK_MULTIPLIER;
147: 
148:   // MOMENTUM ACCUMULATOR: Sum directional impulses that decay over time
149:   let totalMomentum = 0;
150: 
151:   for (const transient of filteredTransients) {
152:     const elapsed = time - transient.time;
153: 
154:     // Skip future or too-old transients
155:     if (elapsed < 0 || elapsed > lookbackWindow) continue;
156: 
157:     // Deterministic direction from seeded random using Remotion's random()
158:     // This ensures same result across renders
159:     const direction = random(`peak-${transient.time}`) > 0.5 ? 1 : -1;
160: 
161:     // Exponential decay - impulse fades over time but doesn't oscillate
162:     // (No sine wave = no wobble, just monotonic decay)
163:     const decayFactor = Math.exp(-elapsed / decayTime);
164: 
165:     // Accumulate momentum (no sine wave = no wobble)
166:     totalMomentum += transient.intensity * direction * decayFactor;
167:   }
168: 
169:   // Soft bounds: reduce momentum if it would push too far from [0, 1]
170:   const projectedValue = baseValue + totalMomentum;
171: 
172:   if (projectedValue > 1) {
173:     const overshoot = projectedValue - 1;
174:     totalMomentum -= overshoot * SOFT_BOUND_STRENGTH;
175:   } else if (projectedValue < 0) {
176:     const undershoot = -projectedValue;
177:     totalMomentum += undershoot * SOFT_BOUND_STRENGTH;
178:   }
179: 
180:   const result = Math.max(0, Math.min(1, baseValue + totalMomentum));
181: 
182:   // DEBUG: Log computed value
183:   if (frameForDebug !== undefined && (frameForDebug < 10 || frameForDebug % 60 === 0)) {
184:     console.log(`[Peaks Debug] frame=${frameForDebug} time=${time.toFixed(3)} featureId=${featureId} → value=${result.toFixed(4)} (baseValue=${baseValue.toFixed(2)}, decayTime=${decayTime.toFixed(2)})`);
185:   }
186: 
187:   return result;
188: }
189: 
190: /**
191:  * Helper function to extract audio feature values at a specific time from cached analysis data.
192:  * Adapted from use-audio-analysis.ts getFeatureValue logic.
193:  *
194:  * @param userDecayTimes - User-configured decay times for peaks features
195:  * @param userSensitivities - User-configured sensitivity values for peaks features
196:  * @param frameForDebug - Optional frame number for debug logging
197:  * @param baseValue - Base value from user's slider (for momentum accumulator model)
198:  */
199: function getFeatureValueFromCached(
200:   cachedAnalysis: CachedAudioAnalysisData[],
201:   fileId: string,
202:   feature: string,
203:   time: number,
204:   stemType?: string,
205:   userDecayTimes?: Record<string, number>,
206:   userSensitivities?: Record<string, number>,
207:   frameForDebug?: number,
208:   baseValue?: number,
209: ): number {
210:   let parsedStem = stemType ?? 'master';
211:   let featureName = feature;
212: 
213:   if (feature.includes('-')) {
214:     const parts = feature.split('-');
215:     const potentialStem = parts[0];
216: 
217:     if (VALID_STEMS.has(potentialStem.toLowerCase())) {
218:       parsedStem = potentialStem;
219:       featureName = parts.slice(1).join('-');
220:     }
221:   }
222: 
223:   let analysis = cachedAnalysis.find(
224:     (a) => a.fileMetadataId === fileId && a.stemType === parsedStem,
225:   );
226: 
227:   if (!analysis) {
228:     analysis = cachedAnalysis.find((a) => a.stemType === parsedStem);
229:   }
230: 
231:   if (!analysis?.analysisData) return 0;
232:   const { analysisData } = analysis;
233: 
234:   const getTimeSeriesValue = (arr: any) => {
235:     if (!arr || arr.length === 0) return 0;
236:     const times = analysisData.frameTimes as number[];
237:     if (!times || times.length === 0) return 0;
238: 
239:     let lo = 0,
240:       hi = times.length - 1;
241:     while (lo < hi) {
242:       const mid = (lo + hi + 1) >>> 1;
243:       if (times[mid] <= time) lo = mid;
244:       else hi = mid - 1;
245:     }
246:     return arr[lo] ?? 0;
247:   };
248: 
249:   const normalizedFeature = featureName.toLowerCase().replace(/-/g, '');
250: 
251:   // Handle peaks/transients case - stateless calculation
252:   if (normalizedFeature === 'peaks') {
253:     const transients = (analysisData as any).transients;
254:     if (!transients || !Array.isArray(transients)) {
255:       if (frameForDebug !== undefined && frameForDebug < 5) {
256:         console.log(`[Peaks Debug] frame=${frameForDebug} NO TRANSIENTS for ${parsedStem}-peaks (transients=${transients})`);
257:       }
258:       return 0;
259:     }
260: 
261:     // Construct full feature ID for decay time lookup
262:     const fullFeatureId = `${parsedStem}-peaks`;
263: 
264:     // DEBUG: Log first transient time to verify correct stem data
265:     if (frameForDebug !== undefined && frameForDebug < 5) {
266:       console.log(`[Peaks Debug] frame=${frameForDebug} ${fullFeatureId} has ${transients.length} transients, first at t=${transients[0]?.time?.toFixed(3)}`);
267:     }
268: 
269:     return calculatePeaksValueStateless(
270:       transients,
271:       time,
272:       fullFeatureId,
273:       userDecayTimes,
274:       userSensitivities,
275:       frameForDebug,
276:       baseValue ?? 0.5  // Default to 0.5 if not provided
277:     );
278:   }
279: 
280:   switch (normalizedFeature) {
281:     case 'rms':
282:       return getTimeSeriesValue(analysisData.rms);
283:     case 'volume':
284:       return getTimeSeriesValue(analysisData.rms ?? analysisData.volume);
285:     case 'loudness':
286:       return getTimeSeriesValue(analysisData.loudness);
287:     case 'spectralcentroid':
288:       return getTimeSeriesValue(analysisData.spectralCentroid);
289:     case 'spectralrolloff':
290:       return getTimeSeriesValue(analysisData.spectralRolloff);
291:     case 'spectralflux':
292:       return getTimeSeriesValue((analysisData as any).spectralFlux);
293:     case 'bass':
294:       return getTimeSeriesValue(analysisData.bass);
295:     case 'mid':
296:       return getTimeSeriesValue(analysisData.mid);
297:     case 'treble':
298:       return getTimeSeriesValue(analysisData.treble);
299:     default:
300:       return 0;
301:   }
302: }
303: 
304: /**
305:  * Convert cached audio analysis data to simple AudioAnalysisData format at a specific time.
306:  * Exported so Remotion-specific overlay renderer can reuse audio sampling logic.
307:  */
308: export function extractAudioDataAtTime(
309:   cachedAnalysis: CachedAudioAnalysisData[] | undefined,
310:   fileId: string | undefined,
311:   time: number,
312:   stemType?: string
313: ): SimpleAudioAnalysisData | null {
314:   if (!cachedAnalysis || !fileId || cachedAnalysis.length === 0) {
315:     return null;
316:   }
317: 
318:   // Extract feature values at the current time
319:   const volume = getFeatureValueFromCached(cachedAnalysis, fileId, 'volume', time, stemType);
320:   const bass = getFeatureValueFromCached(cachedAnalysis, fileId, 'bass', time, stemType);
321:   const mid = getFeatureValueFromCached(cachedAnalysis, fileId, 'mid', time, stemType);
322:   const treble = getFeatureValueFromCached(cachedAnalysis, fileId, 'treble', time, stemType);
323:   const spectralCentroid = getFeatureValueFromCached(cachedAnalysis, fileId, 'spectral-centroid', time, stemType);
324: 
325:   // Get frequencies and timeData from the analysis
326:   let analysis = cachedAnalysis.find(
327:     a => a.fileMetadataId === fileId && a.stemType === (stemType ?? 'master')
328:   );
329: 
330:   // FALLBACK: If strict ID match fails, try matching by stemType only
331:   if (!analysis) {
332:     analysis = cachedAnalysis.find(a => a.stemType === (stemType ?? 'master'));
333:   }
334: 
335:   if (!analysis) {
336:     return null;
337:   }
338: 
339:   // Extract frequency data (FFT) at the current time
340:   const fft = analysis.analysisData.fft;
341:   const frameTimes = analysis.analysisData.frameTimes;
342:   let frequencies: number[] = [];
343:   let timeData: number[] = [];
344: 
345:   // Check for real stereo window data first (per-frame extraction)
346:   const stereoWindowLeft = (analysis.analysisData as any).stereoWindow_left;
347:   const stereoWindowRight = (analysis.analysisData as any).stereoWindow_right;
348:   const hasRealStereoData = stereoWindowLeft && stereoWindowRight &&
349:     Array.isArray(stereoWindowLeft) && Array.isArray(stereoWindowRight) &&
350:     stereoWindowLeft.length > 0 && stereoWindowRight.length > 0;
351: 
352:   if (hasRealStereoData) {
353:     // Calculate samples per frame for the flattened stereo window arrays
354:     const samplesPerFrame = stereoWindowLeft.length > 0 ? 1024 : 256; // Default to 1024 (N value from worker)
355:     const totalFrames = Math.floor(stereoWindowLeft.length / samplesPerFrame);
356: 
357:     // Find the frame index closest to the current time
358:     let effectiveFrameTimes = frameTimes;
359:     if (!effectiveFrameTimes || !Array.isArray(effectiveFrameTimes) || effectiveFrameTimes.length === 0) {
360:       const duration = (analysis.analysisData as any).analysisDuration || analysis.metadata?.duration || 30;
361:       effectiveFrameTimes = Array.from({ length: totalFrames }, (_, i) => (i / totalFrames) * duration);
362:     }
363: 
364:     let frameIndex = 0;
365:     for (let i = 0; i < effectiveFrameTimes.length; i++) {
366:       if (effectiveFrameTimes[i] <= time) {
367:         frameIndex = i;
368:       } else {
369:         break;
370:       }
371:     }
372: 
373:     // Extract the stereo window for this frame
374:     const startIdx = frameIndex * samplesPerFrame;
375:     const endIdx = Math.min(startIdx + samplesPerFrame, stereoWindowLeft.length);
376: 
377:     if (startIdx < stereoWindowLeft.length) {
378:       timeData = [
379:         ...stereoWindowLeft.slice(startIdx, endIdx),
380:         ...stereoWindowRight.slice(startIdx, endIdx)
381:       ];
382:     }
383:   } else if (fft && Array.isArray(fft) && fft.length > 0) {
384:     // Fallback: Generate time-domain approximation from FFT magnitudes (only if no real stereo data)
385:     // FIX: Add linear interpolation fallback when frameTimes is missing
386:     // This handles compressed payloads where frameTimes is not included
387:     let effectiveFrameTimes = frameTimes;
388:     let binsPerFrame = 1;
389: 
390:     if (!effectiveFrameTimes || !Array.isArray(effectiveFrameTimes) || effectiveFrameTimes.length === 0) {
391:       // Generate synthetic linear frameTimes based on analysis duration
392:       const duration = (analysis.analysisData as any).analysisDuration || analysis.metadata?.duration || 30;
393:       const numFrames = Math.min(fft.length, 256); // Assume reasonable frame count
394:       effectiveFrameTimes = Array.from({ length: numFrames }, (_, i) => (i / numFrames) * duration);
395:       binsPerFrame = Math.floor(fft.length / numFrames);
396:     } else {
397:       // [CHANGE 2] Dynamically calculate bin size instead of hardcoding 256
398:       binsPerFrame = Math.floor(fft.length / effectiveFrameTimes.length);
399:     }
400: 
401:     // Find the frame index closest to the current time
402:     let frameIndex = 0;
403:     for (let i = 0; i < effectiveFrameTimes.length; i++) {
404:       if (effectiveFrameTimes[i] <= time) {
405:         frameIndex = i;
406:       } else {
407:         break;
408:       }
409:     }
410: 
411:     if (binsPerFrame > 0) {
412:       const startIdx = frameIndex * binsPerFrame;
413:       const endIdx = Math.min(startIdx + binsPerFrame, fft.length);
414: 
415:       if (startIdx < fft.length) {
416:         frequencies = Array.from(fft.slice(startIdx, endIdx));
417:         // FIX: Generate time-domain approximation from FFT magnitudes
418:         // This is needed for stereometer which requires timeData
419:         // Generate a sine wave approximation from FFT magnitudes
420:         const numSamples = Math.min(binsPerFrame, 256);
421:         timeData = [];
422:         for (let i = 0; i < numSamples; i++) {
423:           // Create a simple approximation using the FFT magnitude
424:           const fftIdx = Math.min(startIdx + i, fft.length - 1);
425:           const mag = fft[fftIdx] || 0;
426:           // Add some variation based on index to simulate waveform
427:           const wave = Math.sin(i * 0.1) * mag * 0.3 + Math.cos(i * 0.05) * mag * 0.2;
428:           timeData.push(Math.max(-1, Math.min(1, wave)));
429:         }
430:       }
431:     }
432:   }
433: 
434:   return {
435:     frequencies: frequencies.length > 0 ? frequencies : new Array(256).fill(0),
436:     timeData: timeData.length > 0 ? timeData : new Array(256).fill(0),
437:     volume,
438:     bass,
439:     mid,
440:     treble,
441:   };
442: }
443: 
444: export const RayboxComposition: React.FC<RayboxCompositionProps> = ({
445:   layers,
446:   audioAnalysisData,
447:   visualizationSettings,
448:   masterAudioUrl,
449:   mappings,
450:   baseParameterValues,
451:   featureDecayTimes,
452:   featureSensitivities,
453:   analysisUrl,
454:   backgroundColor,
455:   isBackgroundVisible,
456: }) => {
457:   const frame = useCurrentFrame();
458:   const { fps, width, height } = useVideoConfig();
459:   const canvasRef = useRef<HTMLCanvasElement>(null);
460:   const visualizerManagerRef = useRef<VisualizerManager | null>(null);
461:   const effectInstancesRef = useRef<Map<string, any>>(new Map());
462:   // Increase timeout to 120 seconds for large payload loading
463:   const [handle] = useState(() => delayRender('Initializing Visualizer', { timeoutInMilliseconds: 120000 }));
464:   const isInitializedRef = useRef(false);
465: 
466:   // State for fetched analysis data.
467:   // In Lambda: calculateMetadata fetches from analysisUrl and injects audioAnalysisData into chunk
468:   // props, so audioAnalysisData is populated directly. fetchedAudioAnalysisData stays null.
469:   // In CLI/standalone: audioAnalysisData may be empty (no calculateMetadata), so we fetch from
470:   // analysisUrl and store here so waitForAssets can use it.
471:   const [fetchedAudioAnalysisData, setFetchedAudioAnalysisData] = useState<typeof audioAnalysisData | null>(null);
472: 
473:   // Fetch analysis data from R2 if analysisUrl exists and audioAnalysisData is empty.
474:   // In Lambda: audioAnalysisData is populated via calculateMetadata, so this is skipped.
475:   // In CLI/standalone: audioAnalysisData may be empty, so we fetch from analysisUrl.
476:   useEffect(() => {
477:     if (analysisUrl && (!audioAnalysisData || audioAnalysisData.length === 0)) {
478:       console.log('[RayboxComposition] Fetching analysis data from:', analysisUrl);
479:       fetch(analysisUrl)
480:         .then(res => {
481:           if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
482:           return res.json();
483:         })
484:         .then(data => {
485:           console.log('[RayboxComposition] Fetched analysis data:', data.length, 'entries');
486:           setFetchedAudioAnalysisData(data);
487:         })
488:         .catch(err => {
489:           console.error('[RayboxComposition] Failed to fetch analysis data:', err);
490:         });
491:     }
492:   }, [analysisUrl, audioAnalysisData]);
493: 
494:   const actualLayers = layers || [];
495:   // Use fetched data if available, otherwise use prop data
496:   const actualAudioAnalysisData = fetchedAudioAnalysisData || audioAnalysisData || [];
497: 
498:   // 1. Initialize Visualizer (useLayoutEffect) - runs once on mount
499:   useLayoutEffect(() => {
500:     // Early return if already initialized or canvas not ready
501:     if (isInitializedRef.current) return;
502:     if (!canvasRef.current) {
503:       console.warn('[RayboxComposition] Canvas ref not ready, waiting for next render');
504:       return;
505:     }
506: 
507:     let isNewManager = false;
508:     let safetyTimeout: NodeJS.Timeout | null = null;
509: 
510:     if (!visualizerManagerRef.current) {
511:       try {
512:         console.log('[RayboxComposition] Creating VisualizerManager...');
513:         visualizerManagerRef.current = new VisualizerManager(canvasRef.current, {
514:           canvas: { width, height, pixelRatio: 1 },
515:           performance: { targetFPS: fps, enableShadows: false },
516:           midi: { velocitySensitivity: 1.0, noteTrailDuration: 2.0, trackColorMapping: {} },
517:         });
518:         isNewManager = true;
519:         // If a new manager is created, any cached effect refs are stale.
520:         effectInstancesRef.current.clear();
521:         console.log('[RayboxComposition] VisualizerManager created successfully');
522:       } catch (e) {
523:         console.error('[RayboxComposition] Failed to initialize VisualizerManager:', e);
524:         // Log error but continue - let the render attempt to proceed
525:         // The canvas will just be black if WebGL fails, but won't crash the render
526:         isInitializedRef.current = true;
527:         continueRender(handle);
528:         return;
529:       }
530:     }
531: 
532:     const manager = visualizerManagerRef.current;
533:     if (manager) {
534:       // Ensure renderer matches latest dimensions to avoid aspect ratio glitches.
535:       manager.handleViewportResize(width, height);
536: 
537:       if (visualizationSettings) {
538:         manager.updateSettings(visualizationSettings as unknown as Record<string, number>);
539:       }
540: 
541:       // Apply background color settings from project
542:       if (backgroundColor && typeof manager.setBackgroundColor === 'function') {
543:         manager.setBackgroundColor(backgroundColor);
544:       }
545:       if (isBackgroundVisible !== undefined && typeof manager.setBackgroundVisibility === 'function') {
546:         manager.setBackgroundVisibility(isBackgroundVisible);
547:       }
548: 
549:       const effectLayers = actualLayers.filter((l) => l.type === 'effect' && l.effectType);
550:       console.log(`[RayboxComposition] Creating ${effectLayers.length} effects...`);
551:       for (const layer of effectLayers) {
552:         const hasRef = effectInstancesRef.current.has(layer.id);
553:         const managerHasEffect =
554:           typeof manager.getEffect === 'function' ? !!manager.getEffect(layer.id) : false;
555: 
556:         if (!hasRef || !managerHasEffect || isNewManager) {
557:           const baseValues = baseParameterValues?.[layer.id] || {};
558:           const mergedSettings = { ...layer.settings, ...baseValues };
559:           const effectType = layer.effectType as string;
560:           const effect = EffectRegistry.createEffect(effectType, mergedSettings);
561:           if (effect) {
562:             effectInstancesRef.current.set(layer.id, effect);
563:             manager.addEffect(layer.id, effect);
564:           }
565:         }
566:       }
567:     }
568: 
569:     // Wait for assets to load before continuing
570:     const waitForAssets = async () => {
571:       try {
572:         const asyncEffects = Array.from(effectInstancesRef.current.values()).filter(
573:           (effect) => typeof (effect as any).waitForImages === 'function',
574:         );
575: 
576:         console.log(`[RayboxComposition] Waiting for ${asyncEffects.length} effects with images...`);
577:         console.log(`[RayboxComposition] waitForAssets: actualAudioAnalysisData.length=${actualAudioAnalysisData?.length ?? 'null/undefined'}`);
578: 
579:         // Pre-populate slideEvents on slideshow effects so waitForImages can preload correctly.
580:         // In Lambda chunks: audioAnalysisData is provided directly via props (serialized by calculateMetadata).
581:         // This ensures slideshow effects have their slide events before waitForImages is called.
582:         if (actualAudioAnalysisData && actualAudioAnalysisData.length > 0 && manager) {
583:           const slideshowLayers = actualLayers.filter(
584:             l => l.type === 'effect' && l.effectType === 'imageSlideshow'
585:           );
586:           for (const layer of slideshowLayers) {
587:             const stemType = (layer.settings?.stemType as string) || 'drums';
588:             const stemAnalysis = (actualAudioAnalysisData as any[]).find(
589:               (a: any) => a.stemType === stemType
590:             );
591:             if (stemAnalysis?.analysisData) {
592:               const transients = (stemAnalysis.analysisData as any).transients;
593:               if (transients && Array.isArray(transients)) {
594:                 const slideEvents = transients.map((t: any) => ({
595:                   time: t.time,
596:                   intensity: t.intensity || 1.0,
597:                 }));
598:                 manager.updateEffectParameter(layer.id, 'slideEvents', slideEvents);
599:                 console.log(`[RayboxComposition] Pre-populated ${slideEvents.length} slideEvents for layer ${layer.id}`);
600:               }
601:             }
602:           }
603:         }
604: 
605:         if (asyncEffects.length > 0) {
606:           console.log(`[RayboxComposition] Calling waitForImages on ${asyncEffects.length} effects (8s timeout)...`);
607:           const startTime = Date.now();
608:           await Promise.race([
609:             Promise.all(asyncEffects.map((effect) => (effect as any).waitForImages())),
610:             new Promise((r) => setTimeout(r, 8000)),
611:           ]);
612:           console.log(`[RayboxComposition] waitForImages resolved after ${Date.now() - startTime}ms`);
613:         } else {
614:           console.log('[RayboxComposition] No async effects to wait for');
615:         }
616:         console.log('[RayboxComposition] Asset loading complete');
617:       } catch (e) {
618:         console.warn('[RayboxComposition] Asset waiting warning:', e);
619:       } finally {
620:         if (!isInitializedRef.current) {
621:           isInitializedRef.current = true;
622:           console.log('[RayboxComposition] Calling continueRender from waitForAssets');
623:           continueRender(handle);
624:         }
625:         // Clear safety timeout since we're done
626:         if (safetyTimeout) {
627:           clearTimeout(safetyTimeout);
628:           safetyTimeout = null;
629:         }
630:       }
631:     };
632: 
633:     waitForAssets().catch((err) => {
634:       console.error('[RayboxComposition] waitForAssets failed:', err);
635:       if (!isInitializedRef.current) {
636:         isInitializedRef.current = true;
637:         continueRender(handle);
638:       }
639:       if (safetyTimeout) {
640:         clearTimeout(safetyTimeout);
641:         safetyTimeout = null;
642:       }
643:     });
644: 
645:     // Safety timeout: always clear the delayRender after 15 seconds
646:     // (reduced from 20s to give more margin before 33s Remotion timeout)
647:     safetyTimeout = setTimeout(() => {
648:       if (!isInitializedRef.current) {
649:         console.warn('[RayboxComposition] Safety timeout: forcing continueRender after 15s');
650:         isInitializedRef.current = true;
651:         continueRender(handle);
652:       }
653:     }, 15000);
654: 
655:     // Cleanup function to clear timeout on unmount
656:     return () => {
657:       if (safetyTimeout) {
658:         clearTimeout(safetyTimeout);
659:       }
660:     };
661:   // eslint-disable-next-line react-hooks/exhaustive-deps
662:   }, [width, height, fps]); // Removed actualLayers to prevent re-runs during init
663: 
664:   // 1b. Update effects when layers change (after initialization)
665:   useLayoutEffect(() => {
666:     if (!isInitializedRef.current || !visualizerManagerRef.current) return;
667: 
668:     const manager = visualizerManagerRef.current;
669:     const effectLayers = actualLayers.filter((l) => l.type === 'effect' && l.effectType);
670: 
671:     for (const layer of effectLayers) {
672:       const hasRef = effectInstancesRef.current.has(layer.id);
673:       const managerHasEffect =
674:         typeof manager.getEffect === 'function' ? !!manager.getEffect(layer.id) : false;
675: 
676:       if (!hasRef || !managerHasEffect) {
677:         const baseValues = baseParameterValues?.[layer.id] || {};
678:         const mergedSettings = { ...layer.settings, ...baseValues };
679:         const effectType = layer.effectType as string;
680:         const effect = EffectRegistry.createEffect(effectType, mergedSettings);
681:         if (effect) {
682:           effectInstancesRef.current.set(layer.id, effect);
683:           manager.addEffect(layer.id, effect);
684:         }
685:       } else {
686:         // Effect already exists - update its parameters from layer.settings
687:         // This ensures settings changes are applied on each render
688:         const existingEffect = effectInstancesRef.current.get(layer.id);
689:         if (existingEffect && layer.settings) {
690:           for (const [paramName, value] of Object.entries(layer.settings)) {
691:             if (value !== undefined && value !== null) {
692:               existingEffect.updateParameter(paramName, value);
693:             }
694:           }
695:         }
696:       }
697:     }
698:   }, [actualLayers, baseParameterValues]);
699: 
700:   // 2. Render Loop (useLayoutEffect) - runs on every frame
701:   useLayoutEffect(() => {
702:     if (!visualizerManagerRef.current || !isInitializedRef.current) return;
703:     
704:     const time = frame / fps;
705:     const deltaTime = 1 / fps;
706:     const shouldLogMapping = frame < 3 || frame % Math.max(1, Math.round(fps)) === 0;
707:     const mappingLogEntries: Array<{
708:       paramKey: string;
709:       layerId: string;
710:       paramName: string;
711:       baseValue: number;
712:       rawValue: number;
713:       knob: number;
714:       delta: number;
715:       finalValue: number;
716:     }> = [];
717: 
718:     // 1. Map StemTypes to IDs for lookup
719:     const stemMap = new Map(actualAudioAnalysisData.map(a => [a.stemType, a.fileMetadataId]));
720:     
721:     const fileId = actualAudioAnalysisData.find((a) => a.stemType === 'master')?.fileMetadataId;
722:     const audioData = extractAudioDataAtTime(
723:       actualAudioAnalysisData as unknown as CachedAudioAnalysisData[],
724:       fileId || 'unknown',
725:       time,
726:       'master',
727:     );
728: 
729:     // DEBUG: Check if mappings exist - ALWAYS LOG TO TERMINAL
730:     if (frame === 0) {
731:       console.log('[MAPPING DEBUG] mappings:', mappings);
732:       console.log('[MAPPING DEBUG] actualLayers:', actualLayers.map(l => l.id));
733:       console.log('[MAPPING DEBUG] audioAnalysisData:', actualAudioAnalysisData.length, 'entries');
734:     }
735:     if (mappings && Object.keys(mappings).length > 0) {
736:       // Map parameter names to their valid max ranges
737:       const getSliderMax = (p: string): number => {
738:         const paramMaxMap: Record<string, number> = {
739:           // 0-1 range parameters
740:           opacity: 1.0,
741:           scale: 1.0,
742:           baseRadius: 1.0,
743:           threshold: 1.0,
744:           triggerValue: 1.0,
745:           // 0-2 range parameters
746:           contrast: 2.0,
747:           gamma: 2.2,
748:           // 0-100 range parameters (for legacy)
749:           rotation: 360,
750:           speed: 100,
751:         };
752:         return paramMaxMap[p] ?? 100; // Default to 100 for unknown params
753:       };
754: 
755:       Object.entries(mappings).forEach(([paramKey, mapping]) => {
756:         if (!mapping?.featureId) return;
757:         const parsed = parseParamKey(paramKey);
758:         if (!parsed) return;
759:         const { effectInstanceId: layerId, paramName } = parsed;
760: 
761:         // IMPORTANT: For mapped parameters, we must use STATIC base values only.
762:         // Do NOT read from effectInstancesRef.current.get(layerId)?.parameters
763:         // because those are dynamically updated each frame, causing accumulation.
764:         let baseValue = baseParameterValues?.[layerId]?.[paramName];
765:         if (baseValue === undefined)
766:           baseValue = actualLayers.find((l) => l.id === layerId)?.settings?.[paramName];
767:         // Default to 0 for unmapped base values - this prevents accumulation
768:         // since modulation is additive (baseValue + delta)
769:         if (baseValue === undefined) baseValue = 0;
770: 
771:         // DEBUG
772:         if (frame < 5) {
773:           console.log(`[DEBUG] Mapping ${paramKey}:`, {
774:             layerId,
775:             paramName,
776:             baseValue,
777:             hasBaseInParams: !!baseParameterValues?.[layerId],
778:             baseParamKeys: Object.keys(baseParameterValues || {}),
779:             layerIds: actualLayers.map(l => l.id),
780:           });
781:         }
782: 
783:         // FIX: Find the correct fileId based on the feature prefix (e.g. "bass-rms")
784:         const featureStemType = mapping.featureId.split('-')[0] || 'master';
785:         const targetFileId = stemMap.get(featureStemType) || fileId || 'unknown';
786: 
787:         const rawValue = getFeatureValueFromCached(
788:           actualAudioAnalysisData as unknown as CachedAudioAnalysisData[],
789:           targetFileId, // Pass real ID!
790:           mapping.featureId,
791:           time,
792:           undefined, // stemType - let function parse from featureId
793:           featureDecayTimes, // User-configured decay times
794:           featureSensitivities, // User-configured sensitivities
795:           frame, // For debug logging
796:         );
797: 
798:         const maxValue = getSliderMax(paramName);
799:         const knob = Math.max(-0.5, Math.min(0.5, (mapping.modulationAmount ?? 0.5) * 2 - 1));
800:         const delta = rawValue * knob * maxValue;
801:         const finalValue = Math.max(0, Math.min(maxValue, baseValue + delta));
802: 
803:         // DEBUG: Enhanced logging for triggerValue mapping
804:         if (frame < 5 || (paramName === 'triggerValue' && frame % 30 === 0)) {
805:           console.log(`[Mapping Calc] frame=${frame} ${paramKey}:`, {
806:             featureId: mapping.featureId,
807:             targetFileId,
808:             rawValue: rawValue.toFixed(4),
809:             baseValue,
810:             knob: knob.toFixed(4),
811:             maxValue,
812:             delta: delta.toFixed(4),
813:             finalValue: finalValue.toFixed(4),
814:           });
815:         }
816: 
817:         if (!Number.isNaN(finalValue)) {
818:           visualizerManagerRef.current?.updateEffectParameter(layerId, paramName, finalValue);
819:           if (shouldLogMapping) {
820:             mappingLogEntries.push({
821:               paramKey,
822:               layerId,
823:               paramName,
824:               baseValue,
825:               rawValue,
826:               knob,
827:               delta,
828:               finalValue,
829:             });
830:           }
831:         }
832:       });
833:     }
834: 
835:     if (shouldLogMapping && mappingLogEntries.length > 0) {
836:       debugLog.log('🎚️ Audio mapping frame snapshot', {
837:         frame,
838:         time: Number(time.toFixed(3)),
839:         entries: mappingLogEntries,
840:       });
841:     }
842: 
843:     visualizerManagerRef.current.updateTimelineState(actualLayers, time);
844:     if (audioData) visualizerManagerRef.current.setAudioData(audioData);
845: 
846:     // 2b. Pass spawn events to particle network effects for stateless Lambda rendering
847:     // Find all particle network layers and inject spawn events from audio transients
848:     const particleEffectLayers = actualLayers.filter(
849:       l => l.type === 'effect' && l.effectType === 'particleNetwork'
850:     );
851: 
852:     for (const layer of particleEffectLayers) {
853:       // Determine which stem to use for this particle effect
854:       // Priority: layer-specific setting > 'drums' (most common for particles)
855:       const stemType = (layer.settings?.stemType as string) || 'drums';
856: 
857:       // Find the audio analysis data for this stem
858:       const stemAnalysis = actualAudioAnalysisData.find(
859:         a => a.stemType === stemType
860:       );
861: 
862:       if (stemAnalysis?.analysisData) {
863:         const transients = (stemAnalysis.analysisData as any).transients;
864: 
865:         if (transients && Array.isArray(transients)) {
866:           // Convert transients to spawn events
867:           const spawnEvents: SpawnEvent[] = transients.map((t: any) => ({
868:             time: t.time,
869:             intensity: t.intensity,
870:             stemType,
871:           }));
872: 
873:           // Update the effect parameter
874:           visualizerManagerRef.current?.updateEffectParameter(layer.id, 'spawnEvents', spawnEvents);
875: 
876:           // DEBUG: Log on first few frames
877:           if (frame < 3) {
878:             console.log(`[ParticleSpawn] frame=${frame} layer=${layer.id}: ${spawnEvents.length} spawn events from ${stemType}`);
879:           }
880:         }
881:       }
882:     }
883: 
884:     // 2c. Pass slide events to image slideshow effects for stateless Lambda rendering
885:     // Similar to particle effects, but for image slideshow transitions
886:     const slideshowLayers = actualLayers.filter(
887:       l => l.type === 'effect' && l.effectType === 'imageSlideshow'
888:     );
889: 
890:     for (const layer of slideshowLayers) {
891:       // Determine which stem to use for slideshow triggers
892:       // Priority: layer-specific setting > 'drums' (most common for beats)
893:       const stemType = (layer.settings?.stemType as string) || 'drums';
894: 
895:       // Find the audio analysis data for this stem
896:       const stemAnalysis = actualAudioAnalysisData.find(
897:         a => a.stemType === stemType
898:       );
899: 
900:       if (stemAnalysis?.analysisData) {
901:         const transients = (stemAnalysis.analysisData as any).transients;
902: 
903:         if (transients && Array.isArray(transients)) {
904:           // Apply sensitivity filtering to match live preview behavior.
905:           // Without this, exports would use ALL transients regardless of the user's
906:           // sensitivity slider, causing more frequent slide advances than the preview.
907:           const featureId = `${stemType}-peaks`;
908:           const sensitivity = featureSensitivities?.[featureId]
909:             ?? DEFAULT_PEAK_SENSITIVITIES[featureId]
910:             ?? 0.5;
911:           const filteredTransients = filterTransientsBySensitivity(transients, sensitivity);
912: 
913:           // Convert filtered transients to slide events
914:           const slideEvents = filteredTransients.map((t: any) => ({
915:             time: t.time,
916:             intensity: t.intensity || 1.0,
917:           }));
918: 
919:           // Update the effect parameter
920:           visualizerManagerRef.current?.updateEffectParameter(layer.id, 'slideEvents', slideEvents);
921: 
922:           // DEBUG: Log on first few frames
923:           if (frame < 3) {
924:             console.log(`[SlideshowEvents] frame=${frame} layer=${layer.id}: ${slideEvents.length} slide events from ${stemType} (${transients.length} raw, sensitivity=${sensitivity})`);
925:           }
926:         }
927:       }
928:     }
929: 
930:     // 2. Deterministic Update - sets uTime and all effect states based on frame/fps
931:     // This ensures frame 100 looks identical whether rendered on laptop, AWS Lambda in Virginia, or Oregon
932:     visualizerManagerRef.current.update(frame, fps);
933:     
934:     // 3. Final Draw - render all layers via compositor (don't use deprecated renderFrame)
935:     visualizerManagerRef.current.getCompositor().render();
936:     
937:     // 4. Flush WebGL - ensure canvas is ready for Remotion capture
938:     if (canvasRef.current) {
939:       const gl = canvasRef.current.getContext('webgl2') || canvasRef.current.getContext('webgl');
940:       if (gl) {
941:         gl.flush(); // Flush all pending commands to the GPU
942:         gl.finish(); // Force all WebGL commands to complete before returning
943:       }
944:     }
945:   }, [frame, fps, actualLayers, actualAudioAnalysisData, mappings, baseParameterValues, visualizationSettings]);
946: 
947:   return (
948:     <div style={{ width, height, position: 'relative' }}>
949:       <canvas ref={canvasRef} width={width} height={height} style={{ width: '100%', height: '100%' }} />
950:       {masterAudioUrl && <Audio src={masterAudioUrl} />}
951:       <RemotionOverlayRenderer
952:         layers={actualLayers}
953:         audioAnalysisData={actualAudioAnalysisData as unknown as CachedAudioAnalysisData[]}
954:         masterAudioUrl={masterAudioUrl}
955:       />
956:     </div>
957:   );
958: };
```

## File: apps/web/src/lib/visualizer/effects/ImageSlideshowEffect.ts
```typescript
  1: import * as THREE from 'three';
  2: import { VisualEffect } from '@/types/visualizer';
  3: import { debugLog } from '@/lib/utils';
  4: import { getRemotionEnvironment } from 'remotion';
  5: 
  6: // Use standard debugLog for ImageSlideshowEffect to allow suppression
  7: const slideshowLog = {
  8:   log: (...args: any[]) => debugLog.log('🖼️', ...args),
  9:   warn: (...args: any[]) => debugLog.warn('🖼️', ...args),
 10:   error: (...args: any[]) => debugLog.error('🖼️', ...args),
 11: };
 12: 
 13: export class ImageSlideshowEffect implements VisualEffect {
 14:   id: string;
 15:   name: string;
 16:   description: string;
 17:   enabled: boolean;
 18:   parameters: {
 19:     triggerValue: number; // Mapped input (0-1)
 20:     threshold: number;
 21:     images: string[]; // List of image URLs
 22:     opacity: number;
 23:     position: { x: number; y: number }; // Normalized position (0-1), 0,0 = top-left
 24:     size: { width: number; height: number }; // Normalized size (0-1), fraction of screen
 25:     // STATELESS: Pre-computed slide events for deterministic Lambda rendering
 26:     slideEvents: { time: number; intensity: number }[];
 27:   };
 28: 
 29:   private scene: THREE.Scene;
 30:   private camera: THREE.OrthographicCamera;
 31:   private plane!: THREE.Mesh; // Initialized in updatePlaneGeometryAndPosition
 32:   private renderer?: THREE.WebGLRenderer;
 33: 
 34:   private applyTexture(texture: THREE.Texture | null) {
 35:     if (this.material.map === texture) return;
 36:     const wasNull = this.material.map === null;
 37:     const isNowNull = texture === null;
 38: 
 39:     this.material.map = texture;
 40:     
 41:     if (texture) {
 42:       this.material.color.setHex(0xffffff);
 43:       this.plane.visible = true;
 44:       this.fitTextureToScreen(texture);
 45:     } else {
 46:       this.material.color.setHex(0x000000); // Back to black
 47:     }
 48:     
 49:     // Always signal material update when texture changes — swangle (Lambda software WebGL)
 50:     // may not auto-detect map changes without needsUpdate, causing stale texture to linger.
 51:     this.material.needsUpdate = true;
 52:   }
 53:   private material: THREE.MeshBasicMaterial;
 54: 
 55:   private currentImageIndex: number = -1;
 56:   private textureCache: Map<string, THREE.Texture> = new Map();
 57:   private loadingImages: Set<string> = new Set();
 58:   private wasTriggered: boolean = false;
 59:   private previousTriggerValue: number = 0; // Track previous value for edge detection
 60:   private lastTriggerFrame: number = -999; // Frame when we last triggered (for cooldown)
 61:   private minFramesBetweenTriggers: number = 3; // Minimum ~50ms at 60fps between triggers (allows very fast hi-hats/fills!)
 62:   private textureLoader = new THREE.TextureLoader();
 63:   private aspectRatio: number = 1;
 64:   private failureCount = 0;
 65:   private pendingTextureResolvers: Map<string, ((texture: THREE.Texture) => void)[]> = new Map();
 66:   // Cached Remotion environment (doesn't change at runtime)
 67:   private isRemotionRendering: boolean = false;
 68:   private isInRemotionContext: boolean = false;
 69:   private frameCounter: number = 0; // For periodic debug logging
 70:   private lastErrorTime: number = 0;
 71:   private errorCooldownMs: number = 2000; // 2 seconds cooldown
 72:   private isNetworkThrottled: boolean = false; // Hard stop on 403 errors
 73:   private consecutiveErrors: number = 0; // Track consecutive 403 errors
 74:   private blacklistedUrls: Set<string> = new Set(); // URLs that returned 403/404
 75: 
 76:   // STATELESS: Track last calculated index to avoid redundant texture loads
 77:   private lastCalculatedIndex: number = -1;
 78:   // STATELESS: Guard to prevent updateWithTime from running before slideEvents are set.
 79:   // On Lambda chunk restarts, initializedRef stays false until waitForImages confirms setup.
 80:   private slideEventsInitialized: boolean = false;
 81: 
 82:   constructor(config?: any) {
 83:     this.id = config?.id || `imageSlideshow_${Math.random().toString(36).substr(2, 9)}`;
 84:     this.name = 'Image Slideshow';
 85:     this.description = 'Advances images based on audio transients';
 86:     this.enabled = true;
 87:     this.parameters = {
 88:       triggerValue: 0,
 89:       threshold: config?.threshold ?? 0.1, // Lower default threshold to catch more transients
 90:       // Enforce minimum threshold of 0.01 to prevent edge case where threshold=0
 91:       // breaks the trigger state machine (wasTriggered can never reset when threshold is 0)
 92:       images: config?.images || [],
 93:       opacity: 1.0,
 94:       position: config?.position || { x: 0.5, y: 0.5 }, // Center by default
 95:       size: config?.size || { width: 1.0, height: 1.0 }, // Full screen by default
 96:       slideEvents: config?.slideEvents || [], // STATELESS: pre-computed transients for Lambda
 97:       ...config
 98:     };
 99: 
100:     // Enforce minimum threshold to prevent broken state machine
101:     this.parameters.threshold = Math.max(0.01, this.parameters.threshold);
102: 
103:     this.textureLoader.setCrossOrigin('anonymous');
104: 
105:     this.scene = new THREE.Scene();
106: 
107:     // Use Orthographic camera to easily fill the screen
108:     this.aspectRatio = typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 1;
109:     this.camera = new THREE.OrthographicCamera(
110:       -this.aspectRatio, this.aspectRatio,
111:       1, -1,
112:       0.1, 100
113:     );
114:     this.camera.position.z = 10; // Move camera back to ensure plane is clearly visible
115: 
116:     this.material = new THREE.MeshBasicMaterial({
117:       color: 0xffffff, // Base white to multiply correctly with texture
118:       transparent: true,
119:       opacity: this.parameters.opacity,
120:       side: THREE.DoubleSide,
121:       map: null
122:     });
123: 
124:     // Create plane - will be positioned and sized based on parameters
125:     this.createPlane();
126:     this.plane.frustumCulled = false; // Disable culling to prevent disappearance
127:     this.plane.visible = false; // Start hidden until texture loads
128:     this.scene.add(this.plane);
129:   }
130: 
131:   /**
132:    * Create the plane mesh with initial geometry
133:    */
134:   private createPlane() {
135:     // Convert normalized position (0-1) to Three.js world coordinates
136:     const worldX = (this.parameters.position.x * 2 - 1) * this.aspectRatio;
137:     const worldY = 1 - this.parameters.position.y * 2;
138:     const worldWidth = this.parameters.size.width * 2 * this.aspectRatio;
139:     const worldHeight = this.parameters.size.height * 2;
140: 
141:     this.plane = new THREE.Mesh(new THREE.PlaneGeometry(worldWidth, worldHeight), this.material);
142:     this.plane.position.set(worldX, worldY, 0);
143:   }
144: 
145:   init(renderer: THREE.WebGLRenderer): void {
146:     this.renderer = renderer;
147:     const remotionEnv = getRemotionEnvironment();
148:     this.isRemotionRendering = remotionEnv.isRendering;
149:     this.isInRemotionContext = remotionEnv.isRendering || remotionEnv.isStudio;
150: 
151:     slideshowLog.log('Initializing ImageSlideshowEffect', {
152:       effectId: this.id,
153:       imagesCount: this.parameters.images.length,
154:       sampleUrls: this.parameters.images.slice(0, 2).map(url => url.substring(0, 60) + '...')
155:     });
156: 
157:     if (this.isInRemotionContext) {
158:       console.log('[Slideshow Remotion] INIT', {
159:         effectId: this.id,
160:         imagesCount: this.parameters.images.length,
161:         threshold: this.parameters.threshold,
162:         isStudio: remotionEnv.isStudio,
163:         isRendering: remotionEnv.isRendering,
164:         sampleUrls: this.parameters.images.slice(0, 2).map(url => url.substring(0, 60) + '...')
165:       });
166:     }
167: 
168:     if (this.parameters.images.length > 0) {
169:       slideshowLog.log('Images available at init, calling advanceSlide()');
170:       this.advanceSlide();
171:     } else {
172:       slideshowLog.warn('No images available at init time');
173:     }
174:   }
175: 
176:   update(deltaTime: number): void {
177:     if (!this.enabled) return;
178: 
179:     // STRICT CHECK: If network is throttled due to 403s, stop all operations
180:     if (this.isNetworkThrottled) {
181:       return;
182:     }
183: 
184:     // Trigger detection: Use cooldown-based approach for audio-reactive slideshow
185:     // This handles cases where drums-peaks produces sustained rising values
186:     const currentValue = this.parameters.triggerValue;
187:     const threshold = this.parameters.threshold;
188: 
189:     // Calculate the change in value
190:     const valueDelta = currentValue - this.previousTriggerValue;
191: 
192:     // Cooldown check: don't trigger too frequently
193:     const framesSinceLastTrigger = this.frameCounter - this.lastTriggerFrame;
194:     const cooldownExpired = framesSinceLastTrigger >= this.minFramesBetweenTriggers;
195: 
196:     // Trigger condition: Only fire on a clear rising edge (value jumped by more than threshold).
197:     // The "isAboveThreshold && !wasTriggered" path is intentionally removed — with a
198:     // momentum-accumulator input the base value hovers around 0.5, so "above threshold"
199:     // is always true and would cause spurious re-triggers after the cooldown expires.
200:     const isRisingEdge = valueDelta > threshold;
201:     const shouldTrigger = cooldownExpired && isRisingEdge;
202: 
203:     // DEBUG: Log state periodically or on triggers (Remotion only)
204:     if (this.isInRemotionContext && (this.frameCounter % 30 === 0 || shouldTrigger)) {
205:       console.log('[Slideshow Debug]', {
206:         frame: this.frameCounter,
207:         currentValue: currentValue.toFixed(4),
208:         valueDelta: valueDelta.toFixed(4),
209:         threshold,
210:         cooldownExpired,
211:         framesSinceLastTrigger,
212:         shouldTrigger,
213:         currentImageIndex: this.currentImageIndex,
214:         isRemotionRendering: this.isRemotionRendering,
215:       });
216:     }
217: 
218:     if (shouldTrigger && !this.isRemotionRendering) {
219:       // Live preview mode: advance slide immediately (non-blocking)
220:       this.advanceSlide();
221:       this.lastTriggerFrame = this.frameCounter;
222:       this.wasTriggered = true;
223:     } else if (shouldTrigger && this.isRemotionRendering) {
224:       // Remotion mode: track trigger state but don't advance (Lambda uses slideEvents)
225:       this.lastTriggerFrame = this.frameCounter;
226:       this.wasTriggered = true;
227:     } else if (currentValue <= threshold * 0.5 && this.wasTriggered) {
228:       this.wasTriggered = false;
229:     }
230: 
231:     // Update previous value for next frame
232:     this.previousTriggerValue = currentValue;
233: 
234:     // In Remotion mode, skip all expensive image loading/processing
235:     if (this.isRemotionRendering) {
236:       this.frameCounter++;
237:       return;
238:     }
239: 
240:     // Emergency backoff if we are hitting errors (e.g. 403s)
241:     if (Date.now() - this.lastErrorTime < this.errorCooldownMs) {
242:       return;
243:     }
244: 
245:     this.frameCounter++;
246: 
247:     // Opacity debug logging removed for performance
248: 
249:     // If images were added after init, load the first one immediately
250:     if (this.currentImageIndex === -1 && this.parameters.images.length > 0) {
251:       this.advanceSlide();
252:     }
253: 
254:     // If a texture load completed in the background, apply it now
255:     if (this.currentImageIndex >= 0) {
256:       const currentUrl = this.parameters.images[this.currentImageIndex];
257:       if (currentUrl) {
258:         const cachedTexture = this.textureCache.get(currentUrl);
259:         if (cachedTexture && this.material.map !== cachedTexture) {
260:           this.applyTexture(cachedTexture);
261:         }
262:       }
263:     }
264: 
265:     // Retry loading the CURRENT image if no texture is displayed.
266:     // Important: Do NOT call advanceSlide() here — that would skip ahead through
267:     // images every frame when a texture is loading, causing multiple advances per trigger.
268:     if (
269:       !this.material.map &&
270:       this.currentImageIndex >= 0 &&
271:       this.parameters.images.length > 0 &&
272:       this.failureCount < this.parameters.images.length * 2
273:     ) {
274:       const currentUrl = this.parameters.images[this.currentImageIndex];
275:       if (currentUrl && !this.textureCache.has(currentUrl) && !this.loadingImages.has(currentUrl)) {
276:         this.loadTexture(currentUrl).catch(() => {
277:           this.failureCount++;
278:         });
279:       }
280:     }
281: 
282:     // Update plane position and size if parameters changed
283:     this.updatePlaneGeometryAndPosition();
284: 
285:     // Safety: if a texture is present but the plane is somehow hidden, force it visible
286:     if (this.material.map && !this.plane.visible) {
287:       this.plane.visible = true;
288:     }
289:   }
290: 
291:   /**
292:    * Update plane geometry and position based on position/size parameters
293:    * Position and size are normalized (0-1), converted to Three.js world coordinates
294:    */
295:   private updatePlaneGeometryAndPosition() {
296:     // Convert normalized position (0-1) to Three.js world coordinates
297:     // X: 0 = left edge (-aspectRatio), 1 = right edge (aspectRatio)
298:     const worldX = (this.parameters.position.x * 2 - 1) * this.aspectRatio;
299:     // Y: 0 = top edge (1), 1 = bottom edge (-1) - flip Y for Three.js
300:     const worldY = 1 - this.parameters.position.y * 2;
301: 
302:     // Convert normalized size (0-1) to Three.js world size
303:     const worldWidth = this.parameters.size.width * 2 * this.aspectRatio;
304:     const worldHeight = this.parameters.size.height * 2;
305: 
306:     // Update plane position
307:     this.plane.position.set(worldX, worldY, 0);
308: 
309:     // Update plane geometry if size changed
310:     const currentWidth = (this.plane.geometry as THREE.PlaneGeometry).parameters.width;
311:     const currentHeight = (this.plane.geometry as THREE.PlaneGeometry).parameters.height;
312: 
313:     if (Math.abs(currentWidth - worldWidth) > 0.001 || Math.abs(currentHeight - worldHeight) > 0.001) {
314:       this.plane.geometry.dispose();
315:       this.plane.geometry = new THREE.PlaneGeometry(worldWidth, worldHeight);
316:     }
317:   }
318: 
319:   updateParameter(paramName: string, value: any): void {
320:     // Handle images array updates - this is called when a collection is selected
321:     if (paramName === 'images' && Array.isArray(value)) {
322:       slideshowLog.log('updateParameter called with images:', {
323:         valueLength: value.length,
324:         valueSample: value.slice(0, 2).map((url: any) => typeof url === 'string' ? url.substring(0, 80) : String(url))
325:       });
326: 
327:       // Filter out empty or invalid URLs - accept any non-empty string that looks like a URL
328:       const validUrls = value.filter((url: any) => {
329:         if (typeof url !== 'string') {
330:           slideshowLog.warn('Invalid URL type:', typeof url, url);
331:           return false;
332:         }
333:         const trimmed = url.trim();
334:         if (trimmed.length === 0) {
335:           slideshowLog.warn('Empty URL string');
336:           return false;
337:         }
338:         // Accept http/https URLs or data URLs
339:         const isValid = trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:');
340:         if (!isValid) {
341:           slideshowLog.warn('URL does not start with http/https/data:', trimmed.substring(0, 50));
342:         }
343:         return isValid;
344:       });
345: 
346:       const oldLength = this.parameters.images.length;
347:       const newLength = validUrls.length;
348:       const imagesChanged = oldLength !== newLength ||
349:         JSON.stringify(this.parameters.images) !== JSON.stringify(validUrls);
350: 
351:       slideshowLog.log('Images validation result:', {
352:         oldCount: oldLength,
353:         newCount: newLength,
354:         validUrls: validUrls.length,
355:         invalidUrls: value.length - validUrls.length,
356:         imagesChanged,
357:         sampleUrls: validUrls.slice(0, 3).map((url: string) => url.substring(0, 60) + '...')
358:       });
359: 
360:       if (imagesChanged) {
361:         if (validUrls.length === 0) {
362:           slideshowLog.warn('No valid image URLs provided after filtering');
363:           slideshowLog.warn('Original value:', value);
364:           return;
365:         }
366: 
367:         // Update the parameter with only valid URLs
368:         this.parameters.images = validUrls;
369: 
370:         // Reset state for new collection
371:         this.currentImageIndex = -1;
372:         this.failureCount = 0;
373: 
374:         // Clear texture cache since URLs may have changed
375:         this.textureCache.forEach(t => t.dispose());
376:         this.textureCache.clear();
377:         this.loadingImages.clear();
378:         // Clear blacklist so refreshed URLs can be loaded
379:         this.blacklistedUrls.clear();
380: 
381:         // Clear current texture
382:         if (this.material.map) {
383:           this.applyTexture(null);
384:         }
385: 
386:         // Load first image immediately
387:         slideshowLog.log('Loading first image from new collection, calling advanceSlide()');
388:         this.advanceSlide();
389:       } else {
390:         slideshowLog.log('Images array unchanged, skipping update');
391:       }
392:     } else if (paramName === 'opacity') {
393:       const oldOpacity = this.parameters.opacity;
394:       this.parameters.opacity = typeof value === 'number' ? value : parseFloat(value);
395:       this.material.opacity = this.parameters.opacity;
396:       slideshowLog.log('🔄 Opacity updated via updateParameter:', {
397:         effectId: this.id,
398:         oldValue: oldOpacity,
399:         newValue: this.parameters.opacity,
400:         materialOpacity: this.material.opacity,
401:         valueType: typeof value,
402:         rawValue: value
403:       });
404:     } else if (paramName === 'position') {
405:       if (value && typeof value === 'object' && 'x' in value && 'y' in value) {
406:         this.parameters.position = {
407:           x: typeof value.x === 'number' ? value.x : parseFloat(value.x),
408:           y: typeof value.y === 'number' ? value.y : parseFloat(value.y)
409:         };
410:         this.updatePlaneGeometryAndPosition();
411:       }
412:     } else if (paramName === 'size') {
413:       if (value && typeof value === 'object' && 'width' in value && 'height' in value) {
414:         this.parameters.size = {
415:           width: typeof value.width === 'number' ? value.width : parseFloat(value.width),
416:           height: typeof value.height === 'number' ? value.height : parseFloat(value.height)
417:         };
418:         this.updatePlaneGeometryAndPosition();
419:       }
420:     } else if (paramName === 'threshold') {
421:       this.parameters.threshold = value;
422:       this.previousTriggerValue = this.parameters.triggerValue;
423:       this.wasTriggered = false;
424:     } else if (paramName === 'triggerValue') {
425:       const newValue = typeof value === 'number' ? value : parseFloat(value);
426:       this.parameters.triggerValue = newValue;
427:     } else if (paramName === 'slideEvents') {
428:       // STATELESS: Receive pre-computed slide events from audio transients
429:       if (Array.isArray(value)) {
430:         this.parameters.slideEvents = value as { time: number; intensity: number }[];
431:         slideshowLog.log('slideEvents updated:', {
432:           count: this.parameters.slideEvents.length,
433:           sample: this.parameters.slideEvents.slice(0, 3)
434:         });
435:       }
436:     }
437:   }
438: 
439:   /**
440:    * STATELESS: Update method that receives absolute time for deterministic Lambda rendering.
441:    * This computes the current slide index based on slideEvents, eliminating stateful edge detection.
442:    * @param absoluteTime - Absolute time in seconds (frame / fps)
443:    */
444:   updateWithTime(absoluteTime: number): void {
445:     if (!this.enabled) return;
446:     if (this.parameters.images.length === 0) return;
447: 
448:     // Use cached Remotion environment (set in init)
449: 
450:     // STATELESS: Use slideEvents if available (Lambda mode)
451:     const slideEvents = this.parameters.slideEvents;
452: 
453:     // GUARD: On Lambda chunk restarts, slideEvents may not be set yet when updateWithTime
454:     // first runs (waitForImages runs after the first few frames). Skip to avoid resetting
455:     // lastCalculatedIndex to -1 and briefly flashing the wrong slide.
456:     if (this.isInRemotionContext && !this.slideEventsInitialized) return;
457: 
458:     if (slideEvents && slideEvents.length > 0) {
459:       // Count how many events have occurred by this time
460:       // Each event triggers one slide advance
461:       const eventsSoFar = slideEvents.filter(e => e.time <= absoluteTime).length;
462: 
463:       // Calculate which image should be shown (wrap around)
464:       const newIndex = eventsSoFar % this.parameters.images.length;
465: 
466:       // When index changes: update state and load texture
467:       if (newIndex !== this.lastCalculatedIndex) {
468:         const oldIdx = this.lastCalculatedIndex;
469: 
470:         this.lastCalculatedIndex = newIndex;
471:         this.currentImageIndex = newIndex;
472: 
473:         if (this.isInRemotionContext) {
474:           console.log(`[Slideshow Stateless] time=${absoluteTime.toFixed(2)}s, events=${eventsSoFar}, index=${newIndex}`);
475:         }
476: 
477:         // Load the texture if not already cached (async — old image stays visible until loaded)
478:         const imageUrl = this.parameters.images[newIndex];
479:         if (imageUrl && !this.textureCache.has(imageUrl)) {
480:           this.loadTexture(imageUrl).then((texture) => {
481:             if (texture) {
482:               this.applyTexture(texture);
483:             }
484:           }).catch(() => {});
485:         }
486: 
487:         // Look-ahead: preload the image that will be shown on the NEXT transition.
488:         // Use oldIdx (previous index before this transition) so the math works out:
489:         // 0→1 transition: oldIdx=0, look-ahead preloads image 1 ✓
490:         // 1→2 transition: oldIdx=1, look-ahead preloads image 2 ✓
491:         // First call (-1→0): oldIdx=-1 wraps to last image, but waitForImages
492:         //   already preloaded image 0 so this is a harmless duplicate.
493:         const lookAheadIdx = (oldIdx + 1 + this.parameters.images.length) % this.parameters.images.length;
494:         const lookAheadUrl = this.parameters.images[lookAheadIdx];
495:         if (lookAheadUrl && !this.textureCache.has(lookAheadUrl) && !this.loadingImages.has(lookAheadUrl)) {
496:           this.loadTexture(lookAheadUrl).then((texture) => {
497:             if (texture) {
498:               this.applyTexture(texture);
499:             }
500:           }).catch(() => {});
501:         }
502:       }
503: 
504:       // EVERY FRAME: Apply texture for current index if it's now in cache.
505:       if (this.currentImageIndex >= 0) {
506:         const imageUrl = this.parameters.images[this.currentImageIndex];
507:         const texture = imageUrl ? this.textureCache.get(imageUrl) : undefined;
508:         if (texture && this.material.map !== texture) {
509:           this.applyTexture(texture);
510:         }
511:       }
512: 
513:       return;
514:     }
515: 
516:     // FALLBACK: No slideEvents - use legacy stateful approach for live preview
517:     // (This path should rarely be hit in Lambda as slideEvents should always be provided)
518:     if (this.isInRemotionContext && this.frameCounter % 60 === 0) {
519:       console.log('[Slideshow] WARNING: No slideEvents, falling back to stateful mode');
520:     }
521:   }
522: 
523:   resize(width: number, height: number) {
524:     this.aspectRatio = width / height;
525: 
526:     this.camera.left = -this.aspectRatio;
527:     this.camera.right = this.aspectRatio;
528:     this.camera.top = 1;
529:     this.camera.bottom = -1;
530:     this.camera.updateProjectionMatrix();
531: 
532:     // Update plane geometry and position based on new aspect ratio
533:     this.updatePlaneGeometryAndPosition();
534: 
535:     if (this.material.map) {
536:       this.fitTextureToScreen(this.material.map);
537:     }
538:   }
539: 
540:   /**
541:    * Advance to the next slide. This method is NON-BLOCKING:
542:    * - Cache hit: swaps the texture synchronously (instant, same frame)
543:    * - Cache miss: advances the index immediately and starts a background load.
544:    *   The texture will be applied on the next frame when update() detects it in cache.
545:    * No trigger is ever blocked by a pending load.
546:    */
547:   private advanceSlide() {
548:     if (this.parameters.images.length === 0) return;
549: 
550:     const nextIndex = (this.currentImageIndex + 1) % this.parameters.images.length;
551: 
552:     // Guard: already on this index
553:     if (nextIndex === this.currentImageIndex && this.currentImageIndex !== -1) return;
554: 
555:     const imageUrl = this.parameters.images[nextIndex];
556: 
557:     // Always advance the index immediately so the trigger state machine progresses
558:     this.currentImageIndex = nextIndex;
559: 
560:     // Try synchronous cache hit — instant texture swap
561:     const cachedTexture = this.textureCache.get(imageUrl);
562:     if (cachedTexture) {
563:       this.applyTexture(cachedTexture);
564: 
565:       // Fire-and-forget preload / cleanup
566:       this.cleanupCache();
567:       this.loadNextTextures(nextIndex);
568:       return;
569:     }
570: 
571:     // Cache miss: start background load, don't block
572:     // The texture will be applied by the polling check in update()
573:     if (!this.loadingImages.has(imageUrl)) {
574:       this.loadTexture(imageUrl).then(() => {
575:         this.failureCount = 0;
576:         this.cleanupCache();
577:         this.loadNextTextures(nextIndex);
578:       }).catch(() => {
579:         this.failureCount++;
580:       });
581:     }
582:   }
583: 
584:   private fitTextureToScreen(texture: THREE.Texture) {
585:     if (!texture.image) return;
586: 
587:     const imageAspect = texture.image.width / texture.image.height;
588:     const screenAspect = this.aspectRatio;
589: 
590:     // Reset texture matrix to identity before applying transformations
591:     texture.matrixAutoUpdate = true;
592:     texture.matrix.identity();
593:     texture.center.set(0.5, 0.5);
594:     texture.offset.set(0, 0);
595: 
596:     if (imageAspect > screenAspect) {
597:       // Image is wider than screen
598:       texture.repeat.set(screenAspect / imageAspect, 1);
599:     } else {
600:       // Image is taller than screen
601:       texture.repeat.set(1, imageAspect / screenAspect);
602:     }
603:   }
604: 
605:   private loadNextTextures(currentIndex: number) {
606:     // Preload next 3 images to smooth out rapid sequential triggers
607:     for (let i = 1; i <= 3; i++) {
608:       const idx = (currentIndex + i) % this.parameters.images.length;
609:       const url = this.parameters.images[idx];
610:       if (!this.textureCache.has(url) && !this.loadingImages.has(url)) {
611:         this.loadTexture(url).catch(() => { });
612:       }
613:     }
614:   }
615: 
616: 
617: 
618:   /**
619:    * Load image from blob and return as HTMLImageElement.
620:    * Uses the native Image constructor which is available in both browser and Node.js
621:    * environments when running with Three.js/Remotion.
622:    */
623:   private async loadImageFromBlobAsElement(blob: Blob): Promise<HTMLImageElement> {
624:     // Convert blob to base64 data URL
625:     const arrayBuffer = await blob.arrayBuffer();
626:     const base64 = this.arrayBufferToBase64(arrayBuffer);
627:     const mimeType = blob.type || 'image/jpeg';
628:     const dataUrl = `data:${mimeType};base64,${base64}`;
629: 
630:     // Create image element using the global Image constructor
631:     // This is available in browser and in Node.js when running with canvas support
632:     const img = new (globalThis.Image || Image || HTMLImageElement)();
633: 
634:     return new Promise((resolve, reject) => {
635:       img.onload = () => {
636:         resolve(img);
637:       };
638:       img.onerror = () => {
639:         reject(new Error('Failed to load image from blob'));
640:       };
641:       img.src = dataUrl;
642:     });
643:   }
644: 
645:   /**
646:    * Convert ArrayBuffer to base64 string
647:    */
648:   private arrayBufferToBase64(buffer: ArrayBuffer): string {
649:     const bytes = new Uint8Array(buffer);
650:     let binary = '';
651:     for (let i = 0; i < bytes.byteLength; i++) {
652:       binary += String.fromCharCode(bytes[i]);
653:     }
654:     // Use btoa in browser, but in Node.js we need a different approach
655:     if (typeof window !== 'undefined') {
656:       return btoa(binary);
657:     } else {
658:       // Node.js environment - use Buffer
659:       return Buffer.from(binary, 'binary').toString('base64');
660:     }
661:   }
662: 
663:   private loadTexture(url: string): Promise<THREE.Texture> {
664:     // Check if URL is blacklisted (403/404)
665:     if (this.blacklistedUrls.has(url)) {
666:       return Promise.reject(new Error("URL is blacklisted (403/404)"));
667:     }
668: 
669:     // STRICT CHECK: If throttled, reject immediately to save network
670:     if (this.isNetworkThrottled) {
671:       return Promise.reject(new Error("Network throttled due to previous 403s"));
672:     }
673: 
674:     // If we already have this texture cached, return it immediately
675:     const cached = this.textureCache.get(url);
676:     if (cached) {
677:       return Promise.resolve(cached);
678:     }
679: 
680:     // If a load is already in progress for this URL, attach to the same result
681:     if (this.loadingImages.has(url)) {
682:       slideshowLog.log('Texture already loading, attaching listener:', url.substring(0, 80));
683:       return new Promise((resolve) => {
684:         const existing = this.pendingTextureResolvers.get(url) || [];
685:         existing.push(resolve);
686:         this.pendingTextureResolvers.set(url, existing);
687:       });
688:     }
689: 
690:     this.loadingImages.add(url);
691:     slideshowLog.log('Loading texture:', url.substring(0, 80));
692: 
693:     return new Promise(async (resolve, reject) => {
694:       try {
695:         // Fetch image data
696:         const response = await fetch(url);
697:         if (!response.ok) {
698:           if (response.status === 403 || response.status === 404) {
699:             // Add to blacklist to prevent future attempts
700:             this.blacklistedUrls.add(url);
701: 
702:             if (response.status === 403) {
703:               this.consecutiveErrors++;
704: 
705:               // If we hit 3 consecutive 403s, stop trying for 5 seconds
706:               if (this.consecutiveErrors >= 3) {
707:                 this.isNetworkThrottled = true;
708:                 slideshowLog.warn("⛔ [ImageSlideshow] Too many 403s. Pausing loading for 5s.");
709:                 setTimeout(() => {
710:                   this.isNetworkThrottled = false;
711:                   this.consecutiveErrors = 0;
712:                 }, 5000);
713:               }
714:             }
715: 
716:             const msg = `⛔ ${response.status} Forbidden: URL Blacklisted. ${url.substring(0, 30)}...`;
717:             slideshowLog.warn(msg);
718:             throw new Error(msg);
719:           } else {
720:             throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
721:           }
722:         }
723: 
724:         // On success, reset error counter
725:         this.consecutiveErrors = 0;
726: 
727:         const blob = await response.blob();
728: 
729:         let texture: THREE.Texture;
730: 
731:         // Use createImageBitmap in browser (fast, off-main-thread decoding)
732:         // Fall back to HTMLImageElement for Remotion/Node.js where createImageBitmap is unavailable
733:         const canUseBitmap = typeof createImageBitmap === 'function';
734: 
735:         if (canUseBitmap) {
736:           // Browser path: fast off-main-thread decode + flip via ImageBitmap
737:           // imageOrientation 'flipY' flips the image during the off-thread decode,
738:           // so we set texture.flipY = false to avoid double-flipping
739:           const imageBitmap = await createImageBitmap(blob, { imageOrientation: 'flipY' });
740: 
741:           texture = new THREE.CanvasTexture(imageBitmap);
742:           texture.colorSpace = THREE.SRGBColorSpace;
743:           texture.minFilter = THREE.LinearFilter;
744:           texture.magFilter = THREE.LinearFilter;
745:           texture.generateMipmaps = false;
746:           texture.matrixAutoUpdate = true;
747:           texture.flipY = false;
748:           // Explicit needsUpdate ensures swangle's software WebGL picks up
749:           // the new texture data immediately on the next render call.
750:           texture.needsUpdate = true;
751: 
752:           slideshowLog.log('Texture loaded via ImageBitmap:', {
753:             url: url.substring(0, 50),
754:             width: imageBitmap.width,
755:             height: imageBitmap.height,
756:           });
757:         } else {
758:           // Remotion/Node.js path: HTMLImageElement with base64 data URL
759:           const img = await this.loadImageFromBlobAsElement(blob);
760: 
761:           texture = new THREE.Texture(img);
762:           texture.colorSpace = THREE.SRGBColorSpace;
763:           texture.minFilter = THREE.LinearFilter;
764:           texture.magFilter = THREE.LinearFilter;
765:           texture.generateMipmaps = false;
766:           texture.matrixAutoUpdate = true;
767:           texture.flipY = true;
768:           texture.needsUpdate = true;
769: 
770:           slideshowLog.log('Texture loaded via HTMLImageElement:', {
771:             url: url.substring(0, 50),
772:             width: img.width,
773:             height: img.height,
774:           });
775:         }
776: 
777:         this.textureCache.set(url, texture);
778:         
779:         // Force GPU texture upload immediately to avoid lag on first render
780:         if (this.renderer) {
781:           this.renderer.initTexture(texture);
782:         }
783:         
784:         this.loadingImages.delete(url);
785: 
786:         // Resolve primary caller
787:         resolve(texture);
788: 
789:         // Resolve any queued callers waiting on this URL
790:         const pending = this.pendingTextureResolvers.get(url);
791:         if (pending && pending.length > 0) {
792:           pending.forEach(fn => {
793:             try {
794:               fn(texture);
795:             } catch (e) {
796:               slideshowLog.error('Error resolving pending texture listener:', e);
797:             }
798:           });
799:           this.pendingTextureResolvers.delete(url);
800:         }
801:       } catch (err: any) {
802:         this.loadingImages.delete(url);
803:         this.pendingTextureResolvers.delete(url);
804: 
805:         // Trigger cooldown on error to prevent flooding
806:         this.lastErrorTime = Date.now();
807: 
808:         // Blacklist any URL that fails to load (not just 403/404).
809:         // This prevents repeated slow network-timeout retries on every frame
810:         // when a URL is unreachable (e.g. net::ERR_FAILED from Lambda).
811:         this.blacklistedUrls.add(url);
812: 
813:         // Provide more detailed error information
814:         let errorMessage = 'Texture load failed';
815:         if (err?.message) {
816:           errorMessage = err.message;
817:         } else if (err?.name === 'TypeError' && err?.message?.includes('Failed to fetch')) {
818:           errorMessage = `Network error (likely CORS or unreachable): ${url.substring(0, 100)}`;
819:         }
820: 
821:         slideshowLog.error('🖼️ Texture load failed (blacklisted):', errorMessage);
822:         slideshowLog.error('Failed URL:', url.substring(0, 100));
823: 
824:         reject(err);
825:       }
826:     });
827:   }
828: 
829:   /**
830:    * Public method to wait for essential images to load.
831:    * Used by Remotion to delay rendering until assets are ready.
832:    * @param duration - Optional total render duration in seconds. If provided, pre-loads
833:    *                   all images that will be shown during the render for Lambda compatibility.
834:    */
835:   public async waitForImages(duration?: number): Promise<void> {
836:     if (this.parameters.images.length === 0) return;
837: 
838:     const remotionEnv = getRemotionEnvironment();
839:     const isInRemotionContext = remotionEnv.isRendering || remotionEnv.isStudio;
840: 
841:     // STATELESS: In Lambda, only pre-load the FIRST image to avoid OOM.
842:     // Each Lambda chunk renders ~20 frames (~0.67s at 30fps) and only needs 1-2 images.
843:     // The rest load lazily via updateWithTime() which calls loadTexture() on demand.
844:     // Previously preloading ALL images (e.g. 34) crashed 3008MB Lambda with SwiftShader.
845:     if (isInRemotionContext && this.parameters.slideEvents.length > 0 && duration) {
846:       const firstIndex = this.currentImageIndex >= 0 ? this.currentImageIndex : 0;
847:       const firstUrl = this.parameters.images[firstIndex];
848: 
849:       slideshowLog.log('waitForImages: Pre-loading first image only (lazy load rest)', {
850:         duration,
851:         totalImages: this.parameters.images.length,
852:         slideEvents: this.parameters.slideEvents.length,
853:         firstIndex,
854:       });
855: 
856:       if (firstUrl && !this.textureCache.has(firstUrl)) {
857:         try {
858:           await this.loadTexture(firstUrl);
859:         } catch (e) {
860:           slideshowLog.warn(`waitForImages: Failed to preload first image`, e);
861:         }
862:       }
863: 
864:       // Apply first image
865:       if (firstUrl) {
866:         const texture = this.textureCache.get(firstUrl);
867:         if (texture) {
868:           this.currentImageIndex = firstIndex;
869:           this.applyTexture(texture);
870:         }
871:       }
872: 
873:       // STATELESS: Mark initialized so updateWithTime can run.
874:       this.slideEventsInitialized = true;
875:       return;
876:     }
877: 
878:     // STATELESS: Mark initialized even when slideEvents.length === 0 (fallback path).
879:     // This ensures updateWithTime will run on subsequent frames once slideEvents are set.
880:     this.slideEventsInitialized = true;
881: 
882:     // LEGACY: Single image load for live preview
883:     // Determine which images we need.
884:     // If we have a current index, we need that one.
885:     // If not, we need the first one.
886:     const targetIndex = this.currentImageIndex >= 0 ? this.currentImageIndex : 0;
887:     const url = this.parameters.images[targetIndex];
888: 
889:     if (!url) return;
890: 
891:     // If already cached, we're good
892:     if (this.textureCache.has(url)) return;
893: 
894:     // Otherwise, try to load it
895:     try {
896:       slideshowLog.log('waitForImages: Waiting for', url.substring(0, 50));
897:       await this.loadTexture(url);
898: 
899:       // Also ensure it's applied to the material if it's the current target
900:       if (this.currentImageIndex === -1 || this.currentImageIndex === targetIndex) {
901:         const texture = this.textureCache.get(url);
902:         if (texture) {
903:           this.currentImageIndex = targetIndex;
904:           this.applyTexture(texture);
905:         }
906:       }
907:     } catch (e) {
908:       slideshowLog.warn('waitForImages: Failed to load image, proceeding anyway', e);
909:     }
910:   }
911: 
912:   private cleanupCache() {
913:     // Keep up to 50 images in the cache to prevent thrashing GPU memory on looping slideshows
914:     if (this.textureCache.size <= 50) return;
915: 
916:     // If we exceed 50, keep current, 5 previous, and max forward
917:     const keepIndices = new Set<number>();
918:     keepIndices.add(this.currentImageIndex);
919:     
920:     // Keep 5 previous (to handle loops backward or quick review)
921:     for (let i = 1; i <= 5; i++) {
922:         let prev = this.currentImageIndex - i;
923:         if (prev < 0) prev += this.parameters.images.length;
924:         keepIndices.add(prev);
925:     }
926:     
927:     // Keep up to 44 forward
928:     for (let i = 1; i <= 44; i++) {
929:       keepIndices.add((this.currentImageIndex + i) % this.parameters.images.length);
930:     }
931: 
932:     const keepUrls = new Set<string>();
933:     keepIndices.forEach(idx => {
934:       if (this.parameters.images[idx]) keepUrls.add(this.parameters.images[idx]);
935:     });
936: 
937:     const currentMap = this.material.map;
938: 
939:     for (const [url, texture] of this.textureCache) {
940:       if (!keepUrls.has(url) && texture !== currentMap) {
941:         texture.dispose();
942:         this.textureCache.delete(url);
943:       }
944:     }
945:   }
946: 
947:   getScene(): THREE.Scene { return this.scene; }
948:   getCamera(): THREE.Camera { return this.camera; }
949: 
950:   destroy(): void {
951:     this.plane.geometry.dispose();
952:     this.material.dispose();
953:     this.textureCache.forEach(t => t.dispose());
954:     this.textureCache.clear();
955:     this.loadingImages.clear();
956:   }
957: }
```
