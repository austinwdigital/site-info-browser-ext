import './popup.css';

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize UI in loading state
  const root = document.getElementById('root');
  root.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <div>Analyzing page...</div>
    </div>
  `;

  try {
    // Direct approach: Get current tab and execute scripts
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tabs[0]?.id;

    if (!tabId) {
      showError('No active tab found');
      return;
    }

    // First attempt to get any existing data
    const existingResults = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.__SITE_INFO__ || null
    });

    if (existingResults && existingResults[0]?.result) {
      // We have data, use it
      renderSiteInfo(existingResults[0].result);
      initEventListeners(existingResults[0].result);
      return;
    }

    // No existing data, inject the content script
    try {
      // Execute content script
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });

      // Wait a moment for script to complete
      setTimeout(async () => {
        try {
          // Get the results
          const results = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => window.__SITE_INFO__ || null
          });

          const data = results[0]?.result;
          if (!data) {
            showError('Failed to extract site information. Try refreshing the page.');
            return;
          }

          if (data.error) {
            showError(`Analysis error: ${data.error}`);
            return;
          }

          renderSiteInfo(data);
          initEventListeners(data);
        } catch (innerError) {
          showError(`Script execution error: ${innerError.message}`);
        }
      }, 1000); // Increased timeout to ensure script has enough time to run
    } catch (scriptError) {
      showError(`Failed to inject content script: ${scriptError.message}`);
    }
  } catch (error) {
    showError(`Error: ${error.message}`);
  }
});

function showError(message) {
  const root = document.getElementById('root');
  root.innerHTML = `
    <div class="card">
      <div style="color: #dc3545; text-align: center; padding: 2rem 1rem;">
        ${message}
      </div>
    </div>
  `;
}

function initEventListeners(data) {
  if (!data || typeof data !== 'object') {
    console.error('Invalid data provided to initEventListeners');
    return;
  }

  // Tab switching
  const tabs = document.querySelectorAll('.tab');
  const sections = document.querySelectorAll('.tab-section');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Show selected section, hide others
      const targetId = tab.getAttribute('data-target');
      sections.forEach(section => {
        section.classList.toggle('section-hidden',
          section.id !== targetId);
      });
    });
  });

  // Copy to clipboard buttons
  const copyButtons = document.querySelectorAll('.copy-button');
  copyButtons.forEach(button => {
    button.addEventListener('click', () => {
      const type = button.getAttribute('data-type');
      let content;

      try {
        switch (type) {
          case 'typography':
            content = JSON.stringify(data.typography || {}, null, 2);
            break;
          case 'colors':
            content = JSON.stringify(data.colors || {}, null, 2);
            break;
          case 'technologies':
            content = JSON.stringify(data.technologies || {}, null, 2);
            break;
          case 'all':
            content = JSON.stringify(data, null, 2);
            break;
        }

        if (content) {
          navigator.clipboard.writeText(content)
            .then(() => {
              button.textContent = 'Copied!';
              setTimeout(() => {
                button.textContent = 'Copy';
              }, 2000);
            })
            .catch(err => {
              console.error('Failed to copy: ', err);
              button.textContent = 'Error';
              setTimeout(() => {
                button.textContent = 'Copy';
              }, 2000);
            });
        }
      } catch (error) {
        console.error('Error preparing content for clipboard:', error);
        button.textContent = 'Error';
        setTimeout(() => {
          button.textContent = 'Copy';
        }, 2000);
      }
    });
  });

  // Color swatch click to copy
  const swatches = document.querySelectorAll('.color-swatch');
  swatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      try {
        const color = swatch.getAttribute('data-color');
        if (!color) return;

        navigator.clipboard.writeText(color)
          .then(() => {
            // Show feedback
            const tooltip = document.createElement('div');
            tooltip.textContent = 'Copied!';
            tooltip.style.position = 'absolute';
            tooltip.style.top = '-20px';
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translateX(-50%)';
            tooltip.style.background = 'rgba(0,0,0,0.7)';
            tooltip.style.color = 'white';
            tooltip.style.padding = '2px 6px';
            tooltip.style.borderRadius = '4px';
            tooltip.style.fontSize = '11px';
            tooltip.style.pointerEvents = 'none';

            swatch.style.position = 'relative';
            swatch.appendChild(tooltip);

            setTimeout(() => {
              tooltip.remove();
            }, 1000);
          })
          .catch(err => {
            console.error('Failed to copy color: ', err);
          });
      } catch (error) {
        console.error('Error copying color:', error);
      }
    });
  });

  // Export JSON button
  const exportButton = document.getElementById('export-json');
  if (exportButton) {
    exportButton.addEventListener('click', () => {
      try {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `site-info-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error exporting JSON:', error);
        alert('Failed to export data. See console for details.');
      }
    });
  }
}

