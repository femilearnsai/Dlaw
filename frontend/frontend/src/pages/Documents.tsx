
import React, { useState } from 'react';
import { Upload, FileText, Trash2, RefreshCw, Search, Filter, Loader2, CheckCircle } from 'lucide-react';
import type { DocMetadata } from '../types.ts';
import { uploadDocumentToBackend } from '../Services/geminiServices';

interface DocumentsProps {
  docs: DocMetadata[];
  onUpload: (newDoc: DocMetadata) => void;
  onDelete: (id: string) => void;
}

type DocType = 'Act' | 'Law' | 'Regulation';

export const Documents: React.FC<DocumentsProps> = ({ docs, onUpload, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Upload Form State
  const [docType, setDocType] = useState<DocType>('Act');
  const [uploadTitle, setUploadTitle] = useState(''); // Name of Law/Regulation
  const [uploadJurisdiction, setUploadJurisdiction] = useState('Nigeria'); // Country
  const [uploadState, setUploadState] = useState('');
  const [uploadAgency, setUploadAgency] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'indexed': return 'bg-emerald-100 text-emerald-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const resetForm = () => {
    setUploadTitle('');
    setUploadState('');
    setUploadAgency('');
    setSelectedFile(null);
    setDocType('Act');
  };

  const handleUploadSubmit = async () => {
    if (!uploadTitle || !selectedFile) {
        alert("Please provide a title and select a PDF file.");
        return;
    }
    
    // Validation for specific types
    if ((docType === 'Law' || docType === 'Regulation') && !uploadState) {
        alert("Please specify the State.");
        return;
    }
    if (docType === 'Regulation' && !uploadAgency) {
        alert("Please specify the Agency name.");
        return;
    }

    setIsUploading(true);
    
    try {
      const metadata = {
        title: uploadTitle,
        jurisdiction: uploadJurisdiction,
        doc_type: docType,
        state: docType !== 'Act' ? uploadState : undefined,
        agency: docType === 'Regulation' ? uploadAgency : undefined
      };

      const success = await uploadDocumentToBackend(selectedFile, metadata);
      
      if (success) {
        // Optimistic UI update
        const newDoc: DocMetadata = {
          doc_id: crypto.randomUUID(),
          file_name: selectedFile.name,
          title: uploadTitle,
          jurisdiction: uploadJurisdiction,
          year: new Date().getFullYear(),
          revision_date: new Date().toISOString().split('T')[0],
          uploaded_by: 'admin',
          uploaded_at: new Date().toISOString(),
          status: 'indexed',
          chunk_count: 0,
        };
        onUpload(newDoc);
        setIsUploadModalOpen(false);
        resetForm();
      } else {
        alert("Failed to upload document to backend.");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading document.");
    } finally {
      setIsUploading(false);
    }
  };

  const filteredDocs = docs.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    doc.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Document Corpus</h2>
          <p className="text-slate-500">Manage documents for the RAG Knowledge Base.</p>
        </div>
        <button 
          onClick={() => setIsUploadModalOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm"
        >
          <Upload size={18} />
          Add Document
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by title or filename..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
          <Filter size={18} />
          <span>Filter</span>
        </button>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Document</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Jurisdiction</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Uploaded</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.map((doc) => (
                <tr key={doc.doc_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{doc.title}</p>
                        <p className="text-xs text-slate-500">{doc.file_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{doc.jurisdiction} ({doc.year})</td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-900">{new Date(doc.uploaded_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                      {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button className="text-slate-400 hover:text-blue-600 p-1 transition-colors" title="Re-index">
                      <RefreshCw size={18} />
                    </button>
                    <button 
                        className="text-slate-400 hover:text-red-600 p-1 transition-colors" 
                        title="Delete"
                        onClick={() => onDelete(doc.doc_id)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredDocs.length === 0 && (
            <div className="p-12 text-center text-slate-500">
                No documents found. Upload a PDF to the backend.
            </div>
        )}
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Upload PDF to Knowledge Base</h3>
            
            <div className="space-y-4">
              
              {/* Document Type Selector */}
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Document Type</label>
                  <div className="flex gap-4">
                      {(['Act', 'Law', 'Regulation'] as DocType[]).map(type => (
                          <button
                            key={type}
                            onClick={() => setDocType(type)}
                            className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                                docType === type 
                                ? 'bg-slate-900 text-white border-slate-900' 
                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {type}
                          </button>
                      ))}
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                    <select 
                        className="w-full border border-slate-300 rounded-lg p-2"
                        value={uploadJurisdiction}
                        onChange={(e) => setUploadJurisdiction(e.target.value)}
                    >
                        <option>Nigeria</option>
                        <option>Kenya</option>
                        <option>South Africa</option>
                        <option>Ghana</option>
                        <option>General</option>
                    </select>
                 </div>

                 {(docType === 'Law' || docType === 'Regulation') && (
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg p-2" 
                            placeholder="e.g. Lagos"
                            value={uploadState}
                            onChange={(e) => setUploadState(e.target.value)}
                        />
                     </div>
                 )}

                 {docType === 'Regulation' && (
                     <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Name of Agency</label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg p-2" 
                            placeholder="e.g. CBN, NAFDAC"
                            value={uploadAgency}
                            onChange={(e) => setUploadAgency(e.target.value)}
                        />
                     </div>
                 )}

                <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        {docType === 'Regulation' ? 'Name of Regulation' : 'Name of Law'}
                    </label>
                    <input 
                        type="text" 
                        className="w-full border border-slate-300 rounded-lg p-2" 
                        placeholder={docType === 'Regulation' ? "e.g. Guidelines for Banking 2023" : "e.g. Companies and Allied Matters Act 2020"}
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                    />
                </div>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center text-center">
                 {!selectedFile ? (
                   <>
                      <Upload className="text-slate-400 mb-2" size={32} />
                      <label className="cursor-pointer">
                        <span className="text-emerald-600 font-medium hover:text-emerald-700">Click to upload</span>
                        <span className="text-slate-500"> or drag and drop</span>
                        <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                      </label>
                      <p className="text-xs text-slate-400 mt-1">PDF files only</p>
                   </>
                 ) : (
                    <div className="flex items-center gap-2 text-emerald-600 font-medium bg-emerald-50 px-4 py-2 rounded-full">
                       <CheckCircle size={18} />
                       {selectedFile.name}
                       <button onClick={() => setSelectedFile(null)} className="ml-2 text-slate-400 hover:text-slate-600">×</button>
                    </div>
                 )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleUploadSubmit}
                disabled={!uploadTitle || !selectedFile || isUploading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUploading && <Loader2 className="animate-spin" size={16} />}
                {isUploading ? 'Uploading...' : 'Upload & Process'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
