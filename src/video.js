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
          await this.page.waitForTimeout(500);
          break;
          
        case 'type':
          if (action.selector) {
            await this.page.type(action.selector, action.text, { delay: 100 });
          }
          break;
          
        case 'wait':
          await this.page.waitForTimeout(action.duration);
          break;
          
        case 'screenshot':
          const screenshotPath = path.join(this.outputDir, `step-${step.index}-${screenshots.length}.png`);
          await this.page.screenshot({ path: screenshotPath });
          screenshots.push(screenshotPath);
          console.log(`Captured screenshot: ${screenshotPath}`);
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
      await this.page.screenshot({ path: screenshotPath });
      screenshots.push(screenshotPath);
      console.log(`Captured default screenshot: ${screenshotPath}`);
    }
    
    return screenshots;
  }

  async generateStepVideo(screenshots, audioPath, stepIndex, duration) {
    const outputPath = path.join(this.videoDir, `step-${stepIndex}.mp4`);
    
    return new Promise((resolve, reject) => {
      const command = ffmpeg();
      
      // Add screenshots as input
      if (screenshots.length === 1) {
        // Single image, loop it for the duration
        command
          .input(screenshots[0])
          .loop(duration / 1000)
          .inputOptions(['-framerate 1']);
      } else {
        // Multiple images, create slideshow
        const frameDuration = duration / screenshots.length / 1000;
        for (const screenshot of screenshots) {
          command
            .input(screenshot)
            .inputOptions([`-t ${frameDuration}`]);
        }
      }
      
      // Add audio if available
      if (audioPath) {
        command.input(audioPath);
      }
      
      command
        .videoCodec('libx264')
        .outputOptions([
          '-pix_fmt yuv420p',
          '-shortest'
        ])
        .output(outputPath)
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
      const command = ffmpeg();
      
      // Create concat file
      const concatFilePath = path.join(this.videoDir, 'concat.txt');
      const concatContent = videoPaths.map(p => `file '${path.resolve(p)}'`).join('\n');
      
      fs.writeFile(concatFilePath, concatContent).then(() => {
        command
          .input(concatFilePath)
          .inputOptions(['-f concat', '-safe 0'])
          .videoCodec('libx264')
          .audioCodec('aac')
          .outputOptions(['-pix_fmt yuv420p'])
          .output(outputPath)
          .on('end', async () => {
            await fs.unlink(concatFilePath);
            console.log(`Generated final video: ${outputPath}`);
            resolve(outputPath);
          })
          .on('error', (err) => {
            console.error('Error combining videos:', err);
            reject(err);
          })
          .run();
      });
    });
  }
}