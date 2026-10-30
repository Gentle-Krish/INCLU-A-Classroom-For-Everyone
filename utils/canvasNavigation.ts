export interface BoardBounds { left: number; top: number; width: number; height: number }

/** Frame board content while reserving room for the drawing toolbar. */
export function focusCanvasBounds(canvas: any, bounds: BoardBounds): number[] | null {
  const width = canvas.getWidth?.() ?? canvas.width;
  const height = canvas.getHeight?.() ?? canvas.height;
  if (![width, height, bounds.left, bounds.top, bounds.width, bounds.height].every(Number.isFinite)
    || width <= 0 || height <= 0) return null;
  const leftInset = Math.min(88, width * 0.2);
  const padding = Math.min(32, height * 0.1);
  const availableWidth = Math.max(1, width - leftInset - padding);
  const availableHeight = Math.max(1, height - padding * 2);
  const zoom = Math.max(0.01, Math.min(1, availableWidth / Math.max(1, bounds.width), availableHeight / Math.max(1, bounds.height)));
  const transform = [zoom, 0, 0, zoom,
    leftInset + availableWidth / 2 - (bounds.left + bounds.width / 2) * zoom,
    height / 2 - (bounds.top + bounds.height / 2) * zoom];
  canvas.setViewportTransform(transform);
  canvas.requestRenderAll();
  return transform;
}
