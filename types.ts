
export interface Point {
  x: number;
  y: number;
}

export enum ShapeType {
  RECTANGLE = 'RECTANGLE',
  CIRCLE = 'CIRCLE',
  TRIANGLE = 'TRIANGLE',
  STAR = 'STAR',
  POLYGON = 'POLYGON',
  TEXT = 'TEXT',
}

export type FontFamily = 'Inter' | 'Source Serif 4' | 'JetBrains Mono' | 'Bricolage Grotesque' | 'Playfair Display';
export type SmartboardLayoutMode = 'classic' | 'dock' | 'radial';

export type CreatorTool = 'SELECT' | 'HAND' | 'PENCIL' | 'ERASER' | 'TEXT' | 'RECTANGLE' | 'CIRCLE' | 'TRIANGLE' | 'STAR' | 'POLYGON' | 'LINE' | 'ARROW' | 'DIAMOND' | 'SPEECH_BUBBLE' | 'HEART' | 'PENTAGON';

export type AiPreference = 'auto' | 'gemini' | 'ollama' | 'vertex';
export type AiRuntimeMode = 'gemini' | 'ollama' | 'vertex' | 'unavailable';
export type TranscribeMode = 'faster_whisper' | 'webspeech' | 'record_gemini' | 'gemini_live' | 'upload_audio';

export type DocumentCategory = 'pdf' | 'document' | 'spreadsheet' | 'presentation' | 'text' | 'code' | 'image' | 'other';

export interface AttachedDocument {
  name: string;
  type: string;
  size: number;
  category: DocumentCategory;
  text: string;
  pageCount?: number;
  dataUrl?: string | null;
  previewSnippet?: string;
  wordCount?: number;
}

export type SupportedLanguage = 
  | 'id' // Indonesian (Bahasa Indonesia)
  | 'en' // English (UN)
  | 'ar' // Arabic (UN - العربية)
  | 'zh' // Chinese (UN - 中文)
  | 'fr' // French (UN - Français)
  | 'ru' // Russian (UN - Русский)
  | 'es' // Spanish (UN - Español)
  | 'ja' // Japanese (日本語)
  | 'ko' // Korean (한국어)
  | 'de' // German (Deutsch)
  | 'pt'; // Portuguese (Português)

export interface VoiceConfig {
  autoStopSeconds: number; // 0 = manual, 5, 10, 15, 20, 30, 60
  autoSubmit: boolean; // true = auto send to AI, false = paste to input box for review
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  audioQuality: 'standard' | 'high'; // standard: 16kHz, high: 48kHz Opus
  language: string;
  silenceDetectionTimeout: number; // 0 = off, 1.5, 2, 3, 5 seconds
}

export interface ExperimentalConfig {
  enabled: boolean;
  markmapEnabled: boolean;
  mermaidEnabled: boolean;
  smoothInkingEnabled: boolean;
  visualTimerEnabled: boolean;
  smartShapesEnabled: boolean;
  attendanceEnabled: boolean;
  breakTheLimitAi: boolean;
  autoTaskAutomation: boolean;
  jevModeEnabled: boolean;
}

export type CanvasJson = Record<string, unknown> | unknown[];
export type ViewportTransform = number[];

export interface CanvasObjectData {
  id: string;
  type: string;
  left: number;
  top: number;
  width?: number;
  height?: number;
  radius?: number;
  fill: string;
  angle?: number;
  // Metadata for AI context
  htmlContent?: string; 
  svgContent?: string;
  imageUrl?: string; // For images on canvas
  textContent?: string; // For reading text on canvas
  zIndex?: number;
}

export interface DomElementState {
  id: string;
  html: string;
  componentType?: string;
  config?: any;
  x: number;
  y: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  zIndex: number;
}

export interface PageState {
  canvas: object;
  dom: Record<string, DomElementState>;
  previewDataUrl?: string;
  mindmapNodes?: MindmapNodeRecord[];
}

export interface BoardSession {
  id: string;
  title: string;
  updatedAt: number;
  createdAt: number;
  thumbnail: string;
  sizeBytes: number;
  pages: PageState[];
  messages?: ChatMessage[];
  lessonPlan?: LessonPlan | null;
}

export interface AgentAction {
  id: string;
  type: 'MOVE_CURSOR' | 'CLICK_ELEMENT' | 'DRAG_OBJECT' | 'DRAG_ALL_ELEMENTS' | 'CREATE_SHAPE' | 'CREATE_SVG' | 'EDIT_SVG' | 'RENDER_HTML' | 'EDIT_HTML' | 'CREATE_IMAGE' | 'WRITE_TEXT' | 'DRAW_PATH' | 'RESIZE_OBJECT' | 'MODIFY_PROPERTY' | 'DELETE_OBJECT' | 'REORDER_OBJECT' | 'SELECT_OBJECTS' | 'PAN_CAMERA' | 'RELAYOUT_MINDMAP' | 'REORGANIZE_CANVAS';
  payload: any;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
}

