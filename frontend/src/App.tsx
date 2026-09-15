import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { LayoutDashboard, FilePlus2, Filter, AlertTriangle } from 'lucide-react';

// Placeholders for the features we are building
import LogNewErrorForm from './features/person1_foundation/LogNewErrorForm';
import LeadershipDashboard from './features/person4_dashboards_admin/dashboards/LeadershipDashboard';
import FilterBarDemo from './design-system/FilterBarDemo';
import TopBar from './app/shell/TopBar';

const Sidebar = () => (
  <div className="w-64 h-full bg-slate-900 text-slate-300 flex flex-col fixed left-0 top-0 pt-16">
    <div className="p-4 uppercase text-xs font-semibold tracking-wider text-slate-500 mb-2">QEMS Actions</div>
    <Link to="/log-error" className="flex items-center gap-3 px-6 py-3 hover:bg-slate-800 hover:text-white transition-colors">
      <FilePlus2 className="w-5 h-5 text-blue-400" />
      <span>Log New Error</span>
    </Link>
    <Link to="/leadership-dashboard" className="flex items-center gap-3 px-6 py-3 hover:bg-slate-800 hover:text-white transition-colors">
      <LayoutDashboard className="w-5 h-5 text-purple-400" />
      <span>Leadership Dashboard</span>
    </Link>
    <Link to="/filters-export" className="flex items-center gap-3 px-6 py-3 hover:bg-slate-800 hover:text-white transition-colors">
      <Filter className="w-5 h-5 text-green-400" />
      <span>Filters & Export</span>
    </Link>
  </div>
);

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <TopBar />
      <Sidebar />
      <main className="pl-64 pt-16 h-screen overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/log-error" replace />} />
            <Route path="/log-error" element={<LogNewErrorForm />} />
            <Route path="/leadership-dashboard" element={<LeadershipDashboard />} />
            <Route path="/filters-export" element={<FilterBarDemo />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
