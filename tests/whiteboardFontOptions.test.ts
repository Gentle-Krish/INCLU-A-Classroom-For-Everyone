import { describe, it, expect } from 'vitest';
import { STANDARD_FONT_SIZES, resolveFontSize, FONT_SIZE_PRESETS } from '../constants';
import { writeTextIntent } from '../utils/boardIntent';
import { evaluateJevSystemOne } from '../hooks/useGeminiBrain';

describe('Whiteboard and System Typography & Standard Font Options', () => {
  describe('Standard Font Options & Constants', () => {
    it('defines small, medium, and large standard font options', () => {
      expect(STANDARD_FONT_SIZES.small).toBeDefined();
      expect(STANDARD_FONT_SIZES.medium).toBeDefined();
      expect(STANDARD_FONT_SIZES.large).toBeDefined();

      expect(STANDARD_FONT_SIZES.small.whiteboardPx).toBe(18);
      expect(STANDARD_FONT_SIZES.medium.whiteboardPx).toBe(28);
      expect(STANDARD_FONT_SIZES.large.whiteboardPx).toBe(48);

      expect(STANDARD_FONT_SIZES.small.uiPx).toBe(14);
      expect(STANDARD_FONT_SIZES.medium.uiPx).toBe(18);
      expect(STANDARD_FONT_SIZES.large.uiPx).toBe(24);

      expect(FONT_SIZE_PRESETS).toHaveLength(3);
    });

    it('resolves font size across whiteboard and ui contexts', () => {
      // Standard named presets
      expect(resolveFontSize('small', 'whiteboard')).toBe(18);
      expect(resolveFontSize('medium', 'whiteboard')).toBe(28);
      expect(resolveFontSize('large', 'whiteboard')).toBe(48);

      expect(resolveFontSize('small', 'ui')).toBe(14);
      expect(resolveFontSize('medium', 'ui')).toBe(18);
      expect(resolveFontSize('large', 'ui')).toBe(24);

      // Custom pixel sizes
      expect(resolveFontSize(56, 'whiteboard')).toBe(56);
      expect(resolveFontSize('56px', 'whiteboard')).toBe(56);
      expect(resolveFontSize('custom 56px', 'whiteboard')).toBe(56);
      expect(resolveFontSize('custom 72', 'whiteboard')).toBe(72);
      expect(resolveFontSize('32', 'whiteboard')).toBe(32);

      // Default fallback
      expect(resolveFontSize(null, 'whiteboard')).toBe(28);
    });
  });

  describe('writeTextIntent parsing', () => {
    it('parses default write command with medium font size', () => {
      const result = writeTextIntent('write hello world');
      expect(result).not.toBeNull();
      expect(result?.text).toBe('hello world');
      expect(result?.sizeName).toBe('medium');
      expect(result?.fontSize).toBe(28);
    });

    it('parses write command with medium size font', () => {
      const result = writeTextIntent('write hello world in medium size font');
      expect(result).not.toBeNull();
      expect(result?.text).toBe('hello world');
      expect(result?.sizeName).toBe('medium');
      expect(result?.fontSize).toBe(28);
    });

    it('parses write command with custom 56px font', () => {
      const result = writeTextIntent('write hello world in custom 56px');
      expect(result).not.toBeNull();
      expect(result?.text).toBe('hello world');
      expect(result?.sizeName).toBe('custom');
      expect(result?.fontSize).toBe(56);
    });

    it('parses write command with small size font', () => {
      const result = writeTextIntent('write hello world in small size font');
      expect(result).not.toBeNull();
      expect(result?.text).toBe('hello world');
      expect(result?.sizeName).toBe('small');
      expect(result?.fontSize).toBe(18);
    });

    it('parses write command with large font and trailing period', () => {
      const result = writeTextIntent('Write Hello Rahul in large font.');
      expect(result).not.toBeNull();
      expect(result?.text).toBe('Hello Rahul');
      expect(result?.sizeName).toBe('large');
      expect(result?.fontSize).toBe(48);
    });

    it('parses write command with prefix size', () => {
      const result = writeTextIntent('Write in large font: Hello Rahul.');
      expect(result).not.toBeNull();
      expect(result?.text).toBe('Hello Rahul');
      expect(result?.sizeName).toBe('large');
      expect(result?.fontSize).toBe(48);
    });

    it('handles size typo gracefully (e.g. fotn)', () => {
      const result = writeTextIntent('write Hello Rahul in large fotn');
      expect(result).not.toBeNull();
      expect(result?.text).toBe('Hello Rahul');
      expect(result?.sizeName).toBe('large');
      expect(result?.fontSize).toBe(48);
    });

    it('parses Indonesian write commands with standard and custom sizes', () => {
      const resBesar = writeTextIntent('tulis halo dunia ukuran besar');
      expect(resBesar).not.toBeNull();
      expect(resBesar?.text).toBe('halo dunia');
      expect(resBesar?.sizeName).toBe('large');
      expect(resBesar?.fontSize).toBe(48);

      const resCustom = writeTextIntent('tuliskan selamat datang font 56px');
      expect(resCustom).not.toBeNull();
      expect(resCustom?.text).toBe('selamat datang');
      expect(resCustom?.sizeName).toBe('custom');
      expect(resCustom?.fontSize).toBe(56);
    });

    it('does not intercept essay/story composition or pen/equation commands', () => {
      expect(writeTextIntent('write an essay about photosynthesis')).toBeNull();
      expect(writeTextIntent('write a story about space exploration')).toBeNull();
      expect(writeTextIntent('use the pen to write hello')).toBeNull();
      expect(writeTextIntent('write equation y = mx + b')).toBeNull();
    });
  });

  describe('Jev System 1 Reflex Execution', () => {
    it('instantly handles write text command in custom 56px', () => {
      const result = evaluateJevSystemOne('write hello world in custom 56px', {}, null);
      expect(result.handled).toBe(true);
      expect(result.actionTaken).toBe('WRITE_TEXT');
      expect(result.canvasText?.text).toBe('hello world');
      expect(result.canvasText?.fontSize).toBe(56);
    });

    it('instantly handles write text command in large font with trailing period', () => {
      const result = evaluateJevSystemOne('Write Hello Rahul in large font.', {}, null);
      expect(result.handled).toBe(true);
      expect(result.actionTaken).toBe('WRITE_TEXT');
      expect(result.canvasText?.text).toBe('Hello Rahul');
      expect(result.canvasText?.fontSize).toBe(48);
      expect(result.message).toContain('large font, 48px');
    });

    it('politely handles impossible/unsupported requests like drawing the Mona Lisa', () => {
      const result = evaluateJevSystemOne('draw mona lisa', {}, null);
      expect(result.handled).toBe(true);
      expect(result.actionTaken).toBe('UNSUPPORTED_REQUEST');
      expect(result.message).toContain('Sorry, I currently cannot do that');
    });
  });
});
