import { DesignData, Page, AudioLayer } from '../types/api.types';

// AppState interface from App.tsx (we'll import the minimal needed parts)
interface AppState {
  pages: Page[];
  audioLayers: AudioLayer[];
  // Other UI state properties are not needed for backend sync
  [key: string]: unknown;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;

export const mappers = {
  /**
   * Convert AppState to DesignData for API
   * Extracts only the design content (pages, audioLayers) and canvas settings
   */
  toDesignData: (state: AppState): DesignData => {
    return {
      canvas: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
      },
      pages: state.pages,
      audioLayers: state.audioLayers,
    };
  },

  /**
   * Convert DesignData from API to partial AppState
   * Merges design data with current UI state
   */
  fromDesignData: (
    designData: DesignData,
    currentState: AppState
  ): Partial<AppState> => {
    return {
      pages: designData.pages,
      audioLayers: designData.audioLayers,
      // Reset to first page when loading
      activePageId: designData.pages[0]?.id || currentState.activePageId,
      // Clear selections when loading new template
      selectedElementId: null,
      selectedAudioId: null,
      // Reset timeline to start
      currentTime: 0,
    };
  },
};
