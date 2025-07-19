# Event-Based Features Testing Guide

## Overview

The event-based features system has been integrated with your existing Meyda.js pipeline and audio analysis workers. This guide explains how to test the new functionality in your deployed app.

## What's New

### 🎯 **Event-Based Features**
- **Transient Events**: Kick drum triggers, snare hits, hi-hat attacks with controllable ADSR envelopes
- **Chroma Events**: Pitch detection, harmony changes, note changes with confidence scoring
- **MIDI-like Interface**: Discrete events instead of continuous modulation
- **Envelope Control**: Attack, Decay, Sustain, Release shaping for transient events

### 🔧 **Integration Points**
- Uses existing `audio_analysis_cache` table (Meyda.js data)
- Enhanced `audio-analysis-worker.js` with event detection
- New `audio_event_cache` table for processed events
- Compatible with existing drag-and-drop system

## Testing Steps

### 1. **Backend Verification**

First, verify the backend is working:

```bash
# Check if the new tables exist
psql your-database-url -c "\dt audio_event_cache"
psql your-database-url -c "\dt event_based_mappings"

# Check if the tRPC router is registered
# Look for "eventBasedMappingRouter" in your API logs
```

### 2. **Frontend Integration Test**

Add the test component to any page in your app:

```tsx
import { EventBasedFeaturesTest } from '@/components/ui/EventBasedFeaturesTest';

// In your page component:
<EventBasedFeaturesTest 
  projectId="your-project-id"
  trackId="your-track-id" 
  stemType="drums"
/>
```

### 3. **Testing Workflow**

1. **Load Audio**: Ensure you have audio files with analysis data in `audio_analysis_cache`
2. **Extract Events**: Click "Extract Events" to process Meyda data into events
3. **Simulate Playback**: Use the test player to see real-time event detection
4. **Drag Features**: Try dragging event-based features to effect parameters

### 4. **Expected Behavior**

#### ✅ **Working Features**
- Event-based features appear in the MappingSourcesPanel
- Transient events show envelope visualization
- Chroma events show confidence indicators
- Real-time value updates during playback simulation
- Drag-and-drop compatibility with existing system

#### ⚠️ **Known Limitations**
- Requires existing Meyda analysis data in cache
- Event detection is simplified (uses RMS + spectral centroid)
- Chroma analysis is basic (spectral centroid to pitch class)
- No real audio playback integration yet

## Integration with Existing System

### **Replacing Continuous Features**

The event-based features are designed to replace the existing continuous features:

```tsx
// OLD: Continuous features
const features = useAudioFeatures(trackId, stemType);

// NEW: Event-based features  
const { features, getFeatureValue } = useEventBasedFeatures(
  trackId, stemType, currentTime, projectId
);
```

### **Drag-and-Drop Compatibility**

Event-based features work with your existing drag-and-drop system:

```tsx
// The drag item now includes event-specific data
const dragItem = {
  id: feature.id,
  name: feature.name,
  stemType: feature.stemType,
  isEventBased: true,        // NEW
  eventType: feature.eventType, // NEW
  envelope: feature.envelope,    // NEW
  sensitivity: feature.sensitivity // NEW
};
```

### **Portal Modal Integration**

Your existing `portal-modal.tsx` parameter destinations should work with event-based features. The mapped values will now be:

- **Transient Events**: Envelope-shaped curves instead of spikes
- **Chroma Events**: Stepped values with confidence
- **Volume/Brightness**: Continuous values (unchanged)

## Troubleshooting

### **No Events Detected**
1. Check if `audio_analysis_cache` has data for your file/stem
2. Verify the tRPC endpoint is working: `POST /api/trpc/eventBasedMapping.extractAudioEvents`
3. Check browser console for errors

### **Events Not Updating**
1. Ensure `currentTime` is being passed correctly
2. Check if `audioEventData` is being loaded
3. Verify the event detection algorithms are working

### **Drag-and-Drop Issues**
1. Ensure DnD context is available
2. Check if the drag item structure matches expectations
3. Verify the drop target accepts the new item format

## Next Steps

### **Production Integration**
1. Replace `useAudioFeatures` with `useEventBasedFeatures` in your main app
2. Update parameter mapping logic to handle envelope curves
3. Integrate with real audio playback timing
4. Add envelope controls UI

### **Enhancement Ideas**
1. **Better Chroma Analysis**: Use actual FFT bins for pitch detection
2. **Advanced Transient Detection**: Multi-band onset detection
3. **Event Filtering**: Frequency-based transient classification
4. **Real-time Processing**: Live event detection during playback

## Performance Notes

- Event extraction is done once per file/stem combination
- Events are cached in `audio_event_cache` for performance
- Real-time envelope calculation is lightweight
- No impact on existing audio analysis performance

## Files Modified

### **New Files**
- `apps/web/src/hooks/use-event-based-features.ts`
- `apps/web/src/components/ui/EventBasedFeatureNode.tsx`
- `apps/web/src/components/ui/EventBasedFeaturesTest.tsx`

### **Modified Files**
- `apps/web/src/components/ui/MappingSourcesPanel.tsx`
- `apps/web/src/hooks/use-event-based-mapping.ts`
- `apps/api/src/services/event-based-mapping.ts`
- `apps/api/src/routers/event-based-mapping.ts`
- `apps/web/public/workers/audio-analysis-worker.js`

### **Database**
- `apps/api/src/db/migrations/018_event_based_mappings.sql`

## Testing Checklist

- [ ] Backend tables created successfully
- [ ] tRPC endpoints responding
- [ ] Event extraction working
- [ ] Real-time event detection
- [ ] Envelope visualization
- [ ] Drag-and-drop compatibility
- [ ] Portal modal integration
- [ ] Performance acceptable
- [ ] Error handling working 