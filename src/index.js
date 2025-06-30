#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';
import path from 'path';
import { DemoPathParser } from './parser.js';
import { VoiceGenerator } from './voice.js';
import { VideoGenerator } from './video.js';

dotenv.config();

const program = new Command();

program
  .name('tech-video-maker')
  .description('Generate demo videos from markdown files')
  .version('1.0.0');

program
  .command('generate')
  .alias('gen')
  .description('Generate a demo video from a markdown file')
  .argument('<markdown-file>', 'Path to the demo markdown file')
  .option('-o, --output <path>', 'Output video file path', 'output/demo.mp4')
  .option('-v, --voice <voice>', 'Voice to use (alloy, echo, fable, onyx, nova, shimmer)', 'alloy')
  .option('--no-audio', 'Generate video without audio narration')
  .option('--screenshots-only', 'Only capture screenshots without generating video')
  .action(async (markdownFile, options) => {
    try {
      console.log(chalk.blue('Starting demo video generation...'));
      
      // Check for API key
      if (!process.env.OPENAI_API_KEY && !options.noAudio) {
        console.error(chalk.red('Error: OPENAI_API_KEY not found in environment variables'));
        console.log(chalk.yellow('Please create a .env file with your OpenAI API key or use --no-audio flag'));
        process.exit(1);
      }
      
      // Parse the markdown file
      console.log(chalk.gray('Parsing markdown file...'));
      const parser = new DemoPathParser();
      const steps = await parser.parseMarkdown(markdownFile);
      parser.generateNarrationIfMissing();
      
      console.log(chalk.green(`Found ${steps.length} steps in the demo path`));
      
      // Generate voice narration if enabled
      let audioFiles = [];
      if (!options.noAudio) {
        console.log(chalk.gray('Generating voice narration...'));
        const voiceGen = new VoiceGenerator(process.env.OPENAI_API_KEY);
        audioFiles = await voiceGen.generateAllVoices(steps, options.voice);
        console.log(chalk.green('Voice narration generated successfully'));
      }
      
      // Generate video
      console.log(chalk.gray('Capturing screenshots and generating video...'));
      const videoGen = new VideoGenerator();
      await videoGen.initialize();
      
      const stepVideos = [];
      
      try {
        for (const step of steps) {
          console.log(chalk.gray(`Processing step ${step.index + 1}: ${step.title}`));
          
          // Execute step and capture screenshots
          const screenshots = await videoGen.executeStep(step);
          
          if (!options.screenshotsOnly) {
            // Find corresponding audio file
            const audioFile = audioFiles.find(a => a.stepIndex === step.index);
            
            // Generate video for this step
            const stepVideo = await videoGen.generateStepVideo(
              screenshots,
              audioFile?.path,
              step.index,
              step.duration
            );
            
            stepVideos.push(stepVideo);
          }
        }
        
        if (!options.screenshotsOnly && stepVideos.length > 0) {
          // Combine all step videos into final video
          console.log(chalk.gray('Combining step videos...'));
          await videoGen.combineVideos(stepVideos, options.output);
          console.log(chalk.green(`✓ Demo video generated successfully: ${options.output}`));
        } else if (options.screenshotsOnly) {
          console.log(chalk.green('✓ Screenshots captured successfully'));
        }
        
      } finally {
        await videoGen.close();
      }
      
    } catch (error) {
      console.error(chalk.red('Error generating demo video:'), error);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate a demo markdown file')
  .argument('<markdown-file>', 'Path to the demo markdown file')
  .action(async (markdownFile) => {
    try {
      console.log(chalk.blue('Validating markdown file...'));
      
      const parser = new DemoPathParser();
      const steps = await parser.parseMarkdown(markdownFile);
      
      console.log(chalk.green(`✓ Valid demo file with ${steps.length} steps:`));
      
      steps.forEach((step, index) => {
        console.log(chalk.gray(`\nStep ${index + 1}: ${step.title}`));
        console.log(`  Duration: ${step.duration}ms`);
        console.log(`  Actions: ${step.actions.length}`);
        if (step.narration) {
          console.log(`  Narration: ${step.narration.substring(0, 50)}...`);
        }
      });
      
    } catch (error) {
      console.error(chalk.red('Error validating markdown file:'), error);
      process.exit(1);
    }
  });

program.parse();