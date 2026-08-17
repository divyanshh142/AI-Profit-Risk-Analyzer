import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { sendChatMessage } from '../../api/chat';
import type { ChatMessage } from '../../types';
import MessageBubble from './MessageBubble';
import LoadingSpinner from '../ui/LoadingSpinner';

import { useAuth } from '../../context/AuthContext';
import { getStoredDataset } from '../../api/upload';

interface ChatWindowProps {
  offline: boolean;
}

export default function ChatWindow({ offline }: ChatWindowProps) {
  const { user } = useAuth();
  const customDataset = getStoredDataset();
  const isDemoUser = !user?.username || user?.username === 'demo@company.com';
  const hasDataset = Boolean(customDataset?.rows?.length) || isDemoUser;

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: hasDataset
        ? `Hello! I'm your AI Copilot for ${user?.companyName ?? 'your store'}${
            customDataset?.filename ? ` (analyzing ${customDataset.filename})` : ''
          }. Ask me about demand forecasts, return risks, vendor performance, or top profitable SKUs!`
        : `Hello! No dataset has been uploaded for ${user?.companyName ?? 'your store'} yet. Please navigate to the Upload page and submit a CSV file so I can analyze your products, forecasts, and net profit.`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const { reply, offline: isOffline } = await sendChatMessage(
      text,
      user?.companyName,
      customDataset?.filename,
    );
    const prefix = isOffline || offline ? '' : '';
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: prefix + reply,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setLoading(false);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded-xl border border-gray-200 bg-white">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
        ))}
        {loading && (
          <div className="flex justify-start pl-1">
            <LoadingSpinner size="sm" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about demand, returns, vendors, or profit..."
            className="input-field flex-1"
            disabled={loading}
          />
          <button type="submit" className="btn-primary px-3" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
