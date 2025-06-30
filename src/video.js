import puppeteer from 'puppeteer';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';

export class VideoGenerator {
  constructor() {
    this.browser = null;
    this.page = null;
    this.outputDir = 'output/screenshots';
    this.videoDir = 'output/videos';
  }

  async ensureOutputDirs() {
    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.mkdir(this.videoDir, { recursive: true });
  }

  async initialize() {
    await this.ensureOutputDirs();
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: {
        width: 1920,
        height: 1080
      },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async executeStep(step) {
    const screenshots = [];
    
    for (const action of step.actions) {
      switch (action.type) {
        case 'navigate':
          await this.page.goto(action.url, { waitUntil: 'networkidle2' });
          break;
          
        case 'click':
          await this.page.click(action.selector);
          await new Promise(resolve => setTimeout(resolve, 500));
          break;
          
        case 'type':
          if (action.selector) {
            await this.page.type(action.selector, action.text, { delay: 100 });
          }
          break;
          
        case 'wait':
          await new Promise(resolve => setTimeout(resolve, action.duration));
          break;
          
        case 'screenshot':
          const screenshotPath = path.join(this.outputDir, `step-${step.index}-${screenshots.length}.png`);
          try {
            await this.page.screenshot({ path: screenshotPath, fullPage: true });
            // Verify file exists
            await fs.access(screenshotPath);
            screenshots.push(screenshotPath);
            console.log(`Captured screenshot: ${screenshotPath}`);
          } catch (error) {
            console.error(`Failed to capture screenshot at ${screenshotPath}:`, error);
            throw error;
          }
          break;
          
        case 'action':
          // Custom action - could be extended
          console.log(`Executing custom action: ${action.text}`);
          break;
      }
    }
    
    // If no explicit screenshots, take one at the end of the step
    if (screenshots.length === 0) {
      const screenshotPath = path.join(this.outputDir, `step-${step.index}.png`);
      try {
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        // Verify file exists
        await fs.access(screenshotPath);
        screenshots.push(screenshotPath);
        console.log(`Captured default screenshot: ${screenshotPath}`);
      } catch (error) {
        console.error(`Failed to capture default screenshot at ${screenshotPath}:`, error);
        throw error;
      }
    }
    
    return screenshots;
  }

  async generateStepVideo(screenshots, audioPath, stepIndex, duration) {
    const outputPath = path.join(this.videoDir, `step-${stepIndex}.mp4`);
    
    // Verify all screenshot files exist
    for (const screenshot of screenshots) {
      try {
        await fs.access(screenshot);
      } catch (error) {
        throw new Error(`Screenshot file not found: ${screenshot}`);
      }
    }
    
    // Handle concat file for multiple images
    let concatFile = null;
    if (screenshots.length > 1) {
      concatFile = path.join(this.videoDir, `concat-${stepIndex}.txt`);
      const frameDuration = duration / screenshots.length / 1000;
      const concatContent = screenshots.map(img => `file '${path.resolve(img)}'\nduration ${frameDuration}`).join('\n');
      await fs.writeFile(concatFile, concatContent);
    }
    
    return new Promise((resolve, reject) => {
      const command = ffmpeg();
      
      // Add screenshots as input
      if (screenshots.length === 1) {
        // Single image, loop it for the duration
        command
          .input(screenshots[0])
          .inputOptions(['-loop 1', '-framerate 1']);
      } else {
        // Multiple images, create slideshow - use concat demuxer
        command
          .input(concatFile)
          .inputOptions(['-f concat', '-safe 0']);
      }
      
      // Add audio if available
      if (audioPath) {
        command.input(audioPath);
        // Set duration based on audio or specified duration
        command.outputOptions([
          '-c:v libx264',
          '-c:a aac',
          '-pix_fmt yuv420p',
          '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
          '-shortest'
        ]);
      } else {
        command.outputOptions([
          '-c:v libx264',
          '-pix_fmt yuv420p',
          '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
          '-t', String(duration / 1000),
          '-an'
        ]);
      }
      
      command
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log(`FFmpeg command: ${commandLine}`);
        })
        .on('stderr', (stderrLine) => {
          console.log(`FFmpeg stderr: ${stderrLine}`);
        })
        .on('end', () => {
          console.log(`Generated video for step ${stepIndex}: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error(`Error generating video for step ${stepIndex}:`, err);
          reject(err);
        })
        .run();
    });
  }

  async combineVideos(videoPaths, outputPath) {
    return new Promise((resolve, reject) => {
      // Create concat file
      const concatFilePath = path.join(this.videoDir, 'concat.txt');
      const concatContent = videoPaths.map(p => `file '${path.resolve(p)}'`).join('\n');
      
      fs.writeFile(concatFilePath, concatContent).then(() => {
        const command = ffmpeg()
          .input(concatFilePath)
          .inputOptions(['-f concat', '-safe 0'])
          .outputOptions([
            '-c:v libx264',
            '-c:a aac',
            '-pix_fmt yuv420p',
            '-avoid_negative_ts make_zero'
          ])
          .output(outputPath)
          .on('end', async () => {
            try {
              await fs.unlink(concatFilePath);
            } catch (e) {
              // Ignore cleanup errors
            }
            console.log(`Generated final video: ${outputPath}`);
            resolve(outputPath);
          })
          .on('error', (err) => {
            console.error('Error combining videos:', err);
            reject(err);
          })
          .run();
      }).catch(reject);
    });
  }
}