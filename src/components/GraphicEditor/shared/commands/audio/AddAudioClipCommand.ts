/**
 * AddAudioClipCommand - Add audio clip to a layer
 */

import { nanoid } from 'nanoid';
import type { ContentState, AudioClip, AudioLayer } from '../../model/types';
import type { EditorCommand, CommandMetadata } from '../types';
import type { Operation } from '../../types/api.types';

export class AddAudioClipCommand implements EditorCommand {
  public readonly id: string;
  public readonly type = 'add_audio_clip';
  public readonly timestamp: number;

  constructor(
    private readonly layerId: string,
    private readonly clip: AudioClip,
  ) {
    this.id = nanoid();
    this.timestamp = Date.now();
  }

  /**
   * Execute: Add audio clip to layer
   */
  execute(state: ContentState): ContentState {
    let layerFound = false;
    const newAudioLayers = state.audioLayers.map((layer) => {
      if (layer.id === this.layerId) {
        layerFound = true;
        return {
          ...layer,
          clips: [...layer.clips, this.clip],
        };
      }
      return layer;
    });

    // Create layer if it doesn't exist
    if (!layerFound) {
      const newLayer: AudioLayer = {
        id: this.layerId,
        clips: [this.clip],
      };
      newAudioLayers.push(newLayer);
    }

    return {
      ...state,
      audioLayers: newAudioLayers,
    };
  }

  /**
   * Undo: Remove the audio clip
   */
  undo(state: ContentState): ContentState {
    const newAudioLayers = state.audioLayers.map((layer) => {
      if (layer.id === this.layerId) {
        return {
          ...layer,
          clips: layer.clips.filter((c) => c.id !== this.clip.id),
        };
      }
      return layer;
    });

    return {
      ...state,
      audioLayers: newAudioLayers,
    };
  }

  /**
   * Generate backend operation
   */
  toOperations(): Operation[] {
    return [
      {
        id: nanoid(),
        type: 'add_audio_clip',
        target: {
          audioLayerId: this.layerId,
          clipId: this.clip.id,
        },
        payload: this.clip,
        timestamp: this.timestamp,
      },
    ];
  }

  /**
   * Get metadata
   */
  getMetadata(): CommandMetadata {
    return {
      type: this.type,
      timestamp: this.timestamp,
      affectedIds: [this.layerId, this.clip.id],
      description: `Add audio clip "${this.clip.label}" to layer ${this.layerId}`,
    };
  }
}
