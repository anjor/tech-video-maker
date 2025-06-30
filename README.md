# Tech Video Maker

Generate professional demo videos from markdown files with AI-powered voice narration.

## Features

- 🎬 **Automated Video Generation** - Convert markdown scripts into polished demo videos
- 🎙️ **AI Voice Narration** - Natural-sounding voiceovers using OpenAI's TTS
- 📸 **Smart Screenshots** - Automated web page capture with Puppeteer
- 📝 **Simple Markdown Format** - Write demos in plain markdown
- 🎨 **Customizable** - Multiple voice options and configurable timing

## Prerequisites

- Node.js 18+ 
- FFmpeg installed on your system
- OpenAI API key (for voice generation)

## Installation

```bash
git clone https://github.com/yourusername/tech-video-maker.git
cd tech-video-maker
npm install
```

## Configuration

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Add your OpenAI API key to `.env`:
```
OPENAI_API_KEY=your_openai_api_key_here
```

## Usage

### Generate a Demo Video

```bash
npm start generate <markdown-file>
```

Example:
```bash
npm start generate example-demo.md
```

### Command Options

- `-o, --output <path>` - Output video file path (default: `output/demo.mp4`)
- `-v, --voice <voice>` - Voice selection: alloy, echo, fable, onyx, nova, shimmer (default: alloy)
- `--no-audio` - Generate video without voice narration
- `--screenshots-only` - Only capture screenshots without creating video

### Validate Markdown

Check if your markdown file is properly formatted:

```bash
npm start validate <markdown-file>
```

## Markdown Format

Create demo scripts using this structure:

```markdown
# Demo Title

## Step Name

Duration: 5s

Description of what happens in this step.

Narration: What the AI voice should say during this step.

- Navigate: https://example.com
- Wait: 2s
- Screenshot: homepage
- Click: button.primary
- Type: Hello World in input#search
- Action: Custom action description
```

### Supported Actions

- **Navigate**: `- Navigate: <url>` - Go to a webpage
- **Click**: `- Click: <css-selector>` - Click an element
- **Type**: `- Type: <text> in <css-selector>` - Type text into a field
- **Wait**: `- Wait: <duration>` - Pause (e.g., "2s", "500ms")
- **Screenshot**: `- Screenshot: <name>` - Capture the current view
- **Action**: `- Action: <description>` - Custom action placeholder

### Step Properties

- **Duration**: How long the step displays (e.g., "5s", "3000ms")
- **Narration**: Text for AI voice (auto-generated from description if omitted)
- **Description**: General step description

## Example

See `example-demo.md` for a complete demo script that creates a GitHub tour video.

## Output Structure

```
output/
├── audio/          # Generated voice files
├── screenshots/    # Captured screenshots
└── videos/         # Step videos and final output
```

## Tips

1. **Timing**: Allow enough duration for narration to complete
2. **Selectors**: Use specific CSS selectors for reliable clicking
3. **Screenshots**: Take screenshots after important actions
4. **Narration**: Keep it concise and clear

## Troubleshooting

### FFmpeg not found
Install FFmpeg:
- macOS: `brew install ffmpeg`
- Ubuntu: `sudo apt install ffmpeg`
- Windows: Download from [ffmpeg.org](https://ffmpeg.org)

### Browser issues
The tool uses Puppeteer in non-headless mode. Ensure you have Chrome/Chromium installed.

### API rate limits
OpenAI has rate limits. For long videos, you may need to add delays between voice generations.

## License

MIT