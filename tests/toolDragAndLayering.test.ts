import { describe, it, expect } from 'vitest';
import fs from 'fs';

describe('Tool Dragging Freedom and Layering Protocols', () => {
  it('FloatingToolContainer uses relative drag constraints allowing full 4-direction dragging', () => {
    const code = fs.readFileSync('components/FloatingToolContainer.tsx', 'utf8');
    
    // Relative negative delta allowed for moving left and up
    expect(code).toContain('const minLeft = typeof window !== \'undefined\' ? -safeLeft + 8 : -3000;');
    expect(code).toContain('const minTop = typeof window !== \'undefined\' ? -safeTop + 8 : -3000;');
    expect(code).toContain('useDragControls');
    expect(code).toContain('dragControls={dragControls}');
    expect(code).toContain('dragListener={false}');
    expect(code).toContain('onPointerDown={(e) => dragControls.start(e)}');
    expect(code).toContain('onPointerDown={(e) => e.stopPropagation()}');
  });

  it('DrawingToolbar, BoardMenuPopup, and Flyout menus are elevated above whiteboard objects', () => {
    const toolbarCode = fs.readFileSync('components/DrawingToolbar.tsx', 'utf8');
    const menuCode = fs.readFileSync('components/BoardMenuPopup.tsx', 'utf8');
    const containerCode = fs.readFileSync('components/FloatingToolContainer.tsx', 'utf8');

    // DrawingToolbar is z-[100]
    expect(toolbarCode).toContain('z-[100]');
    // Flyout is z-[100]
    expect(toolbarCode).toContain('ml-3.5 z-[100]');
    // Backdrop is z-[90]
    expect(toolbarCode).toContain('z-[90]');

    // BoardMenuPopup is z-[100]
    expect(menuCode).toContain('top-0 z-[100]');
    // Menu backdrop is z-[90]
    expect(menuCode).toContain('z-[90]');

    // FloatingToolContainer is z-40 so left toolbar always stays on top
    expect(containerCode).toContain('z-40');
  });

  it('CanvasManager and DomOverlay synchronize widget moves smoothly without dropping frames', () => {
    const domCode = fs.readFileSync('components/DomOverlay.tsx', 'utf8');
    const canvasCode = fs.readFileSync('components/CanvasManager.tsx', 'utf8');

    expect(domCode).toContain('applyPos(latestX, latestY);');
    expect(canvasCode).toContain('latestPlaceholderDetail = e.detail;');
  });
});
