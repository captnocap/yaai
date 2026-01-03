// =============================================================================
// RESEARCH LIB
// =============================================================================
// Research feature utilities barrel export.

// Mock service
export { mockResearchService, MockResearchService } from './mock-research-service';

// Galaxy layout
export {
  calculateGalaxyLayout,
  IncrementalGalaxyLayout,
  getNodeColor,
  getNodeEmissiveIntensity,
  getNodeScale,
} from './galaxy-layout';

// Cinematic engine
export {
  generateCinematicScript,
  CinematicPlayback,
} from './cinematic-engine';

// Export utilities
export {
  exportToMarkdown,
  exportToHTML,
  exportToPDF,
  exportReport,
  downloadExport,
  printExport,
} from './export-utils';
