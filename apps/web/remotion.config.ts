import { Config } from '@remotion/cli/config';
import path from 'path';

Config.overrideWebpackConfig((config) => {
  // Resolve the @/ alias to ./src relative to the current working directory (web app root)
  const srcPath = path.resolve(process.cwd(), 'src');
  
  config.resolve = config.resolve || {};
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    '@': srcPath,
  };
  
  return config;
});

// Force software rendering for stability in headless mode
// swangle is the most stable for environments where hardware acceleration is finicky
Config.setChromiumOpenGlRenderer('swangle');

// Disable hardware acceleration in headless mode to prevent GPU issues
Config.setChromiumOptions({
  args: ['--disable-gpu', '--disable-software-rasterizer'],
});

