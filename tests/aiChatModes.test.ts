import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '../store';
import { matchAndExecuteHandsFreeCommand } from '../hooks/useAmbientListener';

beforeEach(() => useStore.setState({ isAiDrawerOpen: false, isAiModalOpen: false }));
describe('AI chat mode state', () => {
  it('opens only one view through every entry action', () => {
    useStore.getState().toggleAiDrawer();
    expect(useStore.getState().isAiDrawerOpen).toBe(true);
    useStore.getState().setAiModalOpen(true);
    expect(useStore.getState().isAiDrawerOpen).toBe(false);
    expect(useStore.getState().isAiModalOpen).toBe(true);
    useStore.getState().toggleAiDrawer();
    expect(useStore.getState().isAiModalOpen).toBe(false);
    useStore.getState().toggleAiModal();
    expect(useStore.getState().isAiDrawerOpen).toBe(false);
    expect(useStore.getState().isAiModalOpen).toBe(true);
  });
  it('keeps an open popup active for hands-free AI requests', () => {
    useStore.getState().setAiModalOpen(true);
    const result = matchAndExecuteHandsFreeCommand('Chalk, buat peta konsep tentang sistem tata surya');
    expect(result.action).toBe('AI_ASSISTANT');
    expect(useStore.getState().isAiModalOpen).toBe(true);
    expect(useStore.getState().isAiDrawerOpen).toBe(false);
  });
  it('preserves the draft, messages, attachment and voice state across switching and closing', () => {
    const messages = [{ role: 'user' as const, text: 'Explain this diagram' }];
    const attachedDocument = { name: 'notes.txt', category: 'text', text: 'Lesson notes' } as any;
    useStore.setState({ chatInputText: 'My unfinished question', messages, attachedDocument,
      isVoiceListening: true, interimInputText: 'live speech', lastUploadedImage: 'image-data' });
    useStore.getState().toggleAiDrawer();
    useStore.getState().setAiModalOpen(true);
    useStore.getState().setAiModalOpen(false);
    const state = useStore.getState();
    expect(state.chatInputText).toBe('My unfinished question');
    expect(state.messages).toBe(messages);
    expect(state.attachedDocument).toBe(attachedDocument);
    expect(state.lastUploadedImage).toBe('image-data');
    expect(state.isVoiceListening).toBe(true);
    expect(state.interimInputText).toBe('live speech');
  });
});
