import { Command } from 'commander';
import ora from 'ora';
import { getClient } from '../lib/client';

export const projectsCommand = new Command('projects')
  .description('List your projects')
  .action(async () => {
    const client = getClient();

    const spinner = ora('Loading projects...').start();
    try {
      const projects: any[] = await client.query('project.list');
      spinner.stop();

      if (!projects || projects.length === 0) {
        console.log('No projects found.');
        return;
      }

      console.log(`\n${'ID'.padEnd(30)} ${'Name'.padEnd(30)} ${'Created'}`);
      console.log('-'.repeat(80));

      for (const p of projects) {
        const date = new Date(p.created_at).toLocaleDateString();
        console.log(`${(p.id || '').padEnd(30)} ${(p.name || '').padEnd(30)} ${date}`);
      }

      console.log(`\n${projects.length} project(s)`);
    } catch (err: any) {
      spinner.fail(`Failed to list projects: ${err.message}`);
      process.exit(1);
    }
  });
