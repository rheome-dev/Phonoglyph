#!/usr/bin/env node

import { Command } from 'commander';
import { configCommand } from './commands/config';
import { createCommand } from './commands/create';
import { renderCommand } from './commands/render';
import { statusCommand } from './commands/status';
import { projectsCommand } from './commands/projects';

const program = new Command();

program
  .name('raybox')
  .description('Raybox CLI - Create audio-reactive videos from the command line')
  .version('0.1.0');

program.addCommand(configCommand);
program.addCommand(createCommand);
program.addCommand(renderCommand);
program.addCommand(statusCommand);
program.addCommand(projectsCommand);

program.parse();
