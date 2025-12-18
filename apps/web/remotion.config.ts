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

// Force software rendering for stability in headless mode (CLI commands only)
// swangle is the most stable for environments where hardware acceleration is finicky
// Note: This only affects CLI commands. For Lambda, set chromiumOptions.gl in renderMediaOnLambda
// For preview, use --gl flag or CHROMIUM_OPENGL_RENDERER environment variable
Config.setChromiumOpenGlRenderer('swangle');

