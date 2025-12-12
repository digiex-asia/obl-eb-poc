/**
 * Image Helper Functions
 *
 * Utilities for handling image aspect ratio preservation and positioning
 */

interface AddImageParams {
  src: string;
  dropX?: number;
  dropY?: number;
  onComplete: (attrs: {
    src: string;
    width: number;
    height: number;
    contentWidth: number;
    contentHeight: number;
    x?: number;
    y?: number;
  }) => void;
}

/**
 * Load an image and calculate dimensions while preserving aspect ratio
 *
 * - Loads image to read naturalWidth/Height
 * - Scales down to max 400px width while maintaining aspect
 * - Centers on drop point if provided
 * - Initializes contentWidth/Height for zoom effects
 */
export const addImageWithRatio = ({
  src,
  dropX,
  dropY,
  onComplete,
}: AddImageParams) => {
  const img = new Image();
  img.src = src;
  img.crossOrigin = 'Anonymous';

  img.onload = () => {
    let w = img.naturalWidth;
    let h = img.naturalHeight;

    // Scale down if too large (max 400px width)
    if (w > 400) {
      const ratio = 400 / w;
      w = 400;
      h = h * ratio;
    }

    // Center on drop point if provided
    let finalX = dropX;
    let finalY = dropY;
    if (finalX !== undefined) finalX -= w / 2;
    if (finalY !== undefined) finalY -= h / 2;

    // Return calculated attributes
    onComplete({
      src,
      width: w,
      height: h,
      contentWidth: w,
      contentHeight: h,
      ...(finalX !== undefined && { x: finalX }),
      ...(finalY !== undefined && { y: finalY }),
    });
  };

  img.onerror = () => {
    console.error('Failed to load image:', src);
    // Fallback to default size if image fails to load
    onComplete({
      src,
      width: 200,
      height: 200,
      contentWidth: 200,
      contentHeight: 200,
      ...(dropX !== undefined && { x: dropX - 100 }),
      ...(dropY !== undefined && { y: dropY - 100 }),
    });
  };
};
