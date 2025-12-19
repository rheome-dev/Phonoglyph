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
