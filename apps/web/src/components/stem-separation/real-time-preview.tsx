'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { type StemType, type AudioFeatures, type FeatureMappings } from './stem-control-panel';

// Three.js integration placeholder - will be enhanced
let THREE: any = null;
if (typeof window !== 'undefined') {
  import('three').then(module => {
    THREE = module;
  });
}

interface RealTimePreviewProps {
  stemType: StemType;
  features: AudioFeatures;
  mapping: FeatureMappings;
}

export function RealTimePreview({ stemType, features, mapping }: RealTimePreviewProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const sceneRef = React.useRef<any>(null);
  const rendererRef = React.useRef<any>(null);
  const animationFrameRef = React.useRef<number>();
  const [isThreeReady, setIsThreeReady] = React.useState(false);

  const getStemColor = (stem: StemType) => {
    const colors = {
      drums: 'bg-blue-500',
      bass: 'bg-green-500',
      vocals: 'bg-purple-500',
      other: 'bg-orange-500',
    };
    return colors[stem];
  };

  const getStemColorHex = (stem: StemType) => {
    const colors = {
      drums: 0x3b82f6,
      bass: 0x22c55e,
      vocals: 0xa855f7,
      other: 0xf97316,
    };
    return colors[stem];
  };

  const getVisualizationIntensity = (value: number) => {
    return Math.round(value * 100);
  };

  // Initialize Three.js scene
  React.useEffect(() => {
    if (!THREE || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });

    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setClearColor(0x000000, 0);

    // Create basic visualization geometry based on stem type
    let geometry: any;
    switch (stemType) {
      case 'drums':
        geometry = new THREE.BoxGeometry(1, 1, 1);
        break;
      case 'bass':
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
        break;
      case 'vocals':
        geometry = new THREE.SphereGeometry(0.8, 16, 16);
        break;
      default:
        geometry = new THREE.OctahedronGeometry(0.8);
    }

    const material = new THREE.MeshPhongMaterial({ 
      color: getStemColorHex(stemType),
      transparent: true,
      opacity: 0.8
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    camera.position.z = 3;

    sceneRef.current = { scene, camera, renderer, mesh };
    rendererRef.current = renderer;
    setIsThreeReady(true);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      scene.clear();
      renderer.dispose();
    };
  }, [stemType, isThreeReady]);

  // Animation loop with feature mapping
  React.useEffect(() => {
    if (!sceneRef.current || !isThreeReady) return;

    const animate = () => {
      const { scene, camera, renderer, mesh } = sceneRef.current;

      // Apply feature mappings to visualization
      if (mapping.rhythm.enabled) {
        const intensity = features.rhythm * mapping.rhythm.intensity;
        switch (mapping.rhythm.target) {
          case 'scale':
            const scale = 1 + intensity;
            mesh.scale.set(scale, scale, scale);
            break;
          case 'rotation':
            mesh.rotation.y += intensity * 0.1;
            break;
          case 'position':
            mesh.position.y = Math.sin(Date.now() * 0.005) * intensity;
            break;
        }
      }

      if (mapping.pitch.enabled) {
        const intensity = features.pitch * mapping.pitch.intensity;
        switch (mapping.pitch.target) {
          case 'height':
            mesh.scale.y = 1 + intensity;
            break;
          case 'color':
            const hue = intensity * 360;
            mesh.material.color.setHSL(hue / 360, 0.7, 0.5);
            break;
          case 'size':
            const size = 1 + intensity * 0.5;
            mesh.scale.setScalar(size);
            break;
        }
      }

      if (mapping.timbre.enabled) {
        const intensity = features.timbre * mapping.timbre.intensity;
        switch (mapping.timbre.target) {
          case 'texture':
            mesh.material.roughness = intensity;
            break;
          case 'complexity':
            mesh.rotation.x += intensity * 0.05;
            mesh.rotation.z += intensity * 0.03;
            break;
          case 'distortion':
            mesh.material.opacity = 0.5 + intensity * 0.5;
            break;
        }
      }

      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [features, mapping, isThreeReady]);

  // Handle canvas resize
  React.useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !rendererRef.current || !sceneRef.current) return;
      
      const canvas = canvasRef.current;
      const { camera, renderer } = sceneRef.current;
      
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Card className="p-4 bg-slate-800/50 border-slate-600">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-white">Real-time Preview</h4>
          <div className={`w-3 h-3 rounded-full ${getStemColor(stemType)}`} />
        </div>

        <div className="aspect-video bg-slate-900/50 rounded-lg border border-slate-700 relative overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ display: isThreeReady ? 'block' : 'none' }}
          />
          {!isThreeReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="text-slate-400 text-sm">Loading 3D Preview...</div>
                <div className="text-slate-500 text-xs">
                  {stemType.charAt(0).toUpperCase() + stemType.slice(1)} Stem
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <div className="text-slate-400">Rhythm</div>
            <div className="flex items-center gap-2">
              <div className="text-white font-mono">
                {getVisualizationIntensity(features.rhythm)}%
              </div>
              {mapping.rhythm.enabled && (
                <div className="text-slate-500">→ {mapping.rhythm.target}</div>
              )}
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1">
              <div 
                className="bg-blue-500 h-1 rounded-full transition-all duration-100"
                style={{ width: `${getVisualizationIntensity(features.rhythm)}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-slate-400">Pitch</div>
            <div className="flex items-center gap-2">
              <div className="text-white font-mono">
                {getVisualizationIntensity(features.pitch)}%
              </div>
              {mapping.pitch.enabled && (
                <div className="text-slate-500">→ {mapping.pitch.target}</div>
              )}
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1">
              <div 
                className="bg-green-500 h-1 rounded-full transition-all duration-100"
                style={{ width: `${getVisualizationIntensity(features.pitch)}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-slate-400">Timbre</div>
            <div className="flex items-center gap-2">
              <div className="text-white font-mono">
                {getVisualizationIntensity(features.timbre)}%
              </div>
              {mapping.timbre.enabled && (
                <div className="text-slate-500">→ {mapping.timbre.target}</div>
              )}
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1">
              <div 
                className="bg-purple-500 h-1 rounded-full transition-all duration-100"
                style={{ width: `${getVisualizationIntensity(features.timbre)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 text-center">
          {isThreeReady 
            ? '3D visualization responds to feature mappings in real-time'
            : 'Loading Three.js 3D visualization engine...'
          }
        </div>
      </div>
    </Card>
  );
}