export type SpeechProvider = 'gemini' | 'whisper';

/** One cloud attempt, then offline Whisper. A blocked key is not tried again. */
export function speechProviders(options: {
  preferWhisper: boolean;
  cloudBlocked: boolean;
  hasKey: boolean;
}): SpeechProvider[] {
  if (options.preferWhisper || options.cloudBlocked || !options.hasKey) return ['whisper'];
  return ['gemini', 'whisper'];
}
