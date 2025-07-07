import os
import argparse
from spleeter.separator import Separator
from spleeter.audio.adapter import AudioAdapter

def process_audio(input_path, output_path, model_variant='4stems', output_format='wav', sample_rate=44100):
    """Process an audio file using Spleeter."""
    # Initialize the separator with specified model
    separator = Separator(f'spleeter:{model_variant}')
    
    # Configure audio adapter
    audio_adapter = AudioAdapter.default()
    
    # Load audio file
    waveform, _ = audio_adapter.load(input_path, sample_rate=sample_rate)
    
    # Process the audio file
    prediction = separator.separate(waveform)
    
    # Save all stems
    for stem_name, stem_data in prediction.items():
        output_name = os.path.join(output_path, f'{stem_name}.{output_format}')
        audio_adapter.save(output_name, stem_data, sample_rate, output_format)
        print(f"Saved {stem_name} to {output_name}")

def main():
    """Main processing loop."""
    parser = argparse.ArgumentParser(description='Process audio files using Spleeter')
    parser.add_argument('--model', type=str, default='4stems', choices=['2stems', '4stems', '5stems'],
                      help='Spleeter model variant to use')
    parser.add_argument('--output-format', type=str, default='wav', choices=['wav', 'mp3'],
                      help='Output audio format')
    parser.add_argument('--sample-rate', type=int, default=44100, choices=[44100, 48000],
                      help='Output sample rate')
    args = parser.parse_args()
    
    input_dir = '/app/input'
    output_dir = '/app/output'
    
    # Process any files in the input directory
    for filename in os.listdir(input_dir):
        if filename.endswith(('.mp3', '.wav')):
            input_path = os.path.join(input_dir, filename)
            print(f"Processing {filename}...")
            process_audio(
                input_path, 
                output_dir, 
                model_variant=args.model,
                output_format=args.output_format,
                sample_rate=args.sample_rate
            )
            print(f"Finished processing {filename}")

if __name__ == '__main__':
    main() 