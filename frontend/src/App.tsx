import { Routes, Route, Navigate } from 'react-router-dom';
import TitleBar from './app/shell/TitleBar';
import Sidebar from './app/shell/Sidebar';
import StatusBar from './app/shell/StatusBar';
import CommandPalette from './app/shell/CommandPalette';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex overflow-hidden">
      <CommandPalette />
      <TitleBar />
      <Sidebar />
      <main className="flex-1 ml-64 mt-12 mb-8 bg-slate-50 relative overflow-hidden flex flex-col h-[calc(100vh-5rem)]">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-center space-y-4 mt-20">
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">QEMS Enterprise Shell</h1>
            <p className="text-slate-500">Master Split View Architecture Loading...</p>
          </div>
        </div>
      </main>
      <StatusBar />
    </div>
  );
}
