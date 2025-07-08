import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setPixelFormat('yuv420p');
Config.setCodec('h264');
Config.setCrf(18);
Config.setEntryPoint('./src/index.ts');

// Performance optimizations
Config.setBrowserExecutable(null); // Use default
Config.setTimeoutInMilliseconds(120000);
Config.setConcurrency(1);