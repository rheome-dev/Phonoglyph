'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, Zap, BookOpen } from 'lucide-react';

// Local type definitions (will be replaced with proper imports later)
interface MIDIBinding {
  id: string;
  name: string;
  layerId: string;
  targetProperty: VideoProperty;
  midiSource: MIDISource;
  mapping: ParameterMapping;
  curve: CurveType;
  enabled: boolean;
  weight: number;
  blendMode: BindingBlendMode;
}

interface MIDISource {
  type: 'note_velocity' | 'note_on_off' | 'cc' | 'pitch_bend' | 'channel_pressure' | 'aftertouch';
  channel?: number;
  note?: number;
  controller?: number;
  trackIndex?: number;
}

interface VideoProperty {
  type: 'transform' | 'visual' | 'timing';
  property: string;
  component?: string;
}

interface ParameterMapping {
  inputMin: number;
  inputMax: number;
  outputMin: number;
  outputMax: number;
  clamp: boolean;
  invert: boolean;
}

type CurveType = 'linear' | 'exponential' | 'logarithmic' | 'smooth' | 'steps' | 'custom';
type BindingBlendMode = 'replace' | 'add' | 'multiply' | 'max' | 'min' | 'average';

interface MIDIBindingPanelProps {
  layerId: string;
  bindings: MIDIBinding[];
  onAddBinding: (binding: Omit<MIDIBinding, 'id'>) => void;
  onUpdateBinding: (bindingId: string, updates: Partial<MIDIBinding>) => void;
  onRemoveBinding: (bindingId: string) => void;
  onTestBinding: (bindingId: string) => void;
}

export const MIDIBindingPanel: React.FC<MIDIBindingPanelProps> = ({
  layerId,
  bindings,
  onAddBinding,
  onUpdateBinding,
  onRemoveBinding,
  onTestBinding
}) => {
  const [activeTab, setActiveTab] = useState<'bindings' | 'presets'>('bindings');
  const [isAddingBinding, setIsAddingBinding] = useState(false);
  const [expandedBinding, setExpandedBinding] = useState<string | null>(null);
  
  const enabledBindings = bindings.filter(b => b.enabled);
  const totalBindings = bindings.length;
  
  return (
    <Card className="bg-stone-200/90 backdrop-blur-md border-stone-400 flex flex-col h-96">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-stone-700 uppercase tracking-wide text-sm">
              MIDI Bindings
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {enabledBindings.length}/{totalBindings}
            </Badge>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={activeTab === 'bindings' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('bindings')}
              className="h-7 px-2 text-xs"
            >
              <Settings size={12} className="mr-1" />
              Bindings
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'presets' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('presets')}
              className="h-7 px-2 text-xs"
            >
              <BookOpen size={12} className="mr-1" />
              Presets
            </Button>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center gap-2 mt-2">
          <Button
            size="sm"
            onClick={() => setIsAddingBinding(true)}
            className="h-7 px-3 text-xs bg-stone-600 hover:bg-stone-700"
          >
            <Plus size={12} className="mr-1" />
            Add Binding
          </Button>
          
          {totalBindings > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-3 text-xs"
              onClick={() => {
                // Test all bindings with a sample value
                bindings.forEach(binding => onTestBinding(binding.id));
              }}
            >
              <Zap size={12} className="mr-1" />
              Test All
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 min-h-0 overflow-hidden p-0">
        {activeTab === 'bindings' ? (
          <BindingsTab
            bindings={bindings}
            isAddingBinding={isAddingBinding}
            expandedBinding={expandedBinding}
                         onAddBinding={(binding: Omit<MIDIBinding, 'id'>) => {
               onAddBinding(binding);
               setIsAddingBinding(false);
             }}
            onCancelAdd={() => setIsAddingBinding(false)}
            onToggleExpanded={(bindingId) => setExpandedBinding(
              expandedBinding === bindingId ? null : bindingId
            )}
            onUpdateBinding={onUpdateBinding}
            onRemoveBinding={onRemoveBinding}
            onTestBinding={onTestBinding}
            layerId={layerId}
          />
        ) : (
          <PresetsTab
            layerId={layerId}
            onApplyPreset={(preset) => {
              // Apply all bindings from the preset
              preset.bindings.forEach(binding => {
                onAddBinding({ ...binding, layerId });
              });
            }}
          />
        )}
      </CardContent>
    </Card>
  );
};

