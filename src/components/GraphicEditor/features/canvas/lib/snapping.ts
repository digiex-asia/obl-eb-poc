import type { DesignElement } from '../../../shared/model/types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../../shared/lib/constants';

const SNAP_THRESHOLD = 10; // Pixels

/**
 * Build snap targets from all non-selected elements
 *
 * Extracts 6 snap points per element (left, center, right, top, middle, bottom)
 * plus canvas center points
 */
export const buildSnapTargets = (
  elements: DesignElement[],
  selectedIds: string[]
) => {
  // Add canvas boundaries and center
  const snapTargetsX: number[] = [0, CANVAS_WIDTH / 2, CANVAS_WIDTH];
  const snapTargetsY: number[] = [0, CANVAS_HEIGHT / 2, CANVAS_HEIGHT];

  elements.forEach(el => {
    if (!selectedIds.includes(el.id)) {
      // 3 horizontal snap points: left, center, right
      snapTargetsX.push(el.x);
      snapTargetsX.push(el.x + el.width / 2);
      snapTargetsX.push(el.x + el.width);

      // 3 vertical snap points: top, middle, bottom
      snapTargetsY.push(el.y);
      snapTargetsY.push(el.y + el.height / 2);
      snapTargetsY.push(el.y + el.height);
    }
  });

  return { x: snapTargetsX, y: snapTargetsY };
};

/**
 * Calculate snap offset for a given position
 *
 * Finds the nearest snap target within threshold and returns
 * the offset needed to snap to it
 */
export const calculateSnapOffset = (
  position: number,
  snapTargets: number[],
  threshold: number = SNAP_THRESHOLD
): { offset: number; snapTo: number | null } => {
  let minDist = Infinity;
  let snapTo: number | null = null;
  let offset = 0;

  snapTargets.forEach(target => {
    const dist = Math.abs(position - target);
    if (dist < minDist && dist < threshold) {
      minDist = dist;
      snapTo = target;
      offset = target - position;
    }
  });

  return { offset, snapTo };
};

/**
 * Calculate snap for multiple selected elements (group bounds)
 *
 * Calculates the bounding box of all selected elements and
 * snaps the group as a whole
 */
export const calculateGroupSnap = (
  selectedElements: DesignElement[],
  dx: number,
  dy: number,
  snapTargetsX: number[],
  snapTargetsY: number[]
): {
  dx: number;
  dy: number;
  guidesX: number[];
  guidesY: number[];
} => {
  if (selectedElements.length === 0) {
    return { dx, dy, guidesX: [], guidesY: [] };
  }

  // Calculate bounding box of selected elements
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  selectedElements.forEach(el => {
    minX = Math.min(minX, el.x);
    maxX = Math.max(maxX, el.x + el.width);
    minY = Math.min(minY, el.y);
    maxY = Math.max(maxY, el.y + el.height);
  });

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // After drag
  const newMinX = minX + dx;
  const newMaxX = maxX + dx;
  const newCenterX = centerX + dx;
  const newMinY = minY + dy;
  const newMaxY = maxY + dy;
  const newCenterY = centerY + dy;

  // Check snap for left, center, right
  let snapX = calculateSnapOffset(newMinX, snapTargetsX);
  if (snapX.snapTo === null) {
    snapX = calculateSnapOffset(newCenterX, snapTargetsX);
  }
  if (snapX.snapTo === null) {
    snapX = calculateSnapOffset(newMaxX, snapTargetsX);
  }

  // Check snap for top, middle, bottom
  let snapY = calculateSnapOffset(newMinY, snapTargetsY);
  if (snapY.snapTo === null) {
    snapY = calculateSnapOffset(newCenterY, snapTargetsY);
  }
  if (snapY.snapTo === null) {
    snapY = calculateSnapOffset(newMaxY, snapTargetsY);
  }

  return {
    dx: dx + snapX.offset,
    dy: dy + snapY.offset,
    guidesX: snapX.snapTo !== null ? [snapX.snapTo] : [],
    guidesY: snapY.snapTo !== null ? [snapY.snapTo] : [],
  };
};

/**
 * Calculate distance measurements between elements
 * Shows spacing when elements are aligned or evenly spaced
 */
export const calculateDistanceMeasurements = (
  selectedElements: DesignElement[],
  allElements: DesignElement[],
  selectedIds: string[]
): Array<{ x1: number; y1: number; x2: number; y2: number; value: number; type: 'horizontal' | 'vertical' }> => {
  if (selectedElements.length === 0) return [];

  const measurements: Array<{ x1: number; y1: number; x2: number; y2: number; value: number; type: 'horizontal' | 'vertical' }> = [];
  const DISTANCE_THRESHOLD = 200; // Show distances within 200px

  // Calculate bounding box of selected elements
  let selMinX = Infinity, selMaxX = -Infinity;
  let selMinY = Infinity, selMaxY = -Infinity;

  selectedElements.forEach(el => {
    selMinX = Math.min(selMinX, el.x);
    selMaxX = Math.max(selMaxX, el.x + el.width);
    selMinY = Math.min(selMinY, el.y);
    selMaxY = Math.max(selMaxY, el.y + el.height);
  });

  const selCenterY = (selMinY + selMaxY) / 2;
  const selCenterX = (selMinX + selMaxX) / 2;

  // Check distances to other elements
  allElements.forEach(el => {
    if (selectedIds.includes(el.id)) return;

    const elRight = el.x + el.width;
    const elBottom = el.y + el.height;
    const elCenterY = el.y + el.height / 2;
    const elCenterX = el.x + el.width / 2;

    // Horizontal distances (elements roughly aligned vertically)
    const verticalOverlap = !(selMaxY < el.y || selMinY > elBottom);
    if (verticalOverlap) {
      // Element to the left
      if (elRight < selMinX) {
        const distance = selMinX - elRight;
        if (distance < DISTANCE_THRESHOLD) {
          measurements.push({
            x1: elRight,
            y1: Math.max(selCenterY, elCenterY),
            x2: selMinX,
            y2: Math.max(selCenterY, elCenterY),
            value: Math.round(distance),
            type: 'horizontal'
          });
        }
      }
      // Element to the right
      if (el.x > selMaxX) {
        const distance = el.x - selMaxX;
        if (distance < DISTANCE_THRESHOLD) {
          measurements.push({
            x1: selMaxX,
            y1: Math.max(selCenterY, elCenterY),
            x2: el.x,
            y2: Math.max(selCenterY, elCenterY),
            value: Math.round(distance),
            type: 'horizontal'
          });
        }
      }
    }

    // Vertical distances (elements roughly aligned horizontally)
    const horizontalOverlap = !(selMaxX < el.x || selMinX > elRight);
    if (horizontalOverlap) {
      // Element above
      if (elBottom < selMinY) {
        const distance = selMinY - elBottom;
        if (distance < DISTANCE_THRESHOLD) {
          measurements.push({
            x1: Math.max(selCenterX, elCenterX),
            y1: elBottom,
            x2: Math.max(selCenterX, elCenterX),
            y2: selMinY,
            value: Math.round(distance),
            type: 'vertical'
          });
        }
      }
      // Element below
      if (el.y > selMaxY) {
        const distance = el.y - selMaxY;
        if (distance < DISTANCE_THRESHOLD) {
          measurements.push({
            x1: Math.max(selCenterX, elCenterX),
            y1: selMaxY,
            x2: Math.max(selCenterX, elCenterX),
            y2: el.y,
            value: Math.round(distance),
            type: 'vertical'
          });
        }
      }
    }
  });

  return measurements;
};
