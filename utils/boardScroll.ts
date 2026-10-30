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
  const margin = 28;
  const width = Math.max(520, Math.round(viewW - margin * 2));
  const height = Math.max(360, Math.round(viewH - margin * 2));
  const left = -(vpt[4] || 0) / zoom;
  const top = -(vpt[5] || 0) / zoom;
  return {
    x: Math.round(left + viewW / 2),
    y: Math.round(top + viewH / 2),
    width,
    height,
  };
}
