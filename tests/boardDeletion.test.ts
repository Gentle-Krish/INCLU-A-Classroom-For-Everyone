import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStore } from '../store';
import { deleteCurrentSelection } from '../utils/boardDeletion';

describe('Universal Whiteboard Deletion', () => {
  beforeEach(() => {
    useStore.setState({
      domElements: {
        widget_1: {
          id: 'widget_1',
          html: '<div>Test Widget</div>',
          x: 100,
          y: 100,
          width: 300,
          height: 200,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          zIndex: 10,
          componentType: 'TIMER',
        },
        widget_2: {
          id: 'widget_2',
          html: '<div>Quiz Widget</div>',
          x: 400,
          y: 100,
          width: 300,
          height: 200,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          zIndex: 10,
          componentType: 'QUIZ_MULTIPLE_CHOICE',
        },
      },
      selectedWidgetId: null,
      pages: [
        { canvas: { objects: [] }, dom: {}, previewDataUrl: '', mindmapNodes: [] }
      ],
      currentPageIndex: 0,
    });
  });

  it('deletes a selected DOM widget when deleteCurrentSelection is called', () => {
    useStore.getState().setSelectedWidgetId('widget_1');
    expect(useStore.getState().selectedWidgetId).toBe('widget_1');

    const result = deleteCurrentSelection();
    expect(result.deletedCount).toBe(1);
    expect(result.deletedWidgetIds).toContain('widget_1');
    expect(useStore.getState().domElements['widget_1']).toBeUndefined();
    expect(useStore.getState().domElements['widget_2']).toBeDefined();
    expect(useStore.getState().selectedWidgetId).toBeNull();
  });

  it('deletes active canvas objects and discards active selection cleanly', () => {
    const mockShape1 = { id: 'rect_1', type: 'rect' };
    const mockShape2 = { id: 'circle_1', type: 'circle' };

    const mockCanvas = {
      getActiveObject: vi.fn(),
      getActiveObjects: vi.fn(() => [mockShape1, mockShape2]),
      discardActiveObject: vi.fn(),
      remove: vi.fn(),
      requestRenderAll: vi.fn(),
      fire: vi.fn(),
      getObjects: vi.fn(() => [mockShape1, mockShape2]),
    };

    const result = deleteCurrentSelection(mockCanvas);

    expect(result.deletedCount).toBe(2);
    expect(result.deletedCanvasObjectIds).toEqual(['rect_1', 'circle_1']);
    expect(mockCanvas.discardActiveObject).toHaveBeenCalledTimes(1);
    expect(mockCanvas.remove).toHaveBeenCalledWith(mockShape1);
    expect(mockCanvas.remove).toHaveBeenCalledWith(mockShape2);
    expect(mockCanvas.requestRenderAll).toHaveBeenCalledTimes(1);
  });

  it('removes linked DOM elements when deleting canvas placeholder objects', () => {
    const mockPlaceholder = {
      id: 'widget_2',
      isDomPlaceholder: true,
      type: 'rect',
    };

    const mockCanvas = {
      getActiveObject: vi.fn(),
      getActiveObjects: vi.fn(() => [mockPlaceholder]),
      discardActiveObject: vi.fn(),
      remove: vi.fn(),
      requestRenderAll: vi.fn(),
      fire: vi.fn(),
      getObjects: vi.fn(() => [mockPlaceholder]),
    };

    const result = deleteCurrentSelection(mockCanvas);

    expect(result.deletedCount).toBe(1);
    expect(result.deletedWidgetIds).toContain('widget_2');
    expect(useStore.getState().domElements['widget_2']).toBeUndefined();
    expect(mockCanvas.remove).toHaveBeenCalledWith(mockPlaceholder);
  });

  it('handles empty selection gracefully', () => {
    const mockCanvas = {
      getActiveObject: vi.fn(() => null),
      getActiveObjects: vi.fn(() => []),
      discardActiveObject: vi.fn(),
      remove: vi.fn(),
      requestRenderAll: vi.fn(),
      fire: vi.fn(),
      getObjects: vi.fn(() => []),
    };

    const result = deleteCurrentSelection(mockCanvas);
    expect(result.deletedCount).toBe(0);
    expect(mockCanvas.remove).not.toHaveBeenCalled();
  });
});
