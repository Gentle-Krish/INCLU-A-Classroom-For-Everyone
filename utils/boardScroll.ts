import { findNextWidgetPosition } from './canvasNavigation';

export function scrollBoardPage(page: HTMLElement, deltaY: number, deltaX = 0): void {
  const frame = page.querySelector('iframe');
  if (frame instanceof HTMLIFrameElement && frame.contentWindow) {
    frame.contentWindow.postMessage({ type: 'chalk-scroll', deltaY, deltaX }, '*');
    return;
  }
  const marked = page.querySelector('[data-scroll-body]');
  const target = marked instanceof HTMLElement ? marked : page;
  target.scrollTop += deltaY;
  target.scrollLeft += deltaX;
}

export function boardPageFromPoint(x: number, y: number): HTMLElement | null {
  if (typeof document.elementsFromPoint !== 'function') return null;
  const stack = document.elementsFromPoint(x, y);
  for (const node of stack) {
    if (!(node instanceof HTMLElement)) continue;
    const page = node.closest('[data-board-scroll]');
    if (page instanceof HTMLElement) return page;
  }
  return null;
}

export interface PageFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The sheet the teacher is looking at, in board coordinates. */
export function visiblePageFrame(canvas: {
  width?: number;
  height?: number;
  getWidth?: () => number;
  getHeight?: () => number;
  viewportTransform?: number[];
} | null | undefined): PageFrame {
  const vpt = canvas?.viewportTransform || [1, 0, 0, 1, 0, 0];
  const zoom = vpt[0] || 1;
  const viewW = (canvas?.getWidth?.() || canvas?.width || 1280) / zoom;
  const viewH = (canvas?.getHeight?.() || canvas?.height || 800) / zoom;

  // A comfortable, beautifully proportioned definition/lesson card (width ~820, height ~520)
  // instead of stretching full-screen across the entire monitor
  const width = Math.min(840, Math.max(600, Math.round(viewW * 0.62)));
  const height = Math.min(540, Math.max(420, Math.round(viewH * 0.62)));

  // Place non-overlapping: if widgets already exist, places neatly to the right
  const pos = findNextWidgetPosition({ width, height });

  return {
    x: pos.x,
    y: pos.y,
    width,
    height,
  };
}
