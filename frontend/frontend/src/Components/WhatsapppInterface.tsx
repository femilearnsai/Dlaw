
import React, { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft, MoreVertical, Phone, Video } from 'lucide-react';
import { type ChatMessage, type DocMetadata } from '../types';
import { sendMessageToBackend } from '../Services/geminiServices';

interface WhatsAppInterfaceProps {
  onExit: () => void;
  documents: DocMetadata[];
}

export const WhatsAppInterface: React.FC<WhatsAppInterfaceProps> = ({ onExit }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Welcome to LexAssist Legal Aid. I can answer questions based on the documents uploaded by your firm. How can I help you today?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate network delay for realism
    setTimeout(async () => {
        try {
            // Call Backend API
            const responseText = await sendMessageToBackend(userMsg.text);
            setMessages(prev => [...prev, { role: 'model', text: responseText }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', text: "Service temporarily unavailable. Check backend connection." }]);
        } finally {
            setIsTyping(false);
        }
    }, 600);
  };

  const formatTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#efeae2] h-[800px] max-h-screen rounded-2xl overflow-hidden shadow-2xl flex flex-col relative border-8 border-gray-800">
        
        {/* Header */}
        <div className="bg-[#075e54] p-3 flex items-center gap-3 text-white shadow-md z-10">
          <button onClick={onExit} className="hover:bg-teal-800 p-1 rounded-full">
            <ArrowLeft size={24} />
          </button>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <img 
                src="https://api.dicebear.com/7.x/bottts/svg?seed=lexassist" 
                alt="Bot" 
                className="w-8 h-8 rounded-full"
            />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-base leading-tight">LexAssist AI</h3>
            <p className="text-xs text-white/80">Business Account</p>
          </div>
          <div className="flex gap-4 pr-2">
            <Video size={20} />
            <Phone size={20} />
            <MoreVertical size={20} />
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
          {/* Encryption Notice */}
          <div className="flex justify-center mb-6">
            <div className="bg-[#fff3cd] text-[#5e5c58] text-[10px] px-3 py-1.5 rounded-lg shadow-sm text-center max-w-[80%]">
              Messages are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
            </div>
          </div>

          <div className="space-y-2">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`
                  max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm relative
                  ${msg.role === 'user' 
                    ? 'bg-[#dcf8c6] text-gray-800 rounded-tr-none' 
                    : 'bg-white text-gray-800 rounded-tl-none'}
                `}>
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                  <div className="text-[10px] text-gray-400 text-right mt-1 flex justify-end items-center gap-1">
                    {formatTime()}
                    {msg.role === 'user' && (
                        <span className="text-blue-400">✓✓</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
                <div className="flex justify-start">
                    <div className="bg-white rounded-lg rounded-tl-none px-4 py-3 shadow-sm">
                        <div className="flex gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                        </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-2 bg-[#f0f0f0] flex items-center gap-2">
            <div className="flex-1 bg-white rounded-full px-4 py-2 shadow-sm flex items-center">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Message"
                    className="flex-1 outline-none text-gray-700 placeholder-gray-400"
                />
            </div>
            <button 
                onClick={handleSend}
                disabled={!input.trim()}
                className="w-10 h-10 bg-[#008f79] text-white rounded-full flex items-center justify-center shadow-sm hover:bg-[#007a68] transition-colors"
            >
                <Send size={20} className="ml-0.5" />
            </button>
        </div>
      </div>
    </div>
  );
};
