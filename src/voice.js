import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';

export class VoiceGenerator {
  constructor(apiKey) {
    this.openai = new OpenAI({ apiKey });
    this.outputDir = 'output/audio';
  }

  async ensureOutputDir() {
    await fs.mkdir(this.outputDir, { recursive: true });
  }

  async generateVoice(text, stepIndex, voice = 'alloy') {
    await this.ensureOutputDir();
    
    const outputPath = path.join(this.outputDir, `step-${stepIndex}.mp3`);
    
    try {
      const mp3 = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: voice,
        input: text,
        speed: 0.95 // slightly slower for clarity
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      await fs.writeFile(outputPath, buffer);
      
      console.log(`Generated voice for step ${stepIndex}: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error(`Error generating voice for step ${stepIndex}:`, error);
      throw error;
    }
  }

  async generateAllVoices(steps, voice = 'alloy') {
    const audioFiles = [];
    
    for (const step of steps) {
      const audioPath = await this.generateVoice(
        step.narration || step.description || step.title,
        step.index,
        voice
      );
      audioFiles.push({
        stepIndex: step.index,
        path: audioPath
      });
    }
    
    return audioFiles;
  }

  getAvailableVoices() {
    return ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  }
}