
export type UserRole = 'admin' | 'lawyer' | 'paralegal' | 'client';

export interface DocMetadata {
  doc_id: string;
  file_name: string;
  title: string;
  jurisdiction: string;
  year: number;
  revision_date: string;
  uploaded_by: string;
  uploaded_at: string;
  status: 'indexed' | 'processing' | 'failed' | 'queued';
  chunk_count: number;
  // textContent removed - we now use Vector DB on backend
}

export interface ConversationLog {
  conversation_id: string;
  user_phone: string;
  role: UserRole;
  query_summary: string;
  confidence: number;
  escalated: boolean;
  timestamp: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  sources?: Array<{
    doc: string;
    section: string;
    page: number;
  }>;
}

export type ViewState = 'dashboard' | 'documents' | 'logs' | 'playground';

export const ViewStateValues = {
  DASHBOARD: 'dashboard' as const,
  DOCUMENTS: 'documents' as const,
  LOGS: 'logs' as const,
  PLAYGROUND: 'playground' as const
} as const;
