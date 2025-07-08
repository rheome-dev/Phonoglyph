import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { VideoTrigger, TriggerType, VideoEffect, MIDITriggerCondition } from '@/lib/video/effectTriggers';

interface TriggerConfigPanelProps {
  layerId: string;
  triggers: VideoTrigger[];
  onAddTrigger: (trigger: Omit<VideoTrigger, 'id'>) => void;
  onUpdateTrigger: (triggerId: string, updates: Partial<VideoTrigger>) => void;
  onRemoveTrigger: (triggerId: string) => void;
}

export const TriggerConfigPanel: React.FC<TriggerConfigPanelProps> = ({
  layerId,
  triggers,
  onAddTrigger,
  onUpdateTrigger,
  onRemoveTrigger
}) => {
  const [isAdding, setIsAdding] = useState(false);
  
  return (
    <Card className="bg-stone-200/90 backdrop-blur-md border-stone-400">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-stone-700 uppercase tracking-wide text-sm">
            Video Triggers
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setIsAdding(true)}
            className="h-7 w-7 p-0 bg-stone-600 hover:bg-stone-700"
          >
            +
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {triggers.map((trigger) => (
          <TriggerItem
            key={trigger.id}
            trigger={trigger}
            onUpdate={(updates) => onUpdateTrigger(trigger.id, updates)}
            onRemove={() => onRemoveTrigger(trigger.id)}
          />
        ))}
        
        {isAdding && (
          <NewTriggerForm
            layerId={layerId}
            onAdd={(trigger) => {
              onAddTrigger(trigger);
              setIsAdding(false);
            }}
            onCancel={() => setIsAdding(false)}
          />
        )}
        
        {triggers.length === 0 && !isAdding && (
          <div className="text-center text-stone-600 py-4">
            <p className="text-sm">No video triggers</p>
            <p className="text-xs">Add triggers to sync video with MIDI</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const TriggerItem: React.FC<{
  trigger: VideoTrigger;
  onUpdate: (updates: Partial<VideoTrigger>) => void;
  onRemove: () => void;
}> = ({ trigger, onUpdate, onRemove }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="border border-stone-300 rounded-lg p-3 bg-stone-100 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-stone-700">{trigger.name}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0 text-stone-600"
          >
            {isExpanded ? '−' : '+'}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={trigger.enabled}
            onCheckedChange={(enabled) => onUpdate({ enabled })}
            className="scale-75"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={onRemove}
            className="h-6 w-6 p-0 text-red-600"
          >
            ×
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <Label>Trigger</Label>
          <p className="text-stone-600">{trigger.triggerType}</p>
        </div>
        <div>
          <Label>Effect</Label>
          <p className="text-stone-600">{trigger.effect.type}</p>
        </div>
      </div>
      
      <div className="space-y-1">
        <Label className="text-xs">Intensity: {Math.round(trigger.effect.intensity * 100)}%</Label>
        <Slider
          value={[trigger.effect.intensity * 100]}
          onValueChange={([value]) => onUpdate({
            effect: { ...trigger.effect, intensity: value / 100 }
          })}
          max={100}
          className="h-4"
        />
      </div>
      
      {isExpanded && (
        <TriggerDetailForm 
          trigger={trigger} 
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
};

const TriggerDetailForm: React.FC<{
  trigger: VideoTrigger;
  onUpdate: (updates: Partial<VideoTrigger>) => void;
}> = ({ trigger, onUpdate }) => {
  return (
    <div className="space-y-3 pt-2 border-t border-stone-300">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Duration (s)</Label>
          <Input
            type="number"
            value={trigger.effect.duration}
            onChange={(e) => onUpdate({
              effect: { ...trigger.effect, duration: parseFloat(e.target.value) || 0 }
            })}
            className="h-7 text-xs"
            step="0.1"
            min="0"
          />
        </div>
        <div>
          <Label className="text-xs">Cooldown (ms)</Label>
          <Input
            type="number"
            value={trigger.cooldown}
            onChange={(e) => onUpdate({ cooldown: parseInt(e.target.value) || 0 })}
            className="h-7 text-xs"
            min="0"
          />
        </div>
      </div>
      
      <div>
        <Label className="text-xs">MIDI Condition</Label>
        <Select
          value={trigger.midiCondition.type}
          onValueChange={(type) => onUpdate({
            midiCondition: { ...trigger.midiCondition, type: type as any }
          })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="note_on">Note On</SelectItem>
            <SelectItem value="note_velocity_threshold">Velocity Threshold</SelectItem>
            <SelectItem value="beat_detection">Beat Detection</SelectItem>
            <SelectItem value="chord_change">Chord Change</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {(trigger.midiCondition.type === 'note_on' || trigger.midiCondition.type === 'note_velocity_threshold') && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Note (0-127)</Label>
            <Input
              type="number"
              value={trigger.midiCondition.note || ''}
              onChange={(e) => onUpdate({
                midiCondition: { ...trigger.midiCondition, note: parseInt(e.target.value) || undefined }
              })}
              className="h-7 text-xs"
              placeholder="Any"
              min="0"
              max="127"
            />
          </div>
          <div>
            <Label className="text-xs">Channel (1-16)</Label>
            <Input
              type="number"
              value={trigger.midiCondition.channel || ''}
              onChange={(e) => onUpdate({
                midiCondition: { ...trigger.midiCondition, channel: parseInt(e.target.value) || undefined }
              })}
              className="h-7 text-xs"
              placeholder="Any"
              min="1"
              max="16"
            />
          </div>
        </div>
      )}
      
      {trigger.midiCondition.type === 'note_velocity_threshold' && (
        <div>
          <Label className="text-xs">Velocity Threshold (0-127)</Label>
          <Input
            type="number"
            value={trigger.midiCondition.velocityThreshold || ''}
            onChange={(e) => onUpdate({
              midiCondition: { ...trigger.midiCondition, velocityThreshold: parseInt(e.target.value) || undefined }
            })}
            className="h-7 text-xs"
            min="0"
            max="127"
          />
        </div>
      )}
      
      {trigger.midiCondition.type === 'beat_detection' && (
        <div>
          <Label className="text-xs">Beat Division</Label>
          <Select
            value={trigger.midiCondition.beatDivision?.toString() || '4'}
            onValueChange={(value) => onUpdate({
              midiCondition: { ...trigger.midiCondition, beatDivision: parseInt(value) }
            })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Whole Note</SelectItem>
              <SelectItem value="2">Half Note</SelectItem>
              <SelectItem value="4">Quarter Note</SelectItem>
              <SelectItem value="8">Eighth Note</SelectItem>
              <SelectItem value="16">Sixteenth Note</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      
      {trigger.midiCondition.type === 'chord_change' && (
        <div>
          <Label className="text-xs">Chord Tolerance (0-1)</Label>
          <Input
            type="number"
            value={trigger.midiCondition.chordTolerance || 0.5}
            onChange={(e) => onUpdate({
              midiCondition: { ...trigger.midiCondition, chordTolerance: parseFloat(e.target.value) || 0.5 }
            })}
            className="h-7 text-xs"
            step="0.1"
            min="0"
            max="1"
          />
        </div>
      )}
      
      <div>
        <Label className="text-xs">Effect Direction</Label>
        <Select
          value={trigger.effect.direction || 'none'}
          onValueChange={(direction) => onUpdate({
            effect: { ...trigger.effect, direction: direction === 'none' ? undefined : direction as any }
          })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="in">In</SelectItem>
            <SelectItem value="out">Out</SelectItem>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="right">Right</SelectItem>
            <SelectItem value="up">Up</SelectItem>
            <SelectItem value="down">Down</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label className="text-xs">Easing</Label>
        <Select
          value={trigger.effect.easing || 'linear'}
          onValueChange={(easing) => onUpdate({
            effect: { ...trigger.effect, easing: easing as any }
          })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="linear">Linear</SelectItem>
            <SelectItem value="ease-in">Ease In</SelectItem>
            <SelectItem value="ease-out">Ease Out</SelectItem>
            <SelectItem value="ease-in-out">Ease In Out</SelectItem>
            <SelectItem value="bounce">Bounce</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

const NewTriggerForm: React.FC<{
  layerId: string;
  onAdd: (trigger: Omit<VideoTrigger, 'id'>) => void;
  onCancel: () => void;
}> = ({ layerId, onAdd, onCancel }) => {
  const [formData, setFormData] = useState<Omit<VideoTrigger, 'id'>>({
    name: 'New Trigger',
    layerId,
    triggerType: 'cut',
    midiCondition: { type: 'note_on' },
    effect: {
      type: 'hard_cut',
      duration: 0.1,
      intensity: 1.0,
      easing: 'linear'
    },
    enabled: true,
    cooldown: 100,
    lastTriggered: 0
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
  };
  
  return (
    <form onSubmit={handleSubmit} className="border border-stone-400 rounded-lg p-3 bg-stone-50 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-stone-700">New Trigger</h4>
        <div className="flex gap-2">
          <Button type="submit" size="sm" className="h-6 text-xs">Save</Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-6 text-xs">Cancel</Button>
        </div>
      </div>
      
      <div>
        <Label className="text-xs">Name</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="h-7 text-xs"
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Trigger Type</Label>
          <Select
            value={formData.triggerType}
            onValueChange={(triggerType) => setFormData({ ...formData, triggerType: triggerType as TriggerType })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cut">Cut</SelectItem>
              <SelectItem value="asset_switch">Asset Switch</SelectItem>
              <SelectItem value="transition">Transition</SelectItem>
              <SelectItem value="effect_burst">Effect Burst</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Effect Type</Label>
          <Select
            value={formData.effect.type}
            onValueChange={(type) => setFormData({
              ...formData,
              effect: { ...formData.effect, type: type as any }
            })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hard_cut">Hard Cut</SelectItem>
              <SelectItem value="crossfade">Crossfade</SelectItem>
              <SelectItem value="slide">Slide</SelectItem>
              <SelectItem value="zoom">Zoom</SelectItem>
              <SelectItem value="spin">Spin</SelectItem>
              <SelectItem value="glitch">Glitch</SelectItem>
              <SelectItem value="strobe">Strobe</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </form>
  );
};