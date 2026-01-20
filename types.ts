
export interface UserMemoryProfile {
  values: string[];
  personalityTraits: string[];
  mentalModels: string[];
  workHabits: string[];
  decisionPrinciples: string[];
  interests: string[];
  lastUpdated: string;
}

export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  image?: string; // Keep for backward compatibility (preview)
  fileData?: {
    mimeType: string;
    data: string; // Base64
    name: string;
  };
  isThinking?: boolean;
  groundingUrls?: { title: string; uri: string }[];
}

export enum AppView {
  DASHBOARD = 'dashboard',
  CHAT = 'chat',
  VOICE = 'voice',
  TRANSCRIPTION = 'transcription',
  TRANSLATOR = 'translator',
  CREATIVE = 'creative',
  PROMPT_ENGINEER = 'prompt_engineer',
  DECISION_SIM = 'decision_sim',
  GALLERY = 'gallery',
  ABOUT = 'about'
}

export interface GeneratedImage {
  url: string;
  prompt: string;
}

export interface GeneratedVideo {
  url: string;
  prompt: string;
}

export interface DecisionRecord {
  id: string;
  timestamp: string;
  question: string;
  decision: string; // The AI generated decision (Digital Twin)
  expertOpinions?: { role: string; opinion: string; style: string }[]; // New field for expert collision
  contextProfile: UserMemoryProfile; // Snapshot of profile at that time
}

export interface PromptSession {
  id: string;
  title: string;
  timestamp: number;
  dateStr: string;
  messages: ChatMessage[];
  isDeleted?: boolean;
}

export interface ChatSessionRecord {
  id: string;
  title: string;
  timestamp: number;
  dateStr: string;
  messages: ChatMessage[];
}

export interface LiveSessionRecord {
  id: string;
  timestamp: number;
  dateStr: string;
  durationSeconds: number;
  transcript: { role: 'user' | 'model'; text: string }[];
}

export type GalleryItemType = 'image' | 'video';

export interface GalleryItem {
  id: string;
  type: GalleryItemType;
  content: string; // Base64 or Blob URL
  prompt: string;
  timestamp: number; // For sorting
  createdAt: string; // Display string
  cost: number;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  timestamp: number;
  source?: string; // e.g. 'chat', 'voice', 'manual'
}