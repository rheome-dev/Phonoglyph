import { Config } from '@remotion/cli/config';
import path from 'path';

console.log('[remotion.config] Loading configuration...');

// Set the public path for S3 subfolder deployment
Config.setPublicPath('/sites/raybox-renderer/');

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

// Increase delayRender timeout from default 30s to 120s (2 minutes)
// This is needed for loading large payloads and R2 images during initialization
Config.setDelayRenderTimeoutInMilliseconds(120000);
console.log('[remotion.config] Set delayRender timeout to 120000ms');

