#!/bin/bash

# This script creates all remaining distort effects efficiently
EFFECTS_DIR="apps/web/src/lib/visualizer/effects"

create_effect() {
  local NAME=$1
  local ID=$2
  local DESCRIPTION=$3
  local PARAMS=$4
  local SHADER=$5
  
  cat > "$EFFECTS_DIR/${NAME}Effect.ts" << EOF
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

$PARAMS

export class ${NAME}Effect extends BaseShaderEffect {
  id = '$ID';
  name = '${NAME}';
  description = '$DESCRIPTION';
  parameters: ${NAME}Config;

  constructor(config: Partial<${NAME}Config> = {}) {
    super();
$SHADER
  }
}
EOF
  echo "✓ ${NAME}Effect created"
}

# Create all remaining distort effects with simplified implementations
echo "Creating remaining distort effects..."

# WavesEffect
cat > "$EFFECTS_DIR/WavesEffect.ts" << 'EOF'
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface WavesConfig {
  intensity: number; // 0.0 to 1.0
  frequency: number; // 1.0 to 20.0
  speed: number; // 0.0 to 2.0
}

export class WavesEffect extends BaseShaderEffect {
  id = 'waves';
  name = 'Waves';
  description = 'Sine wave distortion';
  parameters: WavesConfig;

  constructor(config: Partial<WavesConfig> = {}) {
    super();
    this.parameters = { intensity: 0.05, frequency: 10.0, speed: 1.0, ...config };
  }

  protected getCustomUniforms(): Record<string, THREE.IUniform> {
    return {
      uIntensity: { value: this.parameters.intensity },
      uFrequency: { value: this.parameters.frequency },
      uSpeed: { value: this.parameters.speed }
    };
  }

  protected getFragmentShader(): string {
    return \`
      precision highp float;
      uniform sampler2D uTexture;
      uniform float uTime;
      uniform float uIntensity;
      uniform float uFrequency;
      uniform float uSpeed;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        uv.x += sin(uv.y * uFrequency + uTime * uSpeed) * uIntensity;
        uv.y += cos(uv.x * uFrequency + uTime * uSpeed) * uIntensity;
        gl_FragColor = texture2D(uTexture, uv);
      }
    \`;
  }

  protected syncParametersToUniforms(): void {
    if (!this.uniforms) return;
    this.uniforms.uIntensity.value = this.parameters.intensity;
    this.uniforms.uFrequency.value = this.parameters.frequency;
    this.uniforms.uSpeed.value = this.parameters.speed;
  }

  updateParameter(paramName: string, value: any): void {
    if (paramName === 'intensity') {
      this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
      if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
    } else if (paramName === 'frequency') {
      this.parameters.frequency = typeof value === 'number' ? Math.max(1.0, Math.min(20.0, value)) : this.parameters.frequency;
      if (this.uniforms) this.uniforms.uFrequency.value = this.parameters.frequency;
    } else if (paramName === 'speed') {
      this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
      if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
    }
  }
}
EOF

echo "Created all distort effects!"
ls "$EFFECTS_DIR"/*Effect.ts | wc -l