export interface AgentState {
  cursorPosition: Point;
  spatialTarget: Point | null;
  accuracy: number; // 0-100
  isThinking: boolean;
  isActing: boolean;
  isClicking: boolean;
  currentAction: string | null;
  logs: string[];
  agentMessage: string | null; // What the agent is currently "saying"
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  telemetryId?: string;
  tokens?: number;
  latencyMs?: number;
  costIdr?: number;
  model?: string;
  provider?: string;
}

export interface ClassRosterEntry {
  studentId: string;
  displayName: string;
  connected: boolean;
}

export interface ClassStudentRecord extends ClassRosterEntry {
  socketId: string;
}

export interface QuestQuestion {
  question: string;
  options: [string, string, string, string];
  correctAnswerIndex: number;
  explanation: string;
  lessonPart: string;
}

/** Model output. No id, and no laptop API key. */
export interface QuestDraft {
  questTitle: string;
  bossName: string;
  questions: QuestQuestion[];
}

export interface QuestPack extends QuestDraft {
  id: string;
}

export type QuestPlayMode = 'fight' | 'listen';

export interface QuestAttempt {
  studentId: string;
  displayName: string;
  mode: QuestPlayMode;
  runId: string;
  choices: Array<number | null>;
  score: number;
  finished: boolean;
}

export interface StudentAsk {
  id: string;
  displayName: string;
  text: string;
  lessonPart: string;
  /** Filled when the laptop model has answered. Missing until then. */
  answer?: string;
}

/** Counts for the open question. Names are not part of this object. */
export interface QuestTally {
  questId: string;
  openQuestionIndex: number;
  counts: [number, number, number, number];
}

export interface QuestScoreRow {
  displayName: string;
  score: number;
  mode: QuestPlayMode;
}

export interface QuestScoreBoard {
  questId: string;
  scores: QuestScoreRow[];
}

export interface PublicQuestList {
  liveQuestId: string | null;
  liveClosed: boolean;
  quests: QuestPack[];
}

export interface ClassQuestBook {
  quests: QuestPack[];
  liveQuestId: string | null;
  closed: Record<string, boolean>;
  cursor: Record<string, number>;
  attempts: Record<string, Record<string, QuestAttempt>>;
  asks: StudentAsk[];
}

export interface RoomState {
  state: CanvasJson;
  viewports: Record<string, ViewportTransform>;
  lastViewport?: ViewportTransform | null;
  domElements: Record<string, DomElementState>;
  /** Phone rows keyed by studentId. Missing on room files saved before class join. */
  students?: Record<string, ClassStudentRecord>;
  /** True after the teacher presses Start Class. Late joiners still receive it. */
  started?: boolean;
  /** Quest packs and attempts for this class. Missing on older room files. */
  questBook?: ClassQuestBook;
  /** Lesson text the teacher saved. Phones read this. Missing on older room files. */
  lessonNotes?: string;
}

// Socket.IO contract for board collaboration. Hosts emit updates; viewers receive
// current canvas, viewport, and DOM overlay state for the joined room.
export interface ClientToServerEvents {
  // Join or create a collaboration room.
  'join-room': (roomId: string) => void;
  // Replace the room canvas snapshot after a host-side canvas mutation.
  'canvas-update': (payload: { roomId: string; data: CanvasJson }) => void;
  // Send a delta update for a specific object on the canvas.
  'canvas-delta': (payload: { roomId: string; delta: any }) => void;
  // Broadcast camera movement from the host to viewers.
  'viewport-update': (payload: { roomId: string; viewport: ViewportTransform }) => void;
  // Broadcast interactive DOM overlay state from the host to viewers.
  'dom-elements-update': (payload: { roomId: string; domElements: Record<string, DomElementState> }) => void;
  // Phone joins the class. Does not receive canvas state.
  'student-hello': (payload: { roomId: string; studentId: string; displayName: string }) => void;
  // Teacher starts the class for phones already in the room.
  'start-class': (roomId: string) => void;
  // Teacher publishes a quest written on this laptop. The phone cannot send this.
  'open-quest': (payload: { roomId: string; quest: QuestDraft }) => void;
  // Teacher ends the live quest so the board can show names.
  'close-quest': (payload: { roomId: string }) => void;
  // One chosen option for one question. The server counts it.
  'quest-answer': (payload: {
    questId: string;
    questionIndex: number;
    optionIndex: number;
    mode: QuestPlayMode;
    score: number;
    finished: boolean;
    runId: string;
  }) => void;
  // One typed line from a student who is not speaking.
  'student-ask': (payload: { text: string; lessonPart?: string }) => void;
  // Teacher saved the lesson. Phones in the room receive class-notes.
  'class-notes': (payload: { roomId: string; text: string }) => void;
}

