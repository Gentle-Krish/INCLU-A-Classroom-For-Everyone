import { useStore } from '../store';

export interface BoardBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface SmoothFocusOptions {
  duration?: number;
  maxZoom?: number;
  targetZoom?: number;
  padding?: number;
  showReticle?: boolean;
}

// Active camera animation tracker for seamless handoff when consecutive objects are created
let currentAnimation: {
  cancel: () => void;
  id: number;
} | null = null;

export function cancelActiveFocusAnimation(): void {
  if (currentAnimation) {
    currentAnimation.cancel();
    currentAnimation = null;
  }
}

/**
 * Calculates the exact Fabric viewport transform [zoom, 0, 0, zoom, panX, panY]
 * to bring the target bounds into center focus while preserving room for toolbars.
 */
export function calculateFocusTransform(
  canvas: any,
  bounds: BoardBounds,
  options?: { maxZoom?: number; targetZoom?: number; padding?: number }
): number[] | null {
  const width = canvas.getWidth?.() ?? canvas.width;
  const height = canvas.getHeight?.() ?? canvas.height;
  if (
    ![width, height, bounds.left, bounds.top, bounds.width, bounds.height].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  const leftInset = Math.min(88, width * 0.2);
  const padding = options?.padding ?? Math.min(32, height * 0.1);

  // If the AI Assistant drawer sidebar is open on the right, respect its ~380px footprint
  const isAiDrawerOpen = useStore.getState().isAiDrawerOpen;
  const rightSidebarWidth = isAiDrawerOpen ? Math.min(390, width * 0.35) : 0;
  const rightInset = Math.max(padding, rightSidebarWidth);

  const topInset = Math.min(64, height * 0.1);
  const bottomInset = Math.min(80, height * 0.12);

  const availableWidth = Math.max(1, width - leftInset - rightInset);
  const availableHeight = Math.max(1, height - topInset - bottomInset);

  const isLargeOrMedium = bounds.width >= 320 || bounds.height >= 300;
  const defaultMaxZoom = isLargeOrMedium ? 0.75 : 1.0;
  const maxZoom = options?.maxZoom ?? defaultMaxZoom;

  const fittedZoom = Math.min(
    maxZoom,
    availableWidth / Math.max(1, bounds.width),
    availableHeight / Math.max(1, bounds.height)
  );

  let zoom: number;
  if (options?.targetZoom !== undefined) {
    zoom = Math.min(options.targetZoom, fittedZoom);
  } else if (isLargeOrMedium) {
    // For medium or large elements / cards / text definitions, target 75% zoom (0.75)
    // so the entire content fits comfortably on screen without touching toolbars.
    zoom = Math.min(0.75, fittedZoom);
  } else {
    zoom = Math.max(0.01, fittedZoom);
  }

  zoom = Math.max(0.05, zoom);

  const visibleCenterX = leftInset + availableWidth / 2;
  const visibleCenterY = topInset + availableHeight / 2;

  const transform = [
    zoom,
    0,
    0,
    zoom,
    visibleCenterX - (bounds.left + bounds.width / 2) * zoom,
    visibleCenterY - (bounds.top + bounds.height / 2) * zoom,
  ];

  return transform;
}

/**
 * Frame board content while reserving room for the drawing toolbar.
 * Synchronous by default for backwards compatibility; supports { animate: true } for smooth camera glide.
 */
export function focusCanvasBounds(
  canvas: any,
  bounds: BoardBounds,
  options?: { animate?: boolean; duration?: number; maxZoom?: number; padding?: number }
): number[] | null {
  const transform = calculateFocusTransform(canvas, bounds, options);
  if (!transform) return null;

  if (options?.animate) {
    smoothFocusCanvas(canvas, bounds, options);
    return transform;
  }

  canvas.setViewportTransform(transform);
  canvas.requestRenderAll();
  return transform;
}

/**
 * Smoothly pan and zoom camera to focus on target bounds, mimicking a camera autofocus rack-focus.
 * If another autofocus begins while in flight, it smoothly redirects without stutter.
 */
export function smoothFocusCanvas(
  canvas: any,
  bounds: BoardBounds,
  options?: SmoothFocusOptions
): Promise<number[] | null> {
  return new Promise((resolve) => {
    if (!canvas || canvas.__isPanning) {
      return resolve(null);
    }

    const targetTransform = calculateFocusTransform(canvas, bounds, options);
    if (!targetTransform) {
      return resolve(null);
    }

    // Cancel any previous focus flight so new target takes over immediately
    cancelActiveFocusAnimation();

    const startVpt = [...(canvas.viewportTransform || [1, 0, 0, 1, 0, 0])];
    const startZoom = startVpt[0];
    const startX = startVpt[4];
    const startY = startVpt[5];

    const targetZoom = targetTransform[0];
    const targetX = targetTransform[4];
    const targetY = targetTransform[5];

    // Compute distance traveled to calculate dynamic zoom-dip emphasis
    const travelDist = Math.hypot(targetX - startX, targetY - startY);
    const dipAmount = travelDist > 120 ? Math.min(0.08, (travelDist / 1200) * 0.08) : 0;

    // Trigger visual camera autofocus reticle
    if (options?.showReticle !== false) {
      const store = useStore.getState();
      store.setAutofocusTarget?.({
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
        timestamp: Date.now(),
      });
      setTimeout(() => {
        const cur = useStore.getState().autofocusTarget;
        if (cur && Date.now() - cur.timestamp >= 1100) {
          useStore.getState().setAutofocusTarget(null);
        }
      }, 1200);
    }

    const duration = options?.duration ?? 800;
    const startTime = performance.now();
    let cancelled = false;
    let animId = 0;

    // Camera autofocus damping curve (swift start with silky cushioned slow settling)
    const cameraEase = (t: number) => 1 - Math.pow(1 - t, 3.8);

    const step = (now: number) => {
      if (cancelled) return;

      if (canvas.__isPanning) {
        cancelled = true;
        currentAnimation = null;
        resolve(null);
        return;
      }

      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = cameraEase(progress);

      // Subtle dynamic breathe dip mid-flight creates an authentic focus pan & zoom feel
      const midFlightDip = dipAmount * Math.sin(progress * Math.PI);
      const curZoom = Math.max(0.05, (startZoom + (targetZoom - startZoom) * ease) - midFlightDip);
      const curX = startX + (targetX - startX) * ease;
      const curY = startY + (targetY - startY) * ease;
      const curVpt = [curZoom, 0, 0, curZoom, curX, curY];

      canvas.setViewportTransform(curVpt);
      canvas.requestRenderAll();
      useStore.getState().setViewport(curZoom, curVpt);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        canvas.setViewportTransform(targetTransform);
        canvas.requestRenderAll();
        useStore.getState().setViewport(targetZoom, targetTransform);
        currentAnimation = null;
        resolve(targetTransform);
      }
    };

    currentAnimation = {
      id: animId,
      cancel: () => {
        cancelled = true;
        cancelAnimationFrame(animId);
      },
    };

    animId = requestAnimationFrame(step);
    if (currentAnimation) currentAnimation.id = animId;
  });
}

