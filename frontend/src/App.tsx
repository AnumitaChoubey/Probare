import { Routes, Route, Navigate } from 'react-router-dom';
import TitleBar from './app/shell/TitleBar';
import Sidebar from './app/shell/Sidebar';
import StatusBar from './app/shell/StatusBar';
import CommandPalette from './app/shell/CommandPalette';
import QueueTable from './features/queue/QueueTable';
import NewErrorForm from './features/queue/NewErrorForm';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex overflow-hidden">
      <CommandPalette />
      <TitleBar />
      <Sidebar />
      <main className="flex-1 ml-64 mt-12 mb-8 bg-slate-50 relative overflow-hidden flex flex-col h-[calc(100vh-5rem)]">
        <div className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/queue" replace />} />
            <Route path="/queue" element={<QueueTable />} />
            <Route path="/inbox" element={<div className="p-8">Action Inbox Placeholder</div>} />
            <Route path="/log-error" element={<div className="py-4"><NewErrorForm /></div>} />
            <Route path="/disputes" element={<div className="p-8">Disputes Placeholder</div>} />
            <Route path="/metrics" element={<div className="p-8">Metrics Placeholder</div>} />
          </Routes>
        </div>
      </main>
      <StatusBar />
    </div>
  );
}
