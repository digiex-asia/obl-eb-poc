// import { getKerningValue } from "./helper";

import { fontManager } from "@components/canvasEditor/store/canvas/fontManager";

// Text fitting optimization utilities
class TextFitCache {
  constructor() {
    this.canvas = null;
    this.context = null;
    this.resultCache = new Map();
    this.maxCacheSize = 300;
    this.measureCache = new Map();
    this.enableCache = false;
  }

  getCanvas() {
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.context = this.canvas.getContext("2d");
      // Pre-configure canvas for better performance
      this.context.textBaseline = "alphabetic";
    }
    return this.context;
  }

  // Create a cache key for memoization
  createCacheKey(
    text,
    fontFamily,
    lineHeight,
    letterSpacing,
    containerWidth,
    containerHeight
  ) {
    return `${text}_${fontFamily}_${lineHeight}_${letterSpacing}_${containerWidth}_${containerHeight}`;
  }

  // Optimized text measurement with caching
  measureTextWithCache(text, fontSize, fontFamily, letterSpacing) {
    const measureKey = `${text}_${fontSize}_${fontFamily}_${letterSpacing}`;

    if (this.measureCache.has(measureKey)) {
      return this.measureCache.get(measureKey);
    }

    const context = this.getCanvas();
    context.font = `${fontSize}px ${fontFamily}`;

    let totalWidth = 0;
    const adjustedLetterSpacing = (letterSpacing * fontSize) / 100;

    totalWidth = fontManager.getTextWidth({
      text,
      fontFamily,
      fontSize,
      letterSpacing: adjustedLetterSpacing,
    });

    if (!totalWidth) {
      const textWidth = context.measureText(text).width;
      totalWidth = textWidth + (adjustedLetterSpacing * text.length - 1);
    }

    const result = { width: totalWidth };

    // Limit cache size
    if (this.measureCache.size >= this.maxCacheSize) {
      const firstKey = this.measureCache.keys().next().value;
      this.measureCache.delete(firstKey);
    }

    this.measureCache.set(measureKey, result);
    return result;
  }

  // Enhanced binary search with early termination
  findOptimalFontSize({
    text,
    fontFamily,
    lineHeight,
    letterSpacing,
    containerWidth,
    containerHeight,
    minFontSize = 1,
    maxFontSize = 1000,
    tolerance = 0.45,
  }) {
    let low = minFontSize;
    let high = Math.min(maxFontSize, containerHeight); // Don't exceed container height
    let bestFitSize = minFontSize;
    let iterations = 0;
    const maxIterations = 50; // Prevent infinite loops

    // Quick early returns
    if (!text || text.trim() === "") return { fontSize: minFontSize };

    // Try to estimate starting point better
    const estimatedSize = Math.floor(
      Math.min(containerHeight * 0.8, (containerWidth / text.length) * 2)
    );
    if (estimatedSize > minFontSize && estimatedSize < maxFontSize) {
      const testResult = this.testFontSize(
        text,
        estimatedSize,
        fontFamily,
        lineHeight,
        letterSpacing,
        containerWidth,
        containerHeight
      );
      if (testResult.fits) {
        low = estimatedSize;
      } else {
        high = estimatedSize;
      }
    }

    while (low <= high && iterations < maxIterations) {
      const mid = Math.floor((low + high) / 2);
      const result = this.testFontSize(
        text,
        mid,
        fontFamily,
        lineHeight,
        letterSpacing,
        containerWidth,
        containerHeight
      );

      if (result.fits) {
        bestFitSize = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }

      iterations++;

      // Early termination if close enough, but ensure we test the final converged value
      if (high - low <= tolerance && low !== high) {
        break;
      }
    }

    // Ensure we test the final converged value if we haven't tested it yet
    if (low === high && low > bestFitSize && iterations < maxIterations) {
      const finalResult = this.testFontSize(
        text,
        low,
        fontFamily,
        lineHeight,
        letterSpacing,
        containerWidth,
        containerHeight
      );

      if (finalResult.fits) {
        bestFitSize = low;
      }
    }
    return { fontSize: bestFitSize };
  }

  testFontSize(
    text,
    fontSize,
    fontFamily,
    lineHeight,
    letterSpacing,
    containerWidth,
    containerHeight
  ) {
    const words = text.split(" ");
    let lines = [];
    let currentLine = "";
    let maxTextWidth = 0;

    for (let word of words) {
      // Check if the single word itself exceeds container width
      const { width: singleWordWidth } = this.measureTextWithCache(
        word,
        fontSize,
        fontFamily,
        letterSpacing
      );
      maxTextWidth = Math.max(maxTextWidth, singleWordWidth);

      // If a single word is wider than container, the text cannot fit
      if (singleWordWidth >= containerWidth) {
        return { fits: false, textHeight: fontSize * lineHeight, lines: [] };
      }

      const testLine = currentLine + word + " ";
      const { width: textWidth } = this.measureTextWithCache(
        testLine.trim(),
        fontSize,
        fontFamily,
        letterSpacing
      );

      if (textWidth > containerWidth && currentLine !== "") {
        lines.push(currentLine.trim());
        currentLine = word + " ";
      } else {
        maxTextWidth = Math.max(maxTextWidth, textWidth);
        currentLine = testLine;
      }
    }

    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    const linesLength = lines.length;
    const totalLineHeight =
      lineHeight > 1
        ? fontSize + fontSize * lineHeight * (linesLength - 1)
        : Math.max(
            fontSize,
            fontSize + fontSize * lineHeight * (linesLength - 1)
          );
    const textHeight = linesLength === 1 ? fontSize : totalLineHeight;
    const fits = textHeight <= containerHeight;

    return { fits, textHeight, lines: lines };
  }

  // Main optimized text fit function
  handleTextFitOptimized(params) {
    const {
      text,
      fontFamily,
      lineHeight,
      letterSpacing,
      minFontSize = 1,
    } = params;

    const containerWidth = Math.floor(params.containerWidth);
    const containerHeight = Math.floor(params.containerHeight);

    // Create cache key
    const cacheKey = this.createCacheKey(
      text,
      fontFamily,
      lineHeight,
      letterSpacing,
      containerWidth,
      containerHeight
    );
    // Check cache first
    if (this.resultCache.has(cacheKey)) {
      return this.resultCache.get(cacheKey);
    }

    // Calculate optimal font size
    const result = this.findOptimalFontSize({
      text,
      fontFamily,
      lineHeight,
      letterSpacing,
      containerWidth,
      containerHeight,
      minFontSize,
      maxFontSize: containerHeight,
    });

    // Cache result
    if (this.resultCache.size >= this.maxCacheSize) {
      const firstKey = this.resultCache.keys().next().value;
      this.resultCache.delete(firstKey);
    }

    if (this.enableCache) {
      this.resultCache.set(cacheKey, result);
    }
    return result;
  }

  // Clear caches when needed
  clearCache() {
    this.resultCache.clear();
    this.measureCache.clear();
  }

  // Clear specific entries (useful when font changes)
  clearCacheForFont(fontFamily) {
    for (const [key] of this.resultCache.entries()) {
      if (key.includes(fontFamily)) {
        this.resultCache.delete(key);
      }
    }
    for (const [key] of this.measureCache.entries()) {
      if (key.includes(fontFamily)) {
        this.measureCache.delete(key);
      }
    }
  }

  setEnableCache(enable) {
    this.enableCache = enable;
  }
}

// Global instance
const textFitCache = new TextFitCache();

export { textFitCache };

export function handleTextFitOptimized(params) {
  try {
    const result = textFitCache.handleTextFitOptimized(params);
    return result;
  } catch (error) {
    console.error(">>>>> Error in handleTextFitOptimized:", error);
    return { fontSize: 1 };
  }
}