function renderSiteInfo(data) {
  const root = document.getElementById('root');

  // Handle missing data safely
  const typography = data.typography || {};
  const colors = data.colors || {};
  const technologies = data.technologies || {};

  // Basic site information
  const url = new URL(data.url || window.location.href);
  const hostDisplay = url.hostname;
  const title = data.title || 'No title';

  // Create UI structure with tabs
  root.innerHTML = `
    <header>
      <h1>Site Info</h1>
      <div class="button-group">
        <button id="export-json" class="button button-secondary" title="Export as JSON">
          Export
        </button>
      </div>
    </header>
    
    <div class="site-info">
      ${title} — ${hostDisplay}
    </div>
    
    <div class="tabs">
      <button class="tab active" data-target="typography-section">Typography</button>
      <button class="tab" data-target="colors-section">Colors</button>
      <button class="tab" data-target="tech-section">Technologies</button>
    </div>
    
    <div id="typography-section" class="tab-section">
      ${renderTypography(typography)}
    </div>
    
    <div id="colors-section" class="tab-section section-hidden">
      ${renderColors(colors)}
    </div>
    
    <div id="tech-section" class="tab-section section-hidden">
      ${renderTechnologies(technologies)}
    </div>
    
    <div class="developer-credit">
      Developed by austinwdigital
    </div>
  `;
}

function renderTypography(typography = {}) {
  if (!typography || typeof typography !== 'object') {
    return `<div class="card"><div style="color: var(--secondary); padding: 2rem 0; text-align: center;">Typography data not available</div></div>`;
  }

  // Create font family display
  const fontFamiliesHtml = typography.fontFamilies && typography.fontFamilies.length
    ? `
      <div class="card">
        <h2>Font Families</h2>
        <div>
          ${typography.fontFamilies.map(font =>
      `<div class="font-family" style="font-family: ${font}">${font}</div>`
    ).join('')}
        </div>
      </div>
    `
    : '';

  // Create type scale visualization with improved font sizing
  const headingsHtml = typography.headings && Object.keys(typography.headings).length > 0
    ? `
      <div class="card">
        <h2>Headings</h2>
        <div class="type-scale">
          ${Object.entries(typography.headings).map(([tag, style]) => {
      // Extract numeric font size for proper display
      const fontSizeValue = parseFloat(style.fontSize || '0');
      const fontSizeUnit = (style.fontSize || '').replace(/[\d.]/g, '') || 'px';

      // Keep font size within reasonable limits in the preview
      let displayFontSize;
      if (fontSizeValue > 28) {
        displayFontSize = '28px'; // Cap large headings
      } else if (fontSizeValue < 12) {
        displayFontSize = '12px'; // Set minimum size for readability
      } else {
        displayFontSize = `${fontSizeValue}${fontSizeUnit}`;
      }

      return `
              <div class="heading-example">
                <div class="heading-tag">${tag}</div>
                <div class="heading-preview" style="
                  font-family: ${style.fontFamily || 'inherit'}; 
                  font-size: ${displayFontSize}; 
                  font-weight: ${style.fontWeight || 'inherit'};
                  line-height: ${style.lineHeight || 'inherit'};
                ">Sample Text</div>
                <div class="heading-info">
                  ${style.fontSize || 'N/A'}<br>
                  <span style="font-size: 0.7rem;">w: ${style.fontWeight || 'N/A'}</span>
                </div>
              </div>
            `;
    }).join('')}
        </div>
      </div>
    `
    : '';

  // Body text styles with more details
  const bodyHtml = typography.body ? `
    <div class="card">
      <h2>Body Text</h2>
      <div style="
        font-family: ${typography.body.fontFamily || 'inherit'};
        font-size: ${typography.body.fontSize || 'inherit'};
        line-height: ${typography.body.lineHeight || 'inherit'};
        font-weight: ${typography.body.fontWeight || 'normal'};
      ">
        <p>This is an example of the body text on this site. The font-family is <code>${typography.body.fontFamily ? typography.body.fontFamily.split(',')[0] : 'default'}</code>.</p>
        <p style="margin-top: 8px;"><strong>Font size:</strong> ${typography.body.fontSize || 'N/A'}</p>
        <p><strong>Line height:</strong> ${typography.body.lineHeight || 'N/A'}</p>
        <p><strong>Font weight:</strong> ${typography.body.fontWeight || 'N/A'}</p>
        ${typography.typeScale ? `<p><strong>Type scale:</strong> ${typography.typeScale}</p>` : ''}
      </div>
    </div>
  ` : '';

  // Empty state if no typography data is available
  const emptyState = !fontFamiliesHtml && !headingsHtml && !bodyHtml
    ? `<div class="card"><div style="color: var(--secondary); padding: 2rem 0; text-align: center;">No typography data detected</div></div>`
    : '';

  // Copy button
  const copyButton = `
    <div style="text-align: right; margin-top: 1rem;">
      <button class="button button-secondary copy-button" data-type="typography">
        Copy Typography Data
      </button>
    </div>
  `;

  return emptyState || (fontFamiliesHtml + headingsHtml + bodyHtml + copyButton);
}

