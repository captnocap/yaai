// =============================================================================
// EXPORT UTILITIES
// =============================================================================
// Export research reports to various formats (Markdown, PDF, HTML).

import type {
  Report,
  Source,
  ResearchSession,
  ExportFormat,
} from '../../../shared/research-types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface ExportOptions {
  includeCitations: boolean;
  includeFindings: boolean;
  includeSourceDetails: boolean;
  includeMetadata: boolean;
}

interface ExportResult {
  content: string;
  filename: string;
  mimeType: string;
}

// -----------------------------------------------------------------------------
// MARKDOWN EXPORT
// -----------------------------------------------------------------------------

export function exportToMarkdown(
  report: Report,
  sources: Source[],
  session: ResearchSession,
  options: ExportOptions
): ExportResult {
  const lines: string[] = [];

  // Title
  lines.push(`# ${report.title}`);
  lines.push('');

  // Metadata
  if (options.includeMetadata) {
    lines.push('---');
    lines.push(`**Query:** ${session.query}`);
    lines.push(`**Depth:** ${session.depthProfile}`);
    lines.push(`**Date:** ${new Date(report.generatedAt).toLocaleDateString()}`);
    lines.push(`**Sources:** ${sources.filter((s) => s.state === 'complete').length}`);
    lines.push(`**Duration:** ${formatDuration(session.stats.elapsedTime)}`);
    lines.push('---');
    lines.push('');
  }

  // Summary
  if (report.summary) {
    lines.push('## Summary');
    lines.push('');
    lines.push(report.summary);
    lines.push('');
  }

  // Sections
  report.sections.forEach((section) => {
    lines.push(`## ${section.title}`);
    lines.push('');

    // Content (with or without citations)
    let content = section.content;
    if (!options.includeCitations) {
      content = content.replace(/\[\d+\]/g, '');
    }
    lines.push(content);
    lines.push('');
  });

  // Sources
  if (options.includeSourceDetails) {
    lines.push('## Sources');
    lines.push('');

    const completeSources = sources.filter((s) => s.state === 'complete');
    completeSources.forEach((source, index) => {
      lines.push(`${index + 1}. **[${source.title}](${source.url})**`);
      lines.push(`   - Domain: ${source.domain}`);
      lines.push(`   - Relevance: ${Math.round(source.relevanceScore * 100)}%`);

      if (options.includeFindings && source.findings.length > 0) {
        lines.push('   - Key findings:');
        source.findings.forEach((finding) => {
          lines.push(`     - ${finding.claim}`);
        });
      }
      lines.push('');
    });
  }

  // Footer
  lines.push('---');
  lines.push(`*Generated with Deep Research on ${new Date().toLocaleDateString()}*`);

  const content = lines.join('\n');
  const filename = `${sanitizeFilename(report.title)}.md`;

  return {
    content,
    filename,
    mimeType: 'text/markdown',
  };
}

// -----------------------------------------------------------------------------
// HTML EXPORT
// -----------------------------------------------------------------------------

