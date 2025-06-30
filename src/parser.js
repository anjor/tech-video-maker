import { marked } from 'marked';
import fs from 'fs/promises';

export class DemoPathParser {
  constructor() {
    this.steps = [];
  }

  async parseMarkdown(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const tokens = marked.lexer(content);
    
    let currentStep = null;
    let stepIndex = 0;

    for (const token of tokens) {
      if (token.type === 'heading' && token.depth === 2) {
        if (currentStep) {
          this.steps.push(currentStep);
        }
        currentStep = {
          index: stepIndex++,
          title: token.text,
          description: '',
          actions: [],
          narration: '',
          duration: 5000 // default 5 seconds
        };
      } else if (currentStep) {
        if (token.type === 'paragraph') {
          if (token.text.startsWith('Duration:')) {
            currentStep.duration = this.parseDuration(token.text);
          } else if (token.text.startsWith('Narration:')) {
            currentStep.narration = token.text.replace('Narration:', '').trim();
          } else {
            currentStep.description += token.text + '\n';
          }
        } else if (token.type === 'list') {
          for (const item of token.items) {
            if (item.text.startsWith('Action:')) {
              currentStep.actions.push({
                type: 'action',
                text: item.text.replace('Action:', '').trim()
              });
            } else if (item.text.startsWith('Screenshot:')) {
              currentStep.actions.push({
                type: 'screenshot',
                path: item.text.replace('Screenshot:', '').trim()
              });
            } else if (item.text.startsWith('Navigate:')) {
              currentStep.actions.push({
                type: 'navigate',
                url: item.text.replace('Navigate:', '').trim()
              });
            } else if (item.text.startsWith('Click:')) {
              currentStep.actions.push({
                type: 'click',
                selector: item.text.replace('Click:', '').trim()
              });
            } else if (item.text.startsWith('Type:')) {
              const parts = item.text.replace('Type:', '').trim().split(' in ');
              currentStep.actions.push({
                type: 'type',
                text: parts[0],
                selector: parts[1] || ''
              });
            } else if (item.text.startsWith('Wait:')) {
              currentStep.actions.push({
                type: 'wait',
                duration: this.parseDuration(item.text.replace('Wait:', '').trim())
              });
            }
          }
        }
      }
    }

    if (currentStep) {
      this.steps.push(currentStep);
    }

    return this.steps;
  }

  parseDuration(text) {
    const match = text.match(/(\d+)\s*(s|sec|seconds?|ms|milliseconds?)/i);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      if (unit.startsWith('m')) {
        return value;
      } else {
        return value * 1000;
      }
    }
    return 5000; // default 5 seconds
  }

  generateNarrationIfMissing() {
    for (const step of this.steps) {
      if (!step.narration) {
        step.narration = step.description || step.title;
      }
    }
  }
}