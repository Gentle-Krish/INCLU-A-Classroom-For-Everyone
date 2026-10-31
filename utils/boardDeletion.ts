import { useStore } from '../store';
import { toast } from './toast';

export interface DeleteSelectionResult {
  deletedCount: number;
  deletedWidgetIds: string[];
  deletedCanvasObjectIds: string[];
}

/**
 * Universal deletion handler for the whiteboard:
 * Seamlessly deletes whatever creation or widget is currently selected:
 * 1. Selected DOM widget cards (AI generated cards, document notes, quizzes, math graphs, interactive apps, timers, attendance, etc.)
 * 2. Selected Fabric canvas objects (shapes, freehand drawing strokes, textboxes, groups, uploaded images, arrows)
 * 3. Placeholders and linked DOM elements
 */
export function deleteCurrentSelection(canvas?: any): DeleteSelectionResult {
  const store = useStore.getState();
  let deletedCount = 0;
  const deletedWidgetIds: string[] = [];
  const deletedCanvasObjectIds: string[] = [];

  // 1. Delete selected DOM widget card if marked selected in store
  const selectedWidgetId = store.selectedWidgetId;
  if (selectedWidgetId && store.domElements[selectedWidgetId]) {
    store.removeDomElement(selectedWidgetId);
    deletedWidgetIds.push(selectedWidgetId);
    deletedCount++;

    // Notify CanvasManager to remove any corresponding placeholder object
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('removeCanvasObject', { detail: { id: selectedWidgetId } }));
    }
  }

  // 2. Delete selected objects on the Fabric canvas
  if (canvas && typeof canvas.getObjects === 'function') {
    try {
      const activeObj = canvas.getActiveObject ? canvas.getActiveObject() : null;
      const activeObjects: any[] = canvas.getActiveObjects
        ? canvas.getActiveObjects()
        : (activeObj ? [activeObj] : []);

      if (activeObjects && activeObjects.length > 0) {
        // Discard active object first so Fabric ActiveSelection internal structures do not throw or skip items
        if (typeof canvas.discardActiveObject === 'function') {
          canvas.discardActiveObject();
        }

        activeObjects.forEach((obj: any) => {
          if (!obj) return;

          // If it's a DOM placeholder or has an id corresponding to a DOM element, remove the DOM element
          const targetId = obj.id;
          if (targetId && (obj.isDomPlaceholder || store.domElements[targetId])) {
            store.removeDomElement(targetId);
            if (!deletedWidgetIds.includes(targetId)) {
              deletedWidgetIds.push(targetId);
            }
          }

          canvas.remove(obj);
          if (targetId) {
            deletedCanvasObjectIds.push(targetId);
          }
          deletedCount++;
        });

        canvas.requestRenderAll();
        canvas.fire('object:modified');
      }
    } catch (err) {
      console.warn('Error during canvas deletion:', err);
    }
  }

  // Ensure selection state is cleared
  if (store.selectedWidgetId) {
    store.setSelectedWidgetId(null);
  }

  if (deletedCount > 0) {
    store.addLog(`Deleted ${deletedCount} item(s) from whiteboard.`);
    toast.success(`Deleted ${deletedCount} item(s)`);
  } else {
    toast.info('Select a card, widget, or drawing on the board to delete.');
  }

  return { deletedCount, deletedWidgetIds, deletedCanvasObjectIds };
}