export function exportToHTML(
  report: Report,
  sources: Source[],
  session: ResearchSession,
  options: ExportOptions
): ExportResult {
  const completeSources = sources.filter((s) => s.state === 'complete');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(report.title)}</title>
  <style>
    :root {
      --color-bg: #0a0a0f;
      --color-bg-secondary: #111118;
      --color-text: #e4e4e7;
      --color-text-secondary: #a1a1aa;
      --color-accent: #6366f1;
      --color-border: #27272a;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--color-bg);
      color: var(--color-text);
      line-height: 1.6;
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { font-size: 2rem; margin-bottom: 1rem; }
    h2 { font-size: 1.5rem; margin: 2rem 0 1rem; color: var(--color-accent); }
    p { margin-bottom: 1rem; color: var(--color-text-secondary); }
    .meta {
      padding: 1rem;
      background: var(--color-bg-secondary);
      border-radius: 0.5rem;
      margin-bottom: 2rem;
      font-size: 0.875rem;
    }
    .meta span { display: block; margin: 0.25rem 0; }
    .section {
      padding: 1.5rem;
      background: var(--color-bg-secondary);
      border-radius: 0.5rem;
      margin-bottom: 1rem;
    }
    .citation {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.25rem;
      height: 1.25rem;
      padding: 0 0.25rem;
      margin: 0 0.125rem;
      border-radius: 0.25rem;
      font-size: 0.625rem;
      font-weight: 600;
      background: rgba(99, 102, 241, 0.2);
      color: var(--color-accent);
      cursor: pointer;
      text-decoration: none;
    }
    .citation:hover {
      background: rgba(99, 102, 241, 0.3);
    }
    .sources-list {
      list-style: none;
      padding: 0;
    }
    .source-item {
      padding: 1rem;
      background: var(--color-bg-secondary);
      border-radius: 0.5rem;
      margin-bottom: 0.5rem;
    }
    .source-title {
      color: var(--color-text);
      text-decoration: none;
    }
    .source-title:hover {
      color: var(--color-accent);
    }
    .source-meta {
      font-size: 0.75rem;
      color: var(--color-text-secondary);
      margin-top: 0.25rem;
    }
    .findings {
      margin-top: 0.5rem;
      padding-left: 1rem;
      border-left: 2px solid var(--color-accent);
    }
    .finding {
      font-size: 0.875rem;
      margin: 0.25rem 0;
    }
    footer {
      margin-top: 3rem;
      padding-top: 1rem;
      border-top: 1px solid var(--color-border);
      font-size: 0.75rem;
      color: var(--color-text-secondary);
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(report.title)}</h1>

  ${options.includeMetadata ? `
  <div class="meta">
    <span><strong>Query:</strong> ${escapeHtml(session.query)}</span>
    <span><strong>Depth:</strong> ${session.depthProfile}</span>
    <span><strong>Date:</strong> ${new Date(report.generatedAt).toLocaleDateString()}</span>
    <span><strong>Sources:</strong> ${completeSources.length}</span>
    <span><strong>Duration:</strong> ${formatDuration(session.stats.elapsedTime)}</span>
  </div>
  ` : ''}

  ${report.summary ? `
  <h2>Summary</h2>
  <p>${escapeHtml(report.summary)}</p>
  ` : ''}

  ${report.sections.map((section) => `
  <div class="section">
    <h2>${escapeHtml(section.title)}</h2>
    <p>${options.includeCitations
      ? formatCitationsHTML(section.content, completeSources)
      : escapeHtml(section.content.replace(/\[\d+\]/g, ''))
    }</p>
  </div>
  `).join('')}

  ${options.includeSourceDetails ? `
  <h2>Sources</h2>
  <ol class="sources-list">
    ${completeSources.map((source, index) => `
    <li class="source-item" id="source-${index + 1}">
      <a href="${escapeHtml(source.url)}" target="_blank" class="source-title">
        ${index + 1}. ${escapeHtml(source.title)}
      </a>
      <div class="source-meta">
        ${source.domain} · ${Math.round(source.relevanceScore * 100)}% relevance
      </div>
      ${options.includeFindings && source.findings.length > 0 ? `
      <div class="findings">
        ${source.findings.map((f) => `<div class="finding">• ${escapeHtml(f.claim)}</div>`).join('')}
      </div>
      ` : ''}
    </li>
    `).join('')}
  </ol>
  ` : ''}

  <footer>
    Generated with Deep Research on ${new Date().toLocaleDateString()}
  </footer>
</body>
</html>`;

  const filename = `${sanitizeFilename(report.title)}.html`;

  return {
    content: html,
    filename,
    mimeType: 'text/html',
  };
}

// -----------------------------------------------------------------------------
// PDF EXPORT (via print)
// -----------------------------------------------------------------------------

export function exportToPDF(
  report: Report,
  sources: Source[],
  session: ResearchSession,
  options: ExportOptions
): ExportResult {
  // For PDF, we generate HTML and use print functionality
  const htmlResult = exportToHTML(report, sources, session, options);

  // Add print-specific styles
  const printHtml = htmlResult.content.replace(
    '</style>',
    `
    @media print {
      body { padding: 1rem; max-width: none; }
      .section { break-inside: avoid; }
      a { color: inherit; }
    }
    </style>`
  );

  return {
    content: printHtml,
    filename: `${sanitizeFilename(report.title)}.pdf`,
    mimeType: 'text/html', // Will be converted via print
  };
}

// -----------------------------------------------------------------------------
// DOWNLOAD HELPER
// -----------------------------------------------------------------------------

export function downloadExport(result: ExportResult) {
  const blob = new Blob([result.content], { type: result.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printExport(result: ExportResult) {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(result.content);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

// -----------------------------------------------------------------------------
// MAIN EXPORT FUNCTION
// -----------------------------------------------------------------------------

export async function exportReport(
  format: ExportFormat,
  report: Report,
  sources: Source[],
  session: ResearchSession,
  options: Partial<ExportOptions> = {}
): Promise<void> {
  const fullOptions: ExportOptions = {
    includeCitations: true,
    includeFindings: true,
    includeSourceDetails: false,
    includeMetadata: true,
    ...options,
  };

  let result: ExportResult;

  switch (format) {
    case 'markdown':
      result = exportToMarkdown(report, sources, session, fullOptions);
      downloadExport(result);
      break;

    case 'html':
      result = exportToHTML(report, sources, session, fullOptions);
      downloadExport(result);
      break;

    case 'pdf':
      result = exportToPDF(report, sources, session, fullOptions);
      printExport(result);
      break;

    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-z0-9\s-]/gi, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 50);
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function formatCitationsHTML(text: string, sources: Source[]): string {
  return text.replace(/\[(\d+)\]/g, (match, num) => {
    const index = parseInt(num, 10) - 1;
    if (index >= 0 && index < sources.length) {
      return `<a href="#source-${num}" class="citation">${num}</a>`;
    }
    return match;
  });
}

export default {
  exportToMarkdown,
  exportToHTML,
  exportToPDF,
  exportReport,
  downloadExport,
  printExport,
};
