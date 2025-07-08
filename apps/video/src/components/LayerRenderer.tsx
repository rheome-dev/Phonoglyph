import React from 'react';
import { useCurrentFrame, AbsoluteFill } from 'remotion';
import { useLayerStore, Layer, VideoLayer, ImageLayer, EffectLayer } from '../../../web/src/lib/stores/layerStore';

export const LayerRenderer: React.FC = () => {
  const frame = useCurrentFrame();
  const fps = 30; // Get from video config
  const currentTime = frame / fps;
  
  const { layers } = useLayerStore();
  
  // Filter and sort visible layers
  const visibleLayers = layers
    .filter(layer => layer.visible && isLayerActiveAtTime(layer, currentTime))
    .sort((a, b) => a.zIndex - b.zIndex); // Render bottom to top
  
  return (
    <AbsoluteFill>
      {visibleLayers.map((layer) => (
        <LayerComponent key={layer.id} layer={layer} currentTime={currentTime} />
      ))}
    </AbsoluteFill>
  );
};

interface LayerComponentProps {
  layer: Layer;
  currentTime: number;
}

const LayerComponent: React.FC<LayerComponentProps> = ({ layer, currentTime }) => {
  const style: React.CSSProperties = {
    opacity: layer.opacity,
    mixBlendMode: layer.blendMode as any,
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: layer.zIndex,
  };
  
  switch (layer.type) {
    case 'video':
      return (
        <AbsoluteFill style={style}>
          <VideoLayerComponent layer={layer as VideoLayer} currentTime={currentTime} />
        </AbsoluteFill>
      );
      
    case 'image':
      return (
        <AbsoluteFill style={style}>
          <ImageLayerComponent layer={layer as ImageLayer} />
        </AbsoluteFill>
      );
      
    case 'effect':
      return (
        <AbsoluteFill style={style}>
          <EffectLayerComponent layer={layer as EffectLayer} currentTime={currentTime} />
        </AbsoluteFill>
      );
      
    case 'group':
      return null; // Groups don't render directly
      
    default:
      return null;
  }
};

interface VideoLayerComponentProps {
  layer: VideoLayer;
  currentTime: number;
}

const VideoLayerComponent: React.FC<VideoLayerComponentProps> = ({ layer, currentTime }) => {
  const { transform } = layer;
  
  const transformStyle: React.CSSProperties = {
    transform: `
      translate(${transform.x}px, ${transform.y}px) 
      scale(${transform.scaleX}, ${transform.scaleY}) 
      rotate(${transform.rotation}deg)
    `,
    transformOrigin: `${transform.anchorX * 100}% ${transform.anchorY * 100}%`,
  };
  
  // Calculate video time with playback rate and trimming
  const videoTime = (currentTime - layer.startTime) * layer.playbackRate + layer.trimStart;
  
  if (!layer.assetId) {
    return (
      <div 
        style={{ 
          ...transformStyle, 
          background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          color: 'white'
        }}
      >
        🎬 {layer.name}
      </div>
    );
  }
  
  return (
    <div style={transformStyle}>
      {/* This would be replaced with actual video rendering */}
      <div style={{
        width: '100%',
        height: '100%',
        background: `linear-gradient(${videoTime * 10}deg, #667eea, #764ba2)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '1.2rem'
      }}>
        Video: {layer.name} @ {videoTime.toFixed(1)}s
      </div>
    </div>
  );
};

interface ImageLayerComponentProps {
  layer: ImageLayer;
}

const ImageLayerComponent: React.FC<ImageLayerComponentProps> = ({ layer }) => {
  const { transform } = layer;
  
  const transformStyle: React.CSSProperties = {
    transform: `
      translate(${transform.x}px, ${transform.y}px) 
      scale(${transform.scaleX}, ${transform.scaleY}) 
      rotate(${transform.rotation}deg)
    `,
    transformOrigin: `${transform.anchorX * 100}% ${transform.anchorY * 100}%`,
  };
  
  if (!layer.assetId) {
    return (
      <div 
        style={{ 
          ...transformStyle, 
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          color: 'white'
        }}
      >
        🖼️ {layer.name}
      </div>
    );
  }
  
  return (
    <div style={transformStyle}>
      {/* This would be replaced with actual image rendering */}
      <div style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #84fab0, #8fd3f4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#333',
        fontSize: '1.2rem'
      }}>
        Image: {layer.name}
      </div>
    </div>
  );
};

interface EffectLayerComponentProps {
  layer: EffectLayer;
  currentTime: number;
}

const EffectLayerComponent: React.FC<EffectLayerComponentProps> = ({ layer, currentTime }) => {
  const animationPhase = (currentTime * 2) % (Math.PI * 2);
  
  switch (layer.effectType) {
    case 'metaballs':
      return <MetaballsEffect layer={layer} animationPhase={animationPhase} />;
    case 'particles':
      return <ParticlesEffect layer={layer} animationPhase={animationPhase} />;
    case 'midihud':
      return <MidiHudEffect layer={layer} currentTime={currentTime} />;
    case 'bloom':
      return <BloomEffect layer={layer} animationPhase={animationPhase} />;
    default:
      return null;
  }
};

const MetaballsEffect: React.FC<{ layer: EffectLayer; animationPhase: number }> = ({ layer, animationPhase }) => {
  const ballCount = layer.settings.ballCount || 8;
  const balls = Array.from({ length: ballCount }, (_, i) => {
    const angle = (i / ballCount) * Math.PI * 2 + animationPhase;
    const radius = 100 + Math.sin(animationPhase + i) * 50;
    const x = 50 + Math.cos(angle) * radius / 4;
    const y = 50 + Math.sin(angle) * radius / 4;
    const size = 30 + Math.sin(animationPhase * 2 + i) * 10;
    
    return { x, y, size, hue: (i * 360 / ballCount + animationPhase * 20) % 360 };
  });
  
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {balls.map((ball, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${ball.x}%`,
            top: `${ball.y}%`,
            width: `${ball.size}px`,
            height: `${ball.size}px`,
            borderRadius: '50%',
            background: `radial-gradient(circle, hsla(${ball.hue}, 70%, 60%, 0.8), transparent)`,
            transform: 'translate(-50%, -50%)',
            filter: 'blur(10px)',
          }}
        />
      ))}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        color: 'white',
        fontSize: '0.8rem',
        background: 'rgba(0,0,0,0.5)',
        padding: '4px 8px',
        borderRadius: '4px'
      }}>
        Metaballs: {layer.name}
      </div>
    </div>
  );
};