function renderColors(colors = {}) {
  if (!colors || typeof colors !== 'object') {
    return `<div class="card"><div style="color: var(--secondary); padding: 2rem 0; text-align: center;">Color data not available</div></div>`;
  }

  // Determine if we have role-based colors to display
  const hasRoles = colors.background || colors.text || colors.accent || colors.link;

  // Create role-based color section
  const rolesHtml = hasRoles
    ? `
      <div class="card">
        <h2>Color Roles</h2>
        <div class="role-colors">
          ${colors.background ? `
            <div class="role-color">
              <div class="role-swatch" style="background-color: ${colors.background.color}"></div>
              <div>
                <div class="role-name">Background</div>
                <div class="role-value">${colors.background.color}</div>
              </div>
            </div>
          ` : ''}
          
          ${colors.text ? `
            <div class="role-color">
              <div class="role-swatch" style="background-color: ${colors.text.color}"></div>
              <div>
                <div class="role-name">Text</div>
                <div class="role-value">${colors.text.color}</div>
              </div>
            </div>
          ` : ''}
          
          ${colors.accent ? `
            <div class="role-color">
              <div class="role-swatch" style="background-color: ${colors.accent.color}"></div>
              <div>
                <div class="role-name">Accent/CTA</div>
                <div class="role-value">${colors.accent.color}</div>
              </div>
            </div>
          ` : ''}
          
          ${colors.link ? `
            <div class="role-color">
              <div class="role-swatch" style="background-color: ${colors.link.color}"></div>
              <div>
                <div class="role-name">Link</div>
                <div class="role-value">${colors.link.color}</div>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `
    : '';

  // Create color palette grid
  const paletteHtml = colors.all && colors.all.length > 0
    ? `
      <div class="card">
        <h2>Color Palette</h2>
        <div class="color-grid">
          ${colors.all.map(item => `
            <div class="color-item">
              <div class="color-swatch" 
                style="background-color: ${item.color}" 
                data-color="${item.color}"
                title="Click to copy">
              </div>
              <div class="color-label">${item.color}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `
    : '';

  // Empty state if no color data is available
  const emptyState = !rolesHtml && !paletteHtml
    ? `<div class="card"><div style="color: var(--secondary); padding: 2rem 0; text-align: center;">No color data detected</div></div>`
    : '';

  // Copy button
  const copyButton = `
    <div style="text-align: right; margin-top: 1rem;">
      <button class="button button-secondary copy-button" data-type="colors">
        Copy Color Data
      </button>
    </div>
  `;

  return emptyState || (rolesHtml + paletteHtml + copyButton);
}

function renderTechnologies(tech = {}) {
  if (!tech || typeof tech !== 'object') {
    return `<div class="card"><div style="color: var(--secondary); padding: 2rem 0; text-align: center;">Technology data not available</div></div>`;
  }

  // Create frameworks section
  const frameworksHtml = tech.frameworks && tech.frameworks.length > 0
    ? `
      <div class="tech-section">
        <div class="tech-section-title">Frameworks</div>
        <div class="tech-list">
          ${tech.frameworks.map(framework => `
            <div class="tech-tag">${framework}</div>
          `).join('')}
        </div>
      </div>
    `
    : '';

  // Create libraries section
  const librariesHtml = tech.libraries && tech.libraries.length > 0
    ? `
      <div class="tech-section">
        <div class="tech-section-title">Libraries</div>
        <div class="tech-list">
          ${tech.libraries.map(library => `
            <div class="tech-tag">${library}</div>
          `).join('')}
        </div>
      </div>
    `
    : '';

  // Create hosting section
  const hostingHtml = tech.hosting
    ? `
      <div class="tech-section">
        <div class="tech-section-title">Hosting</div>
        <div class="tech-list">
          <div class="tech-tag">${tech.hosting}</div>
        </div>
      </div>
    `
    : '';

  // Create analytics section
  const analyticsHtml = tech.analytics && tech.analytics.length > 0
    ? `
      <div class="tech-section">
        <div class="tech-section-title">Analytics</div>
        <div class="tech-list">
          ${tech.analytics.map(tool => `
            <div class="tech-tag">${tool}</div>
          `).join('')}
        </div>
      </div>
    `
    : '';

  // Create tools section
  const toolsHtml = tech.tools && tech.tools.length > 0
    ? `
      <div class="tech-section">
        <div class="tech-section-title">Tools</div>
        <div class="tech-list">
          ${tech.tools.map(tool => `
            <div class="tech-tag">${tool}</div>
          `).join('')}
        </div>
      </div>
    `
    : '';

  // If there are no technologies detected
  const emptyHtml = !frameworksHtml && !librariesHtml && !hostingHtml && !analyticsHtml && !toolsHtml
    ? `<div style="color: var(--secondary); padding: 2rem 0; text-align: center;">No technologies detected.</div>`
    : '';

  // Copy button
  const copyButton = `
    <div style="text-align: right; margin-top: 1rem;">
      <button class="button button-secondary copy-button" data-type="technologies">
        Copy Technology Data
      </button>
    </div>
  `;

  return `
    <div class="card">
      ${frameworksHtml}
      ${librariesHtml}
      ${hostingHtml}
      ${analyticsHtml}
      ${toolsHtml}
      ${emptyHtml}
    </div>
    ${copyButton}
  `;
}
