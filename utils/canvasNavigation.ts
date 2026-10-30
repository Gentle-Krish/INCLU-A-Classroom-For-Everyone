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
  options?: { maxZoom?: number; padding?: number }
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
  const maxZoom = options?.maxZoom ?? 1;

  const zoom = Math.max(
    0.01,
    Math.min(
      maxZoom,
      availableWidth / Math.max(1, bounds.width),
      availableHeight / Math.max(1, bounds.height)
    )
  );

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

      const curZoom = startZoom + (targetZoom - startZoom) * ease;
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