export interface ServerToClientEvents {
  // Initial room canvas snapshot sent after joining.
  'canvas-init': (data: CanvasJson) => void;
  // Incremental canvas snapshot broadcast to viewers.
  'canvas-update': (data: CanvasJson) => void;
  // Delta canvas update sent to viewers.
  'canvas-delta': (delta: any) => void;
  // Camera transform broadcast; socketId identifies the emitting host/client.
  'viewport-update': (payload: { socketId: string; viewport: ViewportTransform }) => void;
  // Initial DOM overlay state sent after joining.
  'dom-elements-init': (data: Record<string, DomElementState>) => void;
  // DOM overlay updates broadcast to viewers.
  'dom-elements-update': (data: Record<string, DomElementState>) => void;
  // Reserved for server-side sync validation/reporting failures.
  'sync-error': (payload: { message: string }) => void;
  // Full class list for every socket in the room. Away rows stay, with connected false.
  'class-roster': (roster: ClassRosterEntry[]) => void;
  // Acceptance for the phone that just said hello. Not broadcast to the room.
  'class-welcome': (payload: { roomId: string; studentId: string; displayName: string }) => void;
  // Teacher pressed Start Class. Also sent to a phone that joins after start.
  'class-started': (payload: { roomId: string }) => void;
  // Quest packs for this room. Correct answers travel with the pack. No API key.
  'quest-list': (payload: PublicQuestList) => void;
  // Option counts for the quest the teacher opened. No names.
  'quest-tally': (payload: QuestTally) => void;
  // Names and scores. Sent to the teacher board after the quest is closed.
  'quest-scores': (payload: QuestScoreBoard) => void;
  // Typed lines already on the board when the teacher reconnects.
  'student-questions': (asks: StudentAsk[]) => void;
  // One new typed line for the teacher board.
  'student-question': (ask: StudentAsk) => void;
  // The laptop model's answer for one student question.
  'student-reply': (payload: { id: string; answer: string }) => void;
  // Lesson text saved on the laptop.
  'class-notes': (payload: { text: string }) => void;
}

export interface SocketInterServerEvents {}
export interface SocketData {
  role?: 'board' | 'student';
  studentId?: string;
  roomId?: string;
}

// Global window extension for Fabric
declare global {
  interface Window {
    fabric: any;
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    mermaid: any;
  }
}

export type LessonPhase = 
  | 'planning'
  | 'intro' 
  | 'core'
  | 'practice'
  | 'closing'
  | 'freeform';

export interface LessonPlan {
  id: string;
  subject: string;
  topic: string;
  gradeLevel: string;
  phase: LessonPhase;
  plannedSteps: LessonStep[];
  completedSteps: string[];
  createdAt: number;
}

export interface LessonStep {
  id: string;
  phase: LessonPhase;
  title: string;
  contentType: 'mindmap' | 'flowchart' | 'timeline' | 'comparison' | 'text' | 'quiz' | 'document';
  status: 'planned' | 'created' | 'skipped';
  canvasObjectIds: string[];
  suggestion: string;
}

export interface MindmapNodeRecord {
  text: string;
  style: 'MAIN_TOPIC' | 'SUBTOPIC' | 'DETAIL' | 'HIGHLIGHT';
  parentNodeText: string | null;
  canvasObjectId: string;
  x: number;
  y: number;
}

export interface TelemetryRecord {
  id: string;
  timestamp: string;
  timestampLocal: string;
  sessionId: string;
  endpoint: string;
  provider: 'vertex' | 'gemini' | 'ollama' | 'unknown';
  model: string;
  prompt: string;
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  thinkingTokens: number;
  costUsd: number;
  costIdr: number;
  latencyMs: number;
  status: 'success' | 'error';
  errorCode?: string;
  errorMessage?: string;
  actionsCount: number;
  actionsSummary: string;
  responseTextSnippet: string;
  userRating?: 'good' | 'bad' | 'neutral' | null;
  userFeedback?: string | null;
  canvasObjectsCount?: number;
  domElementsCount?: number;
  sheetSyncStatus: 'synced' | 'pending' | 'failed' | 'disabled';
}

export interface TelemetrySummary {
  totalRequests: number;
  totalPromptTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  totalCostIdr: number;
  avgLatencyMs: number;
  successRate: number;
  providerCounts: Record<string, number>;
  modelCounts: Record<string, number>;
  syncedToSheetCount: number;
  pendingSheetCount: number;
}

export interface TelemetryConfig {
  googleSheetId?: string;
  googleSheetName?: string;
  googleSheetWebhookUrl?: string;
  autoSync: boolean;
}

