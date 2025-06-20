// This script runs in the context of the page and collects site info
(function () {
  console.log('Site Info Extension: Content script starting analysis');

  try {
    // Only run once, avoid duplicate analysis
    if (window.__SITE_INFO__) {
      console.log('Site Info Extension: Analysis already completed');
      return;
    }

    // Set a sentinel value first to indicate we're working
    window.__SITE_INFO__ = { status: 'analyzing' };

    // Wrap all analysis in try-catch blocks to ensure we return something useful
    let typography;
    try {
      typography = getTypography();
    } catch (e) {
      console.error('Error in typography analysis:', e);
      typography = { error: e.message };
    }

    let colors;
    try {
      colors = getColors();
    } catch (e) {
      console.error('Error in color analysis:', e);
      colors = { error: e.message };
    }

    let technologies;
    try {
      technologies = detectTechnologies();
    } catch (e) {
      console.error('Error in technology detection:', e);
      technologies = { error: e.message };
    }

    // Final site info object
    const siteInfo = {
      typography,
      colors,
      technologies,
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString()
    };

    window.__SITE_INFO__ = siteInfo;
    console.log('Site Info Extension: Analysis complete', siteInfo);
  } catch (error) {
    console.error('Site Info Extension: Error during analysis', error);
    window.__SITE_INFO__ = {
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }

  function getTypography() {
    // Create a more comprehensive typography report
    const headings = {};
    const paragraphs = [];
    const fontFamiliesUsed = new Set();

    // Process all headings
    for (let i = 1; i <= 6; i++) {
      const elements = document.querySelectorAll(`h${i}`);
      if (elements.length > 0) {
        // Use the first one as representative
        const style = getComputedStyle(elements[0]);
        headings[`h${i}`] = {
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          fontWeight: style.fontWeight,
          letterSpacing: style.letterSpacing,
          count: elements.length // How many of this heading type exist
        };
        fontFamiliesUsed.add(style.fontFamily.split(',')[0].trim().replace(/["']/g, ''));
      }
    }

    // Get paragraph styles (sampling)
    const pElements = document.querySelectorAll('p');
    if (pElements.length > 0) {
      // Sample up to 5 different paragraphs
      const sampled = Array.from(pElements).slice(0, Math.min(5, pElements.length));
      sampled.forEach(el => {
        const style = getComputedStyle(el);
        paragraphs.push({
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          fontWeight: style.fontWeight,
          letterSpacing: style.letterSpacing
        });
        fontFamiliesUsed.add(style.fontFamily.split(',')[0].trim().replace(/["']/g, ''));
      });
    }

    // Get body text style
    const bodyStyle = getComputedStyle(document.body);
    const bodyInfo = {
      fontFamily: bodyStyle.fontFamily,
      fontSize: bodyStyle.fontSize,
      lineHeight: bodyStyle.lineHeight,
      fontWeight: bodyStyle.fontWeight,
      letterSpacing: bodyStyle.letterSpacing
    };
    fontFamiliesUsed.add(bodyStyle.fontFamily.split(',')[0].trim().replace(/["']/g, ''));

    // Calculate type scale ratio if we have h1 and body
    let typeScale = null;
    if (headings.h1) {
      const h1FontSize = parseFloat(headings.h1.fontSize);
      const bodyFontSize = parseFloat(bodyStyle.fontSize);
      if (!isNaN(h1FontSize) && !isNaN(bodyFontSize) && bodyFontSize > 0) {
        // Calculate ratio with 2 decimal precision
        typeScale = Math.round((h1FontSize / bodyFontSize) * 100) / 100;

        // Map common type scales to their standard names
        const commonScales = {
          1.067: 'Minor Second (1.067)',
          1.125: 'Major Second (1.125)',
          1.2: 'Minor Third (1.2)',
          1.25: 'Major Third (1.25)',
          1.333: 'Perfect Fourth (1.333)',
          1.414: 'Augmented Fourth (1.414)',
          1.5: 'Perfect Fifth (1.5)',
          1.618: 'Golden Ratio (1.618)'
        };

        // Find the closest common scale
        const scaleValues = Object.keys(commonScales).map(Number);
        const closestScale = scaleValues.reduce((prev, curr) =>
          Math.abs(curr - typeScale) < Math.abs(prev - typeScale) ? curr : prev
        );

        // If we're within 0.05 of a common scale, use that name
        if (Math.abs(closestScale - typeScale) <= 0.05) {
          typeScale = commonScales[closestScale];
        } else {
          typeScale = typeScale.toString();
        }
      }
    }

    return {
      body: bodyInfo,
      headings,
      paragraphs,
      fontFamilies: Array.from(fontFamiliesUsed),
      typeScale
    };
  }

  function getColors() {
    // Enhanced color extraction with role detection and improved deduplication
    const colorMap = new Map(); // color string -> frequency count
    const buttonColors = new Set(); // Colors used in buttons
    const linkColors = new Set(); // Colors used in links
    const backgroundColors = new Map(); // background colors -> surface area
    const textColors = new Map(); // text colors -> character count

    // Process all elements for color extraction
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);

    while (walker.nextNode()) {
      const el = walker.currentNode;
      const style = getComputedStyle(el);
      const bgColor = style.backgroundColor;
      const textColor = style.color;

      // Skip transparent backgrounds
      if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
        // Track background colors by estimated surface area
        const area = el.clientWidth * el.clientHeight;
        backgroundColors.set(bgColor, (backgroundColors.get(bgColor) || 0) + area);

        // Count overall colors
        colorMap.set(bgColor, (colorMap.get(bgColor) || 0) + 1);
      }

      if (textColor) {
        // Track text colors by character count (approximate)
        const textLength = el.textContent ? el.textContent.length : 0;
        textColors.set(textColor, (textColors.get(textColor) || 0) + textLength);

        // Count overall colors
        colorMap.set(textColor, (colorMap.get(textColor) || 0) + 1);
      }

      // Special elements: buttons, CTAs, links
      if (el.tagName === 'BUTTON' ||
        el.tagName === 'A' ||
        style.cursor === 'pointer' ||
        el.classList.contains('btn') ||
        el.classList.contains('button')) {

        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
          buttonColors.add(bgColor);
        }

        // Special case for links
        if (el.tagName === 'A' && textColor) {
          linkColors.add(textColor);
        }
      }
    }

    // Determine main colors based on frequency and role
    const sortedByArea = [...backgroundColors.entries()].sort((a, b) => b[1] - a[1]);
    const sortedByTextUsage = [...textColors.entries()].sort((a, b) => b[1] - a[1]);

    // Convert to HEX for display purposes and normalization
    function rgbaToHex(rgba) {
      if (!rgba || rgba === 'transparent' || rgba === 'rgba(0, 0, 0, 0)') return null;

      // Handle both rgb/rgba formats
      const rgbaMatch = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
      if (!rgbaMatch) return rgba; // Return original if format not recognized

      const r = parseInt(rgbaMatch[1], 10);
      const g = parseInt(rgbaMatch[2], 10);
      const b = parseInt(rgbaMatch[3], 10);

      // Convert to lowercase hex for consistent deduplication
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toLowerCase();
    }

    // Enhanced deduplication with hex normalization and handling similar colors
    const uniqueColors = new Map(); // hex -> {color, originalColor, count}

    // First convert all colors to normalized hex
    Array.from(colorMap.entries()).forEach(([color, count]) => {
      const hex = rgbaToHex(color);
      if (!hex) return;

      if (!uniqueColors.has(hex)) {
        uniqueColors.set(hex, {
          color: hex,
          originalColor: color,
          count
        });
      } else {
        // If this instance has a higher count, update
        const existing = uniqueColors.get(hex);
        if (count > existing.count) {
          existing.count = count;
          existing.originalColor = color;
        }
      }
    });

    // Create palette with roles
    const palette = {
      background: sortedByArea.length > 0 ? {
        color: rgbaToHex(sortedByArea[0][0]),
        originalColor: sortedByArea[0][0]
      } : null,
      text: sortedByTextUsage.length > 0 ? {
        color: rgbaToHex(sortedByTextUsage[0][0]),
        originalColor: sortedByTextUsage[0][0]
      } : null,
      accent: buttonColors.size > 0 ? {
        color: rgbaToHex(Array.from(buttonColors)[0]),
        originalColor: Array.from(buttonColors)[0]
      } : null,
      link: linkColors.size > 0 ? {
        color: rgbaToHex(Array.from(linkColors)[0]),
        originalColor: Array.from(linkColors)[0]
      } : null,
      // All colors by frequency, but with duplicates removed
      all: Array.from(uniqueColors.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 12) // Limit to top 12 colors for a good range
    };

    return palette;
  }

  function detectTechnologies() {
    const tech = {
      frameworks: [],
      libraries: [],
      analytics: [],
      hosting: null,
      tools: []
    };

    // Safe detection function wrapper
    function safeDetect(fn) {
      try {
        return fn() || false;
      } catch (e) {
        console.error('Error in technology detection:', e);
        return false;
      }
    }

    // Framework detection
    if (safeDetect(() => window.React || document.querySelector('[data-reactroot], [data-reactid]'))) {
      tech.frameworks.push('React');

      // Check for Next.js
      if (safeDetect(() => document.querySelector('#__next') || window.__NEXT_DATA__)) {
        tech.frameworks.push('Next.js');
      }
    }

    if (safeDetect(() => window.angular || document.querySelector('[ng-version], [ng-app]'))) {
      tech.frameworks.push('Angular');
    }

    if (safeDetect(() => window.Vue || document.querySelector('[data-v-]'))) {
      tech.frameworks.push('Vue.js');

      // Check for Nuxt
      if (safeDetect(() => window.__NUXT__ || document.querySelector('#__nuxt, #__layout'))) {
        tech.frameworks.push('Nuxt.js');
      }
    }

    if (safeDetect(() => window.Svelte || document.querySelector('[data-svelte]'))) {
      tech.frameworks.push('Svelte');
    }

    // Vite detection - search for common Vite fingerprints
    if (safeDetect(() => {
      // Check for Vite asset naming pattern in scripts or links
      const scripts = document.querySelectorAll('script[src]');
      const links = document.querySelectorAll('link[href]');

      // Look for Vite's asset patterns like ?v=abc123 or .vite/assets in any script or css
      const hasVitePattern = (el) => {
        const src = el.getAttribute('src') || el.getAttribute('href') || '';
        return src.includes('.vite/') ||
          src.includes('?v=') && src.includes('.js') ||
          src.includes('__vite_');
      };

      return Array.from(scripts).some(hasVitePattern) ||
        Array.from(links).some(hasVitePattern) ||
        window.__vite__;
    })) {
      tech.tools.push('Vite');
    }

    // Animation libraries with improved detection
    if (safeDetect(() => window.gsap || window.TweenMax || window.TweenLite || window.TimelineLite || window.TimelineMax)) {
      tech.libraries.push('GSAP');
    }

    if (safeDetect(() => window.anime)) {
      tech.libraries.push('Anime.js');
    }

    // Improved Three.js detection
    if (safeDetect(() => {
      return window.THREE ||
        document.querySelector('canvas') && (
          window.WebGLRenderer ||
          window.Scene ||
          window.PerspectiveCamera
        );
    })) {
      tech.libraries.push('Three.js');
    }

    if (safeDetect(() => window.framer || document.querySelector('[data-framer-component-type]'))) {
      tech.libraries.push('Framer Motion');
    }

    // UI Libraries
    if (safeDetect(() =>
      window.tailwind ||
      document.querySelector('[class*="tw-"]') ||
      document.head.innerHTML.includes('tailwind') ||
      // Check for typical Tailwind class combinations
      Array.from(document.querySelectorAll('*[class]')).some(el => {
        const classList = el.className;
        return typeof classList === 'string' && (
          (classList.includes('text-') && (
            classList.includes('bg-') ||
            classList.includes('p-') ||
            classList.includes('m-') ||
            classList.includes('rounded-')
          ))
        );
      })
    )) {
      tech.libraries.push('Tailwind CSS');
    }

    if (safeDetect(() => window.bootstrap || document.querySelector('.container-fluid, .row, .col, .modal'))) {
      tech.libraries.push('Bootstrap');
    }

    if (safeDetect(() => document.querySelector('[class*="mui-"], .MuiButton-root'))) {
      tech.libraries.push('Material UI');
    }

    // Analytics
    if (safeDetect(() => window.ga || window.gtag || window.dataLayer ||
      document.querySelector('script[src*="google-analytics"], script[src*="googletagmanager"]'))) {
      tech.analytics.push('Google Analytics');
    }

    if (safeDetect(() => window.fbq || document.querySelector('script[src*="facebook"]'))) {
      tech.analytics.push('Facebook Pixel');
    }

    // Check for common hosting platforms through meta tags or HTTP headers
    const hostingClues = {
      'Vercel': () => safeDetect(() => document.querySelector('meta[name="vercel-deployment-url"]') || window.next),
      'Netlify': () => safeDetect(() => document.querySelector('meta[name="netlify"]') || document.querySelector('meta[name="generator"][content*="Netlify"]')),
      'GitHub Pages': () => safeDetect(() => location.hostname.includes('github.io')),
      'WordPress': () => safeDetect(() => document.querySelector('meta[name="generator"][content*="WordPress"]') || window.wp),
      'Shopify': () => safeDetect(() => window.Shopify || document.querySelector('meta[name="shopify-checkout-api-token"]')),
      'Wix': () => safeDetect(() => document.querySelector('meta[name="generator"][content*="Wix"]') || window.wixBiSession),
      'Squarespace': () => safeDetect(() => document.querySelector('meta[name="generator"][content*="Squarespace"]'))
    };

    for (const [platform, detector] of Object.entries(hostingClues)) {
      if (detector()) {
        tech.hosting = platform;
        break;
      }
    }

    // Additional tools and libraries with improved detection
    const additionalTools = [
      { name: 'jQuery', detector: () => window.jQuery || window.$ },
      { name: 'Lodash', detector: () => window._ && (window._.VERSION || window._.map) },
      { name: 'Moment.js', detector: () => window.moment },
      { name: 'D3.js', detector: () => window.d3 },
      { name: 'Chart.js', detector: () => window.Chart },
      { name: 'Axios', detector: () => window.axios },
      {
        name: 'GraphQL', detector: () => {
          // Safer GraphQL detection without using non-standard selectors
          try {
            const scripts = document.querySelectorAll('script[type="application/json"]');
            return Array.from(scripts).some(script => {
              try {
                const content = script.textContent;
                return content && (
                  content.includes('{"query"') ||
                  content.includes('"__typename"') ||
                  content.includes('"kind":"Document"')
                );
              } catch (e) {
                return false;
              }
            });
          } catch (e) {
            return false;
          }
        }
      }
    ];

    additionalTools.forEach(tool => {
      if (safeDetect(tool.detector)) {
        tech.tools.push(tool.name);
      }
    });

    return tech;
  }

})();
