# Audio Analysis Sandbox

This sandbox environment allows you to test a new audio analysis pipeline focused on transient detection, chroma analysis, and RMS processing.

## Features

- **Transient Detection**: Spectral flux-based onset detection
- **Chroma Analysis**: YIN pitch detection for MIDI-like note analysis  
- **RMS Processing**: Configurable window-based amplitude analysis
- **Real-time Visualization**: Interactive waveforms with analysis overlays
- **Parameter Tuning**: Adjustable thresholds and settings
- **Cache Integration**: Save/load analysis results to backend

## API Configuration

The sandbox requires the API server to be running. Make sure your environment variables are set:

```bash
# In your .env.local file
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Or for production:
```bash
NEXT_PUBLIC_API_URL=https://api.phonoglyph.rheome.tools
```

## Usage

1. Navigate to `/audio-analysis-sandbox`
2. Upload an audio file (MP3, WAV, etc.)
3. Adjust analysis parameters using the sliders
4. View real-time visualizations
5. Save results to backend cache
6. Compare with existing analysis methods

## API Endpoints

The sandbox uses the following tRPC endpoints:

- `audioAnalysisSandbox.saveSandboxAnalysis` - Save analysis to cache
- `audioAnalysisSandbox.getSandboxAnalysis` - Load analysis from cache
- `audioAnalysisSandbox.compareAnalysis` - Compare analysis methods
- `audioAnalysisSandbox.getSandboxAnalyses` - List all sandbox analyses
- `audioAnalysisSandbox.deleteSandboxAnalysis` - Delete analysis

## Troubleshooting

If you see a 404 error for the API:

1. Ensure the API server is running on the correct port
2. Check your `NEXT_PUBLIC_API_URL` environment variable
3. Verify the tRPC router is properly configured
4. Check browser console for detailed error messages

## Development

To add new analysis features:

1. Update the analysis algorithms in `AudioAnalysisSandbox` component
2. Add new parameters to the `AnalysisParameters` component
3. Update the visualization in `AnalysisVisualization` component
4. Modify the API schema in `audio-analysis-sandbox.ts` router




