import { describe, expect, it } from 'vitest';
import { speechProviders } from '../utils/speechRoute';

describe('speech route', () => {
  it('tries the saved key once, then offline speech', () => {
    expect(speechProviders({ preferWhisper: false, cloudBlocked: false, hasKey: true })).toEqual(['gemini', 'whisper']);
  });

  it('does not try the key again after it is out of credit', () => {
    expect(speechProviders({ preferWhisper: false, cloudBlocked: true, hasKey: true })).toEqual(['whisper']);
  });

  it('stays on offline speech when that engine is selected', () => {
    expect(speechProviders({ preferWhisper: true, cloudBlocked: false, hasKey: true })).toEqual(['whisper']);
    expect(speechProviders({ preferWhisper: false, cloudBlocked: false, hasKey: false })).toEqual(['whisper']);
  });
});
