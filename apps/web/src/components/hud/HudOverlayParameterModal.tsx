import React from 'react';
import { PortalModal } from '../ui/portal-modal';
import { DroppableParameter } from '../ui/droppable-parameter';

export function HudOverlayParameterModal({ overlay, onClose, onUpdate }: any) {
  return (
    <PortalModal title={`${overlay.type} Settings`} isOpen={true} onClose={onClose}>
      <div className="space-y-4">
        <DroppableParameter
          parameterId={overlay.id}
          label="Audio Stem"
          mappedFeatureId={overlay.stem?.id}
          mappedFeatureName={overlay.stem?.name}
          onFeatureDrop={(_id, featureId, stemType) => {
            // Only accept if featureId is a stem (not a single feature)
            onUpdate({ stem: { id: featureId, name: stemType || featureId, stemType } });
          }}
          onFeatureUnmap={(_id) => onUpdate({ stem: null })}
        >
          <div className="text-xs text-white/80">Drop a stem here to drive this overlay</div>
        </DroppableParameter>
        {/* Overlay-specific settings UI can go here */}
      </div>
    </PortalModal>
  );
}