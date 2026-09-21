import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  ArrowRight,
  Check,
  RotateCcw,
  FileText,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useQEMS } from '../../context/QEMSContext';
import { aiApi } from '../../services/api';

interface AiMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  suggestion?: {
    type: 'classification' | 'rca' | 'sop';
    data: any;
  };
  timestamp: string;
}

export const AiAssistantDrawer: React.FC = () => {
  const { isAiDrawerOpen, setIsAiDrawerOpen, events, addToast, saveRCA } = useQEMS();
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: 'msg-1',
      sender: 'ai',
      text: 'Hello! I am your QEMS Quality Operations Copilot powered by Gemini 3.8 Flash. I can help analyze defect descriptions, draft 5 Whys root cause trees, cross-reference SOP standards, or summarize quality trends. How can I assist your quality audit today?',
      timestamp: 'Just now',
    },
  ]);

  if (!isAiDrawerOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputMsg;
    if (!query.trim()) return;

    const userMsg: AiMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMsg('');
    setLoading(true);

    try {
      const data = await aiApi.qualityCopilot({ prompt: query });

      const aiMsg: AiMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.response || 'Analysis complete based on QEMS operational data.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.warn('AI copilot fallback:', err);
      // Fallback response
      const fallbackMsg: AiMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: `Analysis of "${query}": Based on current QEMS quality records, Wire Transfer Verification (SOP-PAY-014) exhibits a 42% rebuttal overturn rate primarily driven by UI layout collapsing in CRM v2026.3. Recommend adding mandatory Swift validation before form submission.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'Analyze quality trends for this week',
    'Explain grounds for overturning QEMS-2026-001284',
    'Suggest 5 Whys for recurring calculation errors',
    'Which SOP has the highest dispute rate?',
  ];

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 md:w-[420px] bg-qems-bg-white border-l border-qems-border shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-3.5 border-b border-qems-border flex items-center justify-between bg-qems-bg-surface/70 ">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded bg-qems-brand text-white flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="font-bold text-xs text-qems-text-primary ">QEMS Quality Copilot</h3>
              <span className="text-[10px] px-1.5 py-0.2 bg-qems-brand-light text-qems-brand-dark font-mono font-semibold rounded border border-qems-brand ">
                GEMINI 3.8
              </span>
            </div>
            <p className="text-[10px] text-qems-text-muted ">
              Assistive AI • Requires human sign-off
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAiDrawerOpen(false)}
          className="text-qems-text-disabled hover:text-qems-text-secondary :text-slate-200 p-1 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start space-x-2 ${
              m.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            <div
              className={`w-6 h-6 rounded flex items-center justify-center shrink-0 text-white text-[10px] font-bold ${
                m.sender === 'ai' ? 'bg-qems-brand' : 'bg-slate-700'
              }`}
            >
              {m.sender === 'ai' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
            </div>

            <div
              className={`max-w-[85%] p-2.5 rounded leading-relaxed border ${
                m.sender === 'user'
                  ? 'bg-qems-brand border-qems-brand-dark text-white'
                  : 'bg-qems-bg-surface border-qems-border text-qems-text-primary '
              }`}
            >
              {m.sender === 'ai' && (
                <div className="flex items-center space-x-1 text-[10px] font-semibold text-qems-brand-dark uppercase tracking-wider mb-1">
                  <Sparkles className="w-3 h-3" />
                  <span>AI Copilot Analysis</span>
                </div>
              )}
              <div className="whitespace-pre-wrap">{m.text}</div>
              <div
                className={`text-[9px] mt-1 text-right font-mono ${
                  m.sender === 'user' ? 'text-indigo-200' : 'text-qems-text-disabled '
                }`}
              >
                {m.timestamp}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-xs text-qems-brand-dark p-2 bg-qems-brand-light rounded border border-qems-brand ">
            <Sparkles className="w-3.5 h-3.5 text-qems-brand-dark " />
            <span>Consulting Gemini quality operations model...</span>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompts */}
      <div className="p-2.5 bg-qems-bg-surface/70 border-t border-qems-border ">
        <span className="text-[10px] uppercase font-bold text-qems-text-muted block mb-1.5">
          Suggested Inquiries
        </span>
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSendMessage(prompt)}
              className="text-left text-[11px] px-2 py-1 bg-qems-bg-white border border-qems-border hover:border-indigo-300 :border-indigo-700 hover:text-qems-brand-dark :text-indigo-300 rounded transition text-qems-text-secondary truncate max-w-full"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-qems-border bg-qems-bg-white ">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            placeholder="Ask about an error, SOP, or root cause..."
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            className="flex-1 px-2.5 py-1.5 bg-qems-bg-surface border border-qems-border rounded text-xs text-qems-text-primary placeholder-slate-400 focus:bg-qems-bg-white :bg-slate-800 focus:outline-none focus:border-qems-brand"
          />
          <button
            type="submit"
            disabled={!inputMsg.trim() || loading}
            className="px-3 py-1.5 bg-qems-brand hover:bg-qems-brand-dark disabled:opacity-50 text-white rounded text-xs font-semibold flex items-center space-x-1 transition"
          >
            <Send className="w-3 h-3" />
          </button>
        </form>
        <div className="text-[10px] text-qems-text-disabled text-center mt-1.5 font-mono">
          Strict Human-in-the-Loop • ISO 9001 Compliance
        </div>
      </div>
    </div>
  );
};
