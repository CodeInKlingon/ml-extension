# Music League Companion Extension

A Chrome/Firefox web extension that serves as a companion app for the Music League website. Built with React, TypeScript, and Vite.

## Features

- **Smart Detection**: Automatically detects when you're on Music League pages
- **League Information**: Extracts and displays current league details
- **Quick Actions**: Provides quick access to common Music League functions
- **Floating Action Button**: Easy access to extension features while browsing
- **Modern UI**: Beautiful, responsive interface built with React

## Project Structure

```
ml-extension/
├── src/
│   ├── popup/           # Extension popup UI
│   │   ├── index.html   # Popup HTML
│   │   ├── main.tsx     # React entry point
│   │   ├── App.tsx      # Main popup component
│   │   ├── App.css      # Popup styles
│   │   └── index.css    # Base styles
│   ├── background/      # Background service worker
│   │   └── index.ts     # Background script
│   └── content-scripts/ # Content scripts
│       └── main.ts      # Content script for Music League pages
├── assets/              # Extension icons
├── package.json         # Dependencies and scripts
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── README.md           # This file
```

## Development

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

### Loading the Extension

#### Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder after building

#### Firefox
1. Open Firefox and go to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from the `dist` folder

## Configuration

The extension is configured through the `vite.config.ts` file. Key settings include:

- **Permissions**: Active tab, storage, and scripting permissions
- **Host Permissions**: Access to Music League domains
- **Content Scripts**: Automatically injected on Music League pages
- **Background Script**: Service worker for extension logic

## Building

The extension uses Vite for building with the `vite-plugin-web-extension` plugin. This provides:

- Hot module replacement during development
- TypeScript compilation
- Asset optimization
- Manifest generation

## Icons

The extension requires icons in multiple sizes (16x16, 32x32, 48x48, 128x128). Place your PNG icons in the `assets/` directory with the following names:

- `icon-16.png`
- `icon-32.png`
- `icon-48.png`
- `icon-128.png`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test the extension
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## TODO

- [ ] Add actual icon files
- [ ] Implement Music League API integration
- [ ] Add league statistics features
- [ ] Implement voting assistance
- [ ] Add notification system
- [ ] Create settings page
- [ ] Add keyboard shortcuts
- [ ] Implement data export/import 