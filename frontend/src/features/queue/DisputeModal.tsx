import { useState } from 'react';
import { X, Play, Pause, Paperclip, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function DisputeModal() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [replyText, setReplyText] = useState('');
  
  // Mock Rebuttal Thread
  const thread = [
    { id: 1, role: 'system', text: 'Error logged against John Doe on Process SOP-104-B.', time: 'Oct 12, 09:41 AM' },
    { id: 2, role: 'qa', author: 'Sarah Jenkins (QA)', text: 'Found missing compliance documentation on the client onboarding packet.', time: 'Oct 12, 09:45 AM' },
    { id: 3, role: 'agent', author: 'John Doe (Agent)', text: 'The document was actually attached in the secondary CRM system as per the new interim guidelines. See attached screenshot.', time: 'Oct 12, 11:20 AM' },
  ];

  return (
    <div className="flex h-[calc(100vh-12rem)] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
      
      {/* Left Panel (Evidence & Details) - 40% */}
      <div className="w-[45%] flex flex-col border-r border-slate-200 bg-slate-50">
        
        {/* Error Metadata */}
        <div className="p-5 border-b border-slate-200 bg-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Process Area: Retail Banking</div>
              <h2 className="text-xl font-bold text-slate-800">#ERR-1042: Missing Compliance Doc</h2>
            </div>
            <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-700 text-xs font-bold">Under Rebuttal</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500 block text-xs">QA Auditor</span><span className="font-semibold text-slate-700">Sarah Jenkins</span></div>
            <div><span className="text-slate-500 block text-xs">Agent</span><span className="font-semibold text-slate-700">John Doe</span></div>
          </div>
        </div>

        {/* Media Previewer */}
        <div className="flex-1 p-5 overflow-y-auto">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Attached Evidence</h3>
          
          {/* Audio Waveform Mock */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Paperclip className="w-4 h-4 text-slate-400" /> call_recording_592.mp3</span>
              <span className="text-xs text-slate-500 font-mono">14:02</span>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setIsPlaying(!isPlaying)} className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <div className="flex-1 h-8 bg-slate-100 rounded overflow-hidden flex items-center px-1">
                {/* Mock Waveform Bars */}
                {Array.from({length: 40}).map((_, i) => (
                  <div key={i} className="flex-1 mx-[1px] bg-blue-300 rounded-full" style={{ height: `${Math.random() * 80 + 20}%` }} />
                ))}
              </div>
            </div>
          </div>

          {/* Image Canvas Mock */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Paperclip className="w-4 h-4 text-slate-400" /> crm_screenshot.png</span>
            </div>
            <div className="w-full h-48 bg-slate-200 rounded flex items-center justify-center text-slate-400 overflow-hidden relative cursor-zoom-in">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300" />
              <span className="relative z-10 text-xs font-semibold">Image Preview (Zoomable)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel (Resolution Hub) - 55% */}
      <div className="flex-1 flex flex-col bg-white">
        
        {/* Audit Timeline Stepper */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center relative">
          <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-slate-200 -z-0 -translate-y-1/2" />
          {['Created', 'Disputed', 'QA Reviewed', 'Closed'].map((step, idx) => (
            <div key={step} className="flex flex-col items-center relative z-10 bg-slate-50 px-2">
              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white mb-1 shadow-sm", idx < 2 ? "bg-blue-500" : "bg-slate-300")}>
                {idx < 2 && <CheckCircle2 className="w-4 h-4" />}
              </div>
              <span className={cn("text-[10px] font-bold uppercase", idx < 2 ? "text-blue-700" : "text-slate-400")}>{step}</span>
            </div>
          ))}
        </div>

        {/* Threaded Conversation */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {thread.map((msg) => (
            <div key={msg.id} className={cn("flex flex-col max-w-[85%]", msg.role === 'agent' ? "ml-auto items-end" : "items-start", msg.role === 'system' && "mx-auto items-center max-w-full")}>
              {msg.role === 'system' ? (
                <div className="bg-slate-100 text-slate-500 text-xs px-3 py-1.5 rounded-full font-medium my-2">
                  {msg.text} • {msg.time}
                </div>
              ) : (
                <>
                  <div className="text-[10px] font-bold text-slate-500 mb-1">{msg.author} • {msg.time}</div>
                  <div className={cn(
                    "px-4 py-3 rounded-2xl text-sm shadow-sm",
                    msg.role === 'agent' ? "bg-blue-600 text-white rounded-tr-sm" : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm"
                  )}>
                    {msg.text}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex gap-3 mb-3">
            <button className="flex-1 bg-white border border-slate-300 text-slate-700 font-semibold py-2 rounded-lg text-sm hover:bg-slate-100 transition-colors shadow-sm">
              Accept Error
            </button>
            <button className="flex-1 bg-amber-100 border border-amber-300 text-amber-800 font-semibold py-2 rounded-lg text-sm hover:bg-amber-200 transition-colors shadow-sm flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" /> Escalate to Manager
            </button>
          </div>
          
          <div className="relative flex items-center">
            <input 
              type="text" 
              className="w-full bg-white border border-slate-300 rounded-full pl-4 pr-12 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
              placeholder="Type your rebuttal or justification..."
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
            />
            <button 
              disabled={!replyText}
              className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square bg-blue-600 rounded-full flex items-center justify-center text-white disabled:opacity-50 hover:bg-blue-700 transition-colors"
            >
              <Send className="w-4 h-4 -ml-0.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