export interface WidgetPlacementOptions {
  width: number;
  height: number;
  gap?: number;
  preferredOrigin?: { x: number; y: number };
}

/**
 * Calculates optimal, collision-free placement coordinates for new widgets
 * on the infinite whiteboard canvas, preventing overlapping/stacking.
 */
export function findNextWidgetPosition(options: WidgetPlacementOptions): { x: number; y: number } {
  const { width, height, gap = 52 } = options;
  const store = useStore.getState();
  const existing = Object.values(store.domElements || {});

  // When board has no widgets yet:
  if (existing.length === 0) {
    if (options.preferredOrigin) {
      return { x: options.preferredOrigin.x, y: options.preferredOrigin.y };
    }
    const vpt = store.viewportTransform || [1, 0, 0, 1, 0, 0];
    const zoom = vpt[0] || 1;
    const canvasW = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const canvasH = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const screenCenterX = Math.round((-vpt[4] + canvasW / 2) / zoom);
    const screenCenterY = Math.round((-vpt[5] + canvasH / 2) / zoom);

    // If near canvas default (0, 0 pan), place nicely near center (960, 540)
    if (Math.abs(vpt[4]) < 50 && Math.abs(vpt[5]) < 50) {
      return { x: 960, y: 540 };
    }
    return { x: screenCenterX, y: screenCenterY };
  }

  // Convert existing widgets to bounding boxes in canvas world coordinates
  const boxes = existing.map((el) => ({
    left: el.x - el.width / 2,
    right: el.x + el.width / 2,
    top: el.y - el.height / 2,
    bottom: el.y + el.height / 2,
    centerX: el.x,
    centerY: el.y,
    width: el.width,
    height: el.height,
  }));

  const collidesWithAny = (cx: number, cy: number, w: number, h: number, margin = 20) => {
    const l1 = cx - w / 2 - margin;
    const r1 = cx + w / 2 + margin;
    const t1 = cy - h / 2 - margin;
    const b1 = cy + h / 2 + margin;

    return boxes.some((b) => !(l1 >= b.right || r1 <= b.left || t1 >= b.bottom || b1 <= b.top));
  };

  // Sort boxes left-to-right
  boxes.sort((a, b) => a.left - b.left);
  const rightmost = boxes.reduce((max, b) => (b.right > max.right ? b : max), boxes[0]);
  const leftmost = boxes[0];
  const maxBottom = boxes.reduce((max, b) => (b.bottom > max.bottom ? b : max), boxes[0]);

  // Strategy 1: Place to the right of the rightmost widget along the same baseline
  const candidateRightX = Math.round(rightmost.right + gap + width / 2);
  const candidateRightY = Math.round(rightmost.centerY);

  // If row span is reasonable (<= 2400px), place horizontally
  const totalRowSpan = candidateRightX + width / 2 - leftmost.left;
  if (totalRowSpan <= 2400 && !collidesWithAny(candidateRightX, candidateRightY, width, height)) {
    return { x: candidateRightX, y: candidateRightY };
  }

  // Strategy 2: Wrap to next row beneath the current content
  const candidateBelowX = Math.round(leftmost.centerX);
  const candidateBelowY = Math.round(maxBottom.bottom + gap + height / 2);
  if (!collidesWithAny(candidateBelowX, candidateBelowY, width, height)) {
    return { x: candidateBelowX, y: candidateBelowY };
  }

  // Strategy 3: Horizontal scan with collision avoidance
  let testX = Math.round(rightmost.right + gap + width / 2);
  let testY = Math.round(rightmost.centerY);
  let attempts = 0;
  while (collidesWithAny(testX, testY, width, height) && attempts < 20) {
    testX += gap + 40;
    attempts++;
  }
  return { x: testX, y: testY };
}
