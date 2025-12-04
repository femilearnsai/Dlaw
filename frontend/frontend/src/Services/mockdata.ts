
import type { DocMetadata, ConversationLog } from '../types';

export const INITIAL_DOCS: DocMetadata[] = [
  {
    doc_id: 'd1',
    file_name: 'Sample_Contract_Law.txt',
    title: 'Sample Contract Principles',
    jurisdiction: 'General',
    year: 2023,
    revision_date: '2023-01-01',
    uploaded_by: 'system',
    uploaded_at: new Date().toISOString(),
    status: 'indexed',
    chunk_count: 12
  }
];

export const MOCK_LOGS: ConversationLog[] = [
  {
    conversation_id: 'c1',
    user_phone: '+234803...123',
    role: 'lawyer',
    query_summary: 'Share capital reduction procedures',
    confidence: 0.92,
    escalated: false,
    timestamp: '2023-12-06T09:12:00Z'
  }
];

export const CHART_DATA = [
  { name: 'Mon', queries: 45, confidence: 85 },
  { name: 'Tue', queries: 52, confidence: 82 },
  { name: 'Wed', queries: 48, confidence: 88 },
  { name: 'Thu', queries: 61, confidence: 79 },
  { name: 'Fri', queries: 55, confidence: 91 },
  { name: 'Sat', queries: 22, confidence: 95 },
  { name: 'Sun', queries: 18, confidence: 94 },
];