const ParticlesEffect: React.FC<{ layer: EffectLayer; animationPhase: number }> = ({ layer, animationPhase }) => {
  const particleCount = layer.settings.particleCount || 50;
  const particles = Array.from({ length: particleCount }, (_, i) => {
    const angle = (i / particleCount) * Math.PI * 2;
    const distance = (Math.sin(animationPhase + i * 0.1) + 1) * 200;
    const x = 50 + Math.cos(angle) * distance / 8;
    const y = 50 + Math.sin(angle) * distance / 8;
    const opacity = (Math.sin(animationPhase * 3 + i * 0.2) + 1) / 2;
    
    return { x, y, opacity, hue: (i * 10 + animationPhase * 50) % 360 };
  });
  
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: 'rgba(0,0,0,0.2)' }}>
      {particles.map((particle, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: '3px',
            height: '3px',
            borderRadius: '50%',
            background: `hsla(${particle.hue}, 80%, 70%, ${particle.opacity})`,
            transform: 'translate(-50%, -50%)',
            boxShadow: `0 0 10px hsla(${particle.hue}, 80%, 70%, ${particle.opacity * 0.5})`,
          }}
        />
      ))}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        color: 'white',
        fontSize: '0.8rem',
        background: 'rgba(0,0,0,0.5)',
        padding: '4px 8px',
        borderRadius: '4px'
      }}>
        Particles: {layer.name}
      </div>
    </div>
  );
};

const MidiHudEffect: React.FC<{ layer: EffectLayer; currentTime: number }> = ({ layer, currentTime }) => {
  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(45deg, rgba(255,0,150,0.1), rgba(0,150,255,0.1))'
    }}>
      <div style={{
        background: 'rgba(0,0,0,0.8)',
        color: '#00ff88',
        padding: '20px',
        borderRadius: '10px',
        fontFamily: 'monospace',
        fontSize: '1.2rem',
        textAlign: 'center',
        border: '2px solid #00ff88',
        boxShadow: '0 0 20px rgba(0,255,136,0.3)'
      }}>
        <div>MIDI HUD: {layer.name}</div>
        <div style={{ fontSize: '0.8rem', marginTop: '10px' }}>
          Time: {currentTime.toFixed(2)}s
        </div>
        <div style={{ fontSize: '0.8rem' }}>
          Bindings: {layer.midiBindings.length}
        </div>
      </div>
    </div>
  );
};

const BloomEffect: React.FC<{ layer: EffectLayer; animationPhase: number }> = ({ layer, animationPhase }) => {
  const intensity = layer.settings.intensity || 0.5;
  const pulseScale = 1 + Math.sin(animationPhase) * intensity * 0.3;
  
  return (
    <div style={{ 
      width: '100%', 
      height: '100%',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: `${300 * pulseScale}px`,
          height: `${300 * pulseScale}px`,
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle, 
            rgba(255,255,255,${intensity}) 0%, 
            rgba(255,200,100,${intensity * 0.7}) 30%, 
            rgba(255,100,100,${intensity * 0.4}) 60%, 
            transparent 100%)`,
          borderRadius: '50%',
          filter: `blur(${20 * intensity}px)`,
        }}
      />
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'white',
        fontSize: '0.8rem',
        background: 'rgba(0,0,0,0.5)',
        padding: '4px 8px',
        borderRadius: '4px',
        textAlign: 'center'
      }}>
        Bloom: {layer.name}
      </div>
    </div>
  );
};

function isLayerActiveAtTime(layer: Layer, time: number): boolean {
  return time >= layer.startTime && time <= layer.endTime;
}