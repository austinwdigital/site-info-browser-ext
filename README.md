# Site Info Browser Extension

This extension analyzes the current web page and displays:

- Font families, type scale, font sizes for headings (h1-h6), line heights, and font weights
- Color palette, with best guesses for background, primary, CTA, etc.
- Detected tools and technologies (frameworks, libraries, hosting)

## Features

- Works on Chrome and Safari (Manifest V3)
- Clean, modern popup UI with tabs and color swatches
- Copy and export functionality
- Advanced detection of technologies and color roles
- Robust error handling and fallbacks
- Font preview with appropriate font weights and sizes
- Intelligent type scale detection with standard ratio names
- Enhanced color deduplication

## Usage

1. Install the extension in your browser (see below).
2. Visit any website and click the extension icon in your browser toolbar.
3. Explore the site's typography, color scheme, and detected technologies.
4. Use the copy buttons to copy specific data or export all data as JSON.

## Installation

### Chrome

1. Clone this repo
2. Run `npm install` and `npm run build`
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" at the top-right corner
5. Click "Load unpacked" and select the `dist/` directory

### Safari

1. Complete the Chrome installation steps above
2. Install Xcode from the Mac App Store
3. Open Xcode and create a new project with "Safari Extension App" template
4. Copy files from the `dist/` directory to the appropriate locations in your Xcode project
5. Configure the `Info.plist` file with appropriate permissions
6. Build and run the extension in Safari

## Development

```bash
# Install dependencies
npm install

# Generate icons (if modifying the icon)
npm run icons

# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Package extension for distribution
npm run package
```

## Folder Structure

- `src/` — Source code (content scripts, popup, utils)
- `public/` — Static assets (icons, manifest)
- `dist/` — Build output (generated)

## Recent Changes

- Improved type scale calculation to show standard ratios (e.g., 1.2 for Minor Third)
- Added font weight display for headings and body text
- Enhanced color deduplication with normalized hex values
- Improved readability of font families with consistent sizing
- Fixed spacing and margins throughout for a more intentional look
- Limited heading preview sizes for better UI consistency
- Improved technology detection for libraries like Three.js, GSAP on production sites
- Added Vite detection for sites built with this tooling
- Fixed previous DOMException issues in technology detection
- Improved spacing between UI elements for better visual rhythm
- Better handling of different font sizes in headings

## License

MIT
