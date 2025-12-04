
import type { DocMetadata } from "../types.ts";



// In production, this should be an environment variable
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export const sendMessageToBackend = async (
  query: string
): Promise<string> => {
  try {
    const response = await fetch(`${BACKEND_URL}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error("Backend unavailable");
    }

    const data = await response.json();
    return data.answer;

  } catch (error) {
    console.warn("Backend unavailable, using mock response for demo.");
    return "I do not have sufficient legal information from the backend to answer this query. (System is in Offline Demo Mode).";
  }
};

interface UploadMetadata {
    title: string;
    jurisdiction: string;
    doc_type: string;
    state?: string;
    agency?: string;
}

export const uploadDocumentToBackend = async (
  file: File,
  metadata: UploadMetadata
): Promise<boolean> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", metadata.title);
  formData.append("jurisdiction", metadata.jurisdiction);
  formData.append("doc_type", metadata.doc_type);
  if (metadata.state) formData.append("state", metadata.state);
  if (metadata.agency) formData.append("agency", metadata.agency);

  try {
    const response = await fetch(`${BACKEND_URL}/ingest`, {
      method: "POST",
      body: formData,
    });
    return response.ok;
  } catch (error) {
    console.warn("Backend unreachable during upload. Simulating success for demo.");
    return true; // Return true to allow UI to update optimistically
  }
};

export const fetchDocuments = async (): Promise<DocMetadata[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/documents`);
    if (!response.ok) return [];
    
    const data = await response.json();
    
    // Map Supabase/Backend DB fields to Frontend DocMetadata type
    return data.map((doc: any) => ({
      doc_id: doc.id,
      file_name: doc.file_name,
      title: doc.title,
      jurisdiction: doc.jurisdiction,
      year: new Date(doc.uploaded_at).getFullYear(),
      revision_date: new Date(doc.uploaded_at).toISOString().split('T')[0],
      uploaded_by: 'admin',
      uploaded_at: doc.uploaded_at,
      status: 'indexed',
      chunk_count: 0
    }));
  } catch (error) {
    console.warn("Backend unavailable. Switching to offline mock data.");
    return []; // Return empty array to trigger fallback in App.tsx
  }
};
