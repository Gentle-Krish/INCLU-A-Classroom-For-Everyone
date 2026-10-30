import { describe, it, expect } from 'vitest';
import { isTextEmptyOrAbandoned } from '../components/CanvasManager';

describe('isTextEmptyOrAbandoned', () => {
  it('returns true when text is empty or whitespace only', () => {
    expect(isTextEmptyOrAbandoned({ type: 'i-text', text: '' })).toBe(true);
    expect(isTextEmptyOrAbandoned({ type: 'i-text', text: '   ' })).toBe(true);
    expect(isTextEmptyOrAbandoned({ type: 'textbox', text: '\n\t  ' })).toBe(true);
    expect(isTextEmptyOrAbandoned({ type: 'text', text: '' })).toBe(true);
  });

  it('returns true when text is undefined or null', () => {
    expect(isTextEmptyOrAbandoned({ type: 'i-text', text: undefined })).toBe(true);
    expect(isTextEmptyOrAbandoned({ type: 'i-text', text: null })).toBe(true);
  });

  it('returns true when text is unedited default placeholder', () => {
    expect(isTextEmptyOrAbandoned({ type: 'i-text', text: 'Type text...', __isNewPlaceholder: true })).toBe(true);
  });

  it('returns false when text contains valid content', () => {
    expect(isTextEmptyOrAbandoned({ type: 'i-text', text: 'Hello World' })).toBe(false);
    expect(isTextEmptyOrAbandoned({ type: 'textbox', text: 'A' })).toBe(false);
    expect(isTextEmptyOrAbandoned({ type: 'i-text', text: 'Type text...', __isNewPlaceholder: false })).toBe(false);
  });

  it('returns false for non-text objects', () => {
    expect(isTextEmptyOrAbandoned({ type: 'rect', text: '' })).toBe(false);
    expect(isTextEmptyOrAbandoned({ type: 'circle' })).toBe(false);
    expect(isTextEmptyOrAbandoned(null)).toBe(false);
  });
});
