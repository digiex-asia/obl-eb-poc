/**
 * Plugin exports - Register all plugins here
 */

import { pluginRegistry } from '../core/pluginSystem';
import { HistoryPlugin } from './HistoryPlugin';
import { FormattingPlugin } from './FormattingPlugin';
import { ColorPlugin } from './ColorPlugin';
import { AlignmentPlugin } from './AlignmentPlugin';
import { ListPlugin } from './ListPlugin';
import { TextTransformPlugin } from './TextTransformPlugin';
import { SpacingPlugin } from './SpacingPlugin';
import { VerticalAlignPlugin } from './VerticalAlignPlugin';
import { AutoFitPlugin } from './AutoFitPlugin';
import { FontPlugin } from './FontPlugin';
import { ShadowPlugin } from './ShadowPlugin';

// Register all plugins
export const registerAllPlugins = () => {
  pluginRegistry.register(HistoryPlugin);
  pluginRegistry.register(FormattingPlugin);
  pluginRegistry.register(ColorPlugin);
  pluginRegistry.register(AlignmentPlugin);
  pluginRegistry.register(ListPlugin);
  pluginRegistry.register(TextTransformPlugin);
  pluginRegistry.register(SpacingPlugin);
  pluginRegistry.register(VerticalAlignPlugin);
  pluginRegistry.register(AutoFitPlugin);
  pluginRegistry.register(FontPlugin);
  pluginRegistry.register(ShadowPlugin);
};

// Export individual plugins for selective registration
export {
  HistoryPlugin,
  FormattingPlugin,
  ColorPlugin,
  AlignmentPlugin,
  ListPlugin,
  TextTransformPlugin,
  SpacingPlugin,
  VerticalAlignPlugin,
  AutoFitPlugin,
  FontPlugin,
  ShadowPlugin
};

