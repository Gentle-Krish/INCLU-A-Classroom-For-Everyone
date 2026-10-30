import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStore } from '../store';

describe('Whiteboard Page Deletion and Undo/Redo Shortcuts', () => {
  beforeEach(() => {
    // Reset store state
    useStore.setState({
      pages: [
        { canvas: { objects: [{ id: 'obj1' }] }, dom: {}, previewDataUrl: '', mindmapNodes: [] }
      ],
      currentPageIndex: 0,
    });
  });

  it('prevents deleting the only remaining page', () => {
    const store = useStore.getState();
    expect(store.pages.length).toBe(1);

    store.removePage(0);
    expect(useStore.getState().pages.length).toBe(1);
    expect(useStore.getState().currentPageIndex).toBe(0);
  });

  it('adds and then deletes a page cleanly, updating index and timestamp', () => {
    const store = useStore.getState();
    store.addPage({ objects: [{ id: 'obj2' }] });

    expect(useStore.getState().pages.length).toBe(2);
    expect(useStore.getState().currentPageIndex).toBe(1);

    const prevTimestamp = useStore.getState().sessionLoadTimestamp;

    // Delete page 1
    useStore.getState().removePage(1);

    expect(useStore.getState().pages.length).toBe(1);
    expect(useStore.getState().currentPageIndex).toBe(0);
    expect(useStore.getState().sessionLoadTimestamp).toBeGreaterThanOrEqual(prevTimestamp);
  });

  it('deleting page 0 when on page 0 shifts to the surviving page cleanly', () => {
    const store = useStore.getState();
    store.addPage({ objects: [{ id: 'page2_circle' }] });
    store.switchPage(0);

    expect(useStore.getState().currentPageIndex).toBe(0);
    expect(useStore.getState().pages.length).toBe(2);

    // Delete page 0 while on page 0
    useStore.getState().removePage(0);

    expect(useStore.getState().pages.length).toBe(1);
    expect(useStore.getState().currentPageIndex).toBe(0);
    expect(useStore.getState().pages[0].canvas).toEqual({ objects: [{ id: 'page2_circle' }] });
  });

  it('triggers undo and redo functions when set on store', () => {
    const undoMock = vi.fn();
    const redoMock = vi.fn();

    useStore.getState().setUndoRedoFunctions(undoMock, redoMock);

    useStore.getState().undoCanvas();
    expect(undoMock).toHaveBeenCalledTimes(1);

    useStore.getState().redoCanvas();
    expect(redoMock).toHaveBeenCalledTimes(1);
  });
});
