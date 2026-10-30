import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AiChatPanel } from '../components/AiChatPanel';
import { AiChatModal } from '../components/AiChatModal';
import { useStore } from '../store';

const { processPrompt } = vi.hoisted(() => ({ processPrompt: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../hooks/useGeminiBrain', () => ({ useGeminiBrain: () => ({ processUserPrompt: processPrompt }) }));
vi.mock('../components/ChatMessageItem', () => ({ ChatMessageItem: ({ message }: any) => <p>{message.text}</p> }));
vi.mock('../components/FileUploadButton', () => ({ FileUploadButton: () => <button type="button">Upload</button> }));
vi.mock('../components/AttachedDocumentBadge', () => ({ AttachedDocumentBadge: () => null }));
vi.mock('../components/ProcessingStatusHud', () => ({ ProcessingStatusHud: () => <p>Processing</p> }));

const statusConfig = { mode: 'vertex', text: 'Cloud Mode (Vertex AI)', dot: 'bg-green-500', detail: 'Vertex: test-model' };
const canvasRef = { current: {} };
function Chat() {
  const { isAiDrawerOpen, isAiModalOpen, toggleAiDrawer, setAiModalOpen } = useStore();
  return <>
    <button onClick={() => setAiModalOpen(true)}>Open popup</button>
    {isAiDrawerOpen && <AiChatPanel mode="sidebar" canvasRef={canvasRef} statusConfig={statusConfig}
      onClose={toggleAiDrawer} onOpenSettings={() => {}} onToggleMode={() => setAiModalOpen(true)} />}
    <AiChatModal isOpen={isAiModalOpen} onClose={() => setAiModalOpen(false)}>
      <AiChatPanel mode="modal" canvasRef={canvasRef} statusConfig={statusConfig}
        onClose={() => setAiModalOpen(false)} onOpenSettings={() => {}} onToggleMode={toggleAiDrawer} />
    </AiChatModal>
  </>;
}

beforeEach(() => {
  processPrompt.mockClear();
  useStore.setState({ isAiDrawerOpen: true, isAiModalOpen: false, messages: [], chatInputText: '',
    attachedDocument: null, lastUploadedImage: null, isThinking: false, isVoiceListening: false });
});
afterEach(cleanup);

describe('shared AI chat interface', () => {
  it('preserves a draft and conversation through pop-out and docking', () => {
    useStore.setState({ messages: [{ role: 'user', text: 'Earlier message' }] });
    render(<Chat />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Unfinished question' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pop out to modal' }));
    expect(screen.getByRole('dialog', { name: 'AI chat' })).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('Unfinished question');
    expect(screen.getByText('Earlier message')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dock to side' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('Unfinished question');
  });

  it('submits once through the active canvas and keeps document actions available in popup mode', async () => {
    render(<Chat />);
    fireEvent.click(screen.getByRole('button', { name: 'Lesson summary' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(processPrompt).toHaveBeenCalledTimes(1));
    expect(processPrompt).toHaveBeenCalledWith('Summarize the lesson on this whiteboard.', canvasRef);
    act(() => useStore.setState({ attachedDocument: { name: 'lesson.pdf', category: 'pdf' } as any }));
    fireEvent.click(screen.getByRole('button', { name: 'Pop out to modal' }));
    fireEvent.click(screen.getByRole('button', { name: /Summarize Material/ }));
    await waitFor(() => expect(processPrompt).toHaveBeenCalledTimes(2));
    expect(processPrompt.mock.calls[1][0]).toContain('lesson.pdf');
  });

  it('keeps the live voice banner and its stop control in the popup', () => {
    const toggleMic = vi.fn();
    window.addEventListener('toggle-mic', toggleMic);
    useStore.setState({ isVoiceListening: true, interimInputText: 'Photosynthesis' });
    render(<Chat />);
    fireEvent.click(screen.getByRole('button', { name: 'Pop out to modal' }));
    expect(screen.getByText(/Photosynthesis/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(toggleMic).toHaveBeenCalledTimes(1);
    expect(useStore.getState().isVoiceListening).toBe(true);
    window.removeEventListener('toggle-mic', toggleMic);
  });

  it('traps Tab, closes with Escape and restores focus to the trigger', () => {
    useStore.setState({ isAiDrawerOpen: false });
    render(<Chat />);
    const trigger = screen.getByRole('button', { name: 'Open popup' });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('textbox')).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
