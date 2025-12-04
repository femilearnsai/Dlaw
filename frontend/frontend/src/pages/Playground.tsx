
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { type ChatMessage, type DocMetadata } from '../types';
import { sendMessageToBackend } from '../Services/geminiServices';

interface PlaygroundProps {
    documents?: DocMetadata[];
}

export const Playground: React.FC<PlaygroundProps> = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hello. I am LexAssist. I am connected to the production backend. Ask a question about the uploaded PDFs.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Call Backend API instead of local logic
      const responseText = await sendMessageToBackend(userMsg.text);
      
      setMessages(prev => [...prev, {
        role: 'model',
        text: responseText
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'model',
        text: "Error: Could not reach the backend server."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      <div className="flex-none">
        <h2 className="text-2xl font-bold text-slate-900">Admin Playground</h2>
        <p className="text-slate-500">Test the RAG response logic against the Supabase Vector Store.</p>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'model' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {msg.role === 'model' ? <Bot size={18} /> : <User size={18} />}
              </div>
              <div className={`max-w-[80%] rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${
                msg.role === 'model' 
                  ? 'bg-slate-50 border border-slate-100 text-slate-800' 
                  : 'bg-indigo-600 text-white'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4">
               <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                  <Bot size={18} />
               </div>
               <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex items-center gap-2 text-slate-500 text-sm">
                  <Loader2 className="animate-spin" size={16} />
                  <span>Querying Supabase Vector Store...</span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask a question..."
              className="w-full pl-4 pr-12 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-600 hover:bg-indigo-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
