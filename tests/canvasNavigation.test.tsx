import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { focusCanvasBounds } from '../utils/canvasNavigation';
import { DrawingToolbar } from '../components/DrawingToolbar';
import { useAgentProcessor } from '../hooks/useAgentProcessor';
import { useStore } from '../store';

vi.mock('../utils/sounds', () => ({ sounds: { play: vi.fn() } }));

function makeCanvas() {
  const objects: any[] = [];
  return {
    width: 1000, height: 700, viewportTransform: [2, 0, 0, 2, -10000, 8000],
    getObjects: () => objects,
    add: (obj: any) => objects.push(obj),
    setActiveObject: vi.fn(),
    setViewportTransform: vi.fn(function(this: any, vpt: number[]) { this.viewportTransform = vpt; }),
    requestRenderAll: vi.fn(),
  };
}

function expectVisible(canvas: ReturnType<typeof makeCanvas>, bounds: { left: number; top: number; width: number; height: number }) {
  const [zoom, , , , x, y] = canvas.viewportTransform;
  expect(bounds.left * zoom + x).toBeGreaterThanOrEqual(87);
  expect(bounds.top * zoom + y).toBeGreaterThanOrEqual(31);
  expect((bounds.left + bounds.width) * zoom + x).toBeLessThanOrEqual(969);
  expect((bounds.top + bounds.height) * zoom + y).toBeLessThanOrEqual(669);
}

beforeEach(() => {
  useStore.setState({ activeTool: 'SELECT', actionQueue: [], domElements: {}, isActing: false });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('AI canvas framing', () => {
  it('brings distant output into view without changing its board position', () => {
    const canvas = makeCanvas();
    const bounds = { left: -8000, top: 12000, width: 600, height: 400 };
    focusCanvasBounds(canvas, bounds);
    expectVisible(canvas, bounds);
    expect(bounds.left).toBe(-8000);
  });

  it('fits oversized output and restores readable zoom for small output', () => {
    const canvas = makeCanvas();
    const bounds = { left: 3000, top: -9000, width: 2400, height: 1600 };
    focusCanvasBounds(canvas, bounds);
    expectVisible(canvas, bounds);
    expect(canvas.viewportTransform[0]).toBeLessThan(1);
    focusCanvasBounds(canvas, { left: 0, top: 0, width: 200, height: 100 });
    expect(canvas.viewportTransform[0]).toBe(1);
  });

  it('ignores invalid bounds', () => {
    const canvas = makeCanvas();
    expect(focusCanvasBounds(canvas, { left: NaN, top: 0, width: 10, height: 10 })).toBeNull();
    expect(canvas.setViewportTransform).not.toHaveBeenCalled();
  });

  it.each([false, true])('frames AI output while respecting an active manual pan (%s)', async (isPanning) => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback =>
      window.setTimeout(() => callback(performance.now() + 1000), 0));
    const canvas = makeCanvas();
    const originalTransform = [...canvas.viewportTransform];
    (canvas as any).__isPanning = isPanning;
    (window as any).fabric = { Rect: class {
      constructor(options: any) { Object.assign(this, options); }
      getBoundingRect() {
        const o = this as any;
        return { left: o.left - o.width / 2, top: o.top - o.height / 2, width: o.width, height: o.height };
      }
    } };
    renderHook(() => useAgentProcessor({ current: canvas }));
    act(() => useStore.getState().addAction({ id: 'test', type: 'RENDER_HTML', status: 'PENDING', payload: {
      x: 7000, y: -4000, width: 1600, height: 900, html: '<p>Answer</p>', componentType: 'DOCUMENT_PAGE', config: {},
    } }));
    await waitFor(() => expect(canvas.getObjects()).toHaveLength(1), { timeout: 3000 });
    await waitFor(() => expect(useStore.getState().isActing).toBe(false));
    if (isPanning) {
      expect(canvas.viewportTransform).toEqual(originalTransform);
      expect(canvas.setViewportTransform).not.toHaveBeenCalled();
    } else {
      expectVisible(canvas, canvas.getObjects()[0].getBoundingRect());
      expect(useStore.getState().viewportTransform).toEqual(canvas.viewportTransform);
    }
  });
});

describe('Hand tool', () => {
  function toolbar() {
    render(<DrawingToolbar canvasRef={{ current: null }} onImageUpload={() => {}} onDeleteSelection={() => {}} onZoom={() => {}} />);
  }

  it('can be selected by its accessible button, H, and exited with V', () => {
    toolbar();
    const hand = screen.getByRole('button', { name: 'Hand — drag to pan (H)' });
    fireEvent.click(hand);
    expect(hand).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(window, { key: 'v' });
    expect(useStore.getState().activeTool).toBe('SELECT');
    fireEvent.keyDown(window, { key: 'h' });
    expect(useStore.getState().activeTool).toBe('HAND');
  });

  it('keeps tool shortcuts out of typing and browser shortcuts', () => {
    toolbar();
    fireEvent.keyDown(window, { key: 'h', ctrlKey: true });
    expect(useStore.getState().activeTool).toBe('SELECT');
    const input = document.createElement('textarea');
    document.body.append(input);
    input.focus();
    fireEvent.keyDown(input, { key: 'h' });
    expect(useStore.getState().activeTool).toBe('SELECT');
    input.remove();
  });
});
