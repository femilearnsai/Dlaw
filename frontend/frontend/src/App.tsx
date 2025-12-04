
import React, { useState, useEffect } from 'react';
import { Layout } from './Components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Documents } from './pages/Documents';
import { Logs } from './pages/logs';
import { Playground } from './pages/Playground';
import { type ViewState, type DocMetadata } from './types';
import { INITIAL_DOCS } from './Services/mockdata';
import { fetchDocuments, deleteDocumentFromBackend } from './Services/gemini';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [documents, setDocuments] = useState<DocMetadata[]>([]);
  
  // Load documents from Backend on startup
  useEffect(() => {
    const loadDocs = async () => {
      const docs = await fetchDocuments();
      if (docs && docs.length > 0) {
        setDocuments(docs);
      } else {
        // Fallback to mock data if backend returns empty or fails (Offline Mode)
        console.log("Using Mock Data (Offline Mode)");
        setDocuments(INITIAL_DOCS); 
      }
    };
    loadDocs();
  }, []);

  const handleUpload = (newDoc: DocMetadata) => {
    setDocuments(prev => [newDoc, ...prev]);
  };

  const handleDelete = async (id: string) => {
    // Optimistically update UI, then confirm with backend
    const success = await deleteDocumentFromBackend(id);
    if (success) {
        setDocuments(prev => prev.filter(d => d.doc_id !== id));
    } else {
        alert("Failed to delete document from backend. Please check your connection.");
    }
  };

  return (
    <Layout currentView={currentView} onNavigate={setCurrentView}>
        {currentView === ViewState.DASHBOARD && <Dashboard />}
        {currentView === ViewState.DOCUMENTS && (
            <Documents 
                docs={documents} 
                onUpload={handleUpload}
                onDelete={handleDelete}
            />
        )}
        {currentView === ViewState.LOGS && <Logs />}
        {currentView === ViewState.PLAYGROUND && <Playground documents={documents} />}
    </Layout>
  );
}
