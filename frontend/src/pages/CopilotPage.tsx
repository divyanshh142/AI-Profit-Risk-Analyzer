import { useAuth } from '../context/AuthContext';
import ChatWindow from '../components/chat/ChatWindow';

export default function CopilotPage() {
  const { user, offline } = useAuth();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Copilot</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ask questions about demand, returns, vendors, and profit for{' '}
          <span className="font-medium text-gray-700">{user?.companyName}</span>.
        </p>
        {offline && (
          <p className="mt-2 text-xs text-amber-600">
            Backend offline — responses use demo data.
          </p>
        )}
      </div>
      <ChatWindow offline={offline} />
    </div>
  );
}