// Bindings Tab Component
interface BindingsTabProps {
  bindings: MIDIBinding[];
  isAddingBinding: boolean;
  expandedBinding: string | null;
  onAddBinding: (binding: Omit<MIDIBinding, 'id'>) => void;
  onCancelAdd: () => void;
  onToggleExpanded: (bindingId: string) => void;
  onUpdateBinding: (bindingId: string, updates: Partial<MIDIBinding>) => void;
  onRemoveBinding: (bindingId: string) => void;
  onTestBinding: (bindingId: string) => void;
  layerId: string;
}

const BindingsTab: React.FC<BindingsTabProps> = ({
  bindings,
  isAddingBinding,
  expandedBinding,
  onAddBinding,
  onCancelAdd,
  onToggleExpanded,
  onUpdateBinding,
  onRemoveBinding,
  onTestBinding,
  layerId
}) => {
  return (
    <div className="p-4 space-y-2 max-h-full overflow-y-auto">
      {bindings.map((binding) => (
        <BindingItem
          key={binding.id}
          binding={binding}
          isExpanded={expandedBinding === binding.id}
          onToggleExpanded={() => onToggleExpanded(binding.id)}
          onUpdate={(updates) => onUpdateBinding(binding.id, updates)}
          onRemove={() => onRemoveBinding(binding.id)}
          onTest={() => onTestBinding(binding.id)}
        />
      ))}
      
      {isAddingBinding && (
        <NewBindingForm
          layerId={layerId}
          onAdd={onAddBinding}
          onCancel={onCancelAdd}
        />
      )}
      
      {bindings.length === 0 && !isAddingBinding && (
        <div className="text-center text-stone-600 py-8">
          <div className="text-4xl mb-4">🎹</div>
          <p className="text-sm mb-2">No MIDI bindings</p>
          <p className="text-xs text-stone-500">
            Connect MIDI data to video properties for dynamic visuals
          </p>
        </div>
      )}
    </div>
  );
};

// Presets Tab Component  
interface PresetsTabProps {
  layerId: string;
  onApplyPreset: (preset: any) => void;
}

const PresetsTab: React.FC<PresetsTabProps> = ({ layerId, onApplyPreset }) => {
  return (
    <div className="p-4 space-y-2 max-h-full overflow-y-auto">
      <div className="text-center text-stone-600 py-8">
        <div className="text-4xl mb-4">📚</div>
        <p className="text-sm mb-2">Binding Presets</p>
        <p className="text-xs text-stone-500">
          Coming soon - quick setup templates for common MIDI mappings
        </p>
      </div>
    </div>
  );
};

// Placeholder components (will be implemented separately)
interface BindingItemProps {
  binding: MIDIBinding;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onUpdate: (updates: Partial<MIDIBinding>) => void;
  onRemove: () => void;
  onTest: () => void;
}

const BindingItem: React.FC<BindingItemProps> = ({ binding, isExpanded, onToggleExpanded, onUpdate, onRemove, onTest }) => {
  return (
    <div className="border border-stone-300 rounded-lg p-2 bg-stone-100">
      <div className="text-xs font-mono text-stone-700">
        {binding.name} - {binding.midiSource.type}
      </div>
      <div className="text-xs text-stone-500">
        → {binding.targetProperty.type}.{binding.targetProperty.property}
      </div>
    </div>
  );
};

interface NewBindingFormProps {
  layerId: string;
  onAdd: (binding: Omit<MIDIBinding, 'id'>) => void;
  onCancel: () => void;
}

const NewBindingForm: React.FC<NewBindingFormProps> = ({ layerId, onAdd, onCancel }) => {
  return (
    <div className="border border-stone-400 rounded-lg p-3 bg-stone-50">
      <div className="text-xs font-mono text-stone-700 mb-2">
        New MIDI Binding
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onCancel} variant="outline" className="h-7 text-xs">
          Cancel
        </Button>
        <Button size="sm" onClick={() => {
          // Create a basic binding for demonstration
          onAdd({
            name: 'New Binding',
            layerId,
            targetProperty: { type: 'visual', property: 'opacity' },
            midiSource: { type: 'note_velocity', note: 60 },
            mapping: { inputMin: 0, inputMax: 127, outputMin: 0, outputMax: 1, clamp: true, invert: false },
            curve: 'linear',
            enabled: true,
            weight: 1,
            blendMode: 'replace'
          });
        }} className="h-7 text-xs bg-stone-600 hover:bg-stone-700">
          Create
        </Button>
      </div>
    </div>
  );
};