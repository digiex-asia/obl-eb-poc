/**
 * Plugin System for Text Editor
 */

import { TextEditorPlugin, PluginContext } from '../types';

class PluginRegistry {
  private plugins: Map<string, TextEditorPlugin> = new Map();

  register(plugin: TextEditorPlugin): void {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin ${plugin.name} is already registered. Overwriting...`);
    }
    this.plugins.set(plugin.name, plugin);
  }

  unregister(pluginName: string): void {
    this.plugins.delete(pluginName);
  }

  getPlugin(name: string): TextEditorPlugin | undefined {
    return this.plugins.get(name);
  }

  getAllPlugins(): TextEditorPlugin[] {
    return Array.from(this.plugins.values());
  }

  initializeAll(context: PluginContext): void {
    this.plugins.forEach(plugin => {
      if (plugin.initialize) {
        plugin.initialize(context);
      }
    });
  }

  cleanupAll(): void {
    this.plugins.forEach(plugin => {
      if (plugin.cleanup) {
        plugin.cleanup();
      }
    });
  }

  handleKeyDown(e: KeyboardEvent, context: PluginContext): boolean {
    for (const plugin of this.plugins.values()) {
      if (plugin.handleKeyDown && plugin.handleKeyDown(e, context)) {
        return true;
      }
    }
    return false;
  }
}

// Singleton instance
export const pluginRegistry = new PluginRegistry();

