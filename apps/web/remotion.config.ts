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

