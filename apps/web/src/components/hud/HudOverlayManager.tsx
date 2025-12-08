'use client';

import { useEffect, useMemo } from 'react';
import { HudOverlay } from './HudOverlay';
import { useTimelineStore } from '@/stores/timelineStore';
import { useStemAudioController } from '@/hooks/use-stem-audio-controller';
import type { Layer } from '@/types/video-composition';

type HudOverlayRendererProps = {
  stemUrlMap?: Record<string, string>;
};

const getOverlayStem = (layer: Layer, stemUrlMap: Record<string, string>) => {
  const settings = (layer as any).settings || {};
  const stemId = settings.stemId || settings.stem?.id;
  if (!stemId) return null;
  const url = stemUrlMap[stemId] || settings.stem?.url || '';
  return { id: stemId, url };
};

export function HudOverlayRenderer({ stemUrlMap = {} }: HudOverlayRendererProps) {
  const { layers, currentTime, updateLayer } = useTimelineStore((state) => ({
    layers: state.layers,
    currentTime: state.currentTime,
    updateLayer: state.updateLayer,
  }));

  const { loadStems } = useStemAudioController();

  const overlayLayers = useMemo(
    () => layers.filter((layer) => layer.type === 'overlay'),
    [layers],
  );

  const activeOverlays = useMemo(
    () =>
      overlayLayers.filter(
        (layer) =>
          currentTime >= (layer.startTime ?? 0) &&
          currentTime <= (layer.endTime ?? Number.POSITIVE_INFINITY),
      ),
    [overlayLayers, currentTime],
  );

  useEffect(() => {
    if (!loadStems) return;
    const stems = new Map<string, { id: string; url: string; label?: string; isMaster: boolean }>();
    overlayLayers.forEach((layer) => {
      const settings = (layer as any).settings || {};
      const stemId = settings.stemId || settings.stem?.id;
      const url = stemId ? stemUrlMap[stemId] || settings.stem?.url : undefined;
      if (!stemId || !url) return;
      if (!stems.has(stemId)) {
        stems.set(stemId, {
          id: stemId,
          url,
          label: layer.name,
          isMaster: Boolean(settings.isMaster),
        });
      }
    });
    const stemsToLoad = Array.from(stems.values());
    if (stemsToLoad.length > 0) {
      loadStems(stemsToLoad);
    }
  }, [overlayLayers, stemUrlMap, loadStems]);

  return (
    <div
      id="hud-overlays-container"
      className="absolute inset-0 pointer-events-none z-20 overflow-hidden"
    >
      {activeOverlays.map((layer) => {
        const stem = getOverlayStem(layer, stemUrlMap);
        const layerWithStem = stem
          ? {
              ...layer,
              settings: { ...(layer as any).settings, stem },
            }
          : layer;
        return (
          <HudOverlay
            key={layer.id}
            layer={layerWithStem}
            featureData={null}
            onOpenModal={() => {}}
            onUpdate={(updates: Partial<Layer>) => updateLayer(layer.id, updates)}
            isSelected={false}
            onSelect={() => {}}
          />
        );
      })}
    </div>
  );
}