import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FilePlus2, Filter, AlertTriangle, Inbox, BarChart2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Sidebar() {
  const location = useLocation();

  const navItems = [
    { name: 'Action Inbox', path: '/inbox', icon: Inbox, count: 4 },
    { name: 'Error Queue', path: '/queue', icon: LayoutDashboard },
    { name: 'Log New Finding', path: '/log-error', icon: FilePlus2 },
    { name: 'Dispute Center', path: '/disputes', icon: AlertTriangle, count: 1 },
    { name: 'Root Cause Metrics', path: '/metrics', icon: BarChart2 },
  ];

  return (
    <div className="w-64 h-full bg-slate-900 text-slate-300 flex flex-col fixed left-0 top-12 bottom-8 z-40 border-r border-slate-800">
      <div className="px-4 mt-6 mb-2">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Master Navigation</div>
      </div>
      
      <nav className="flex-1 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (location.pathname === '/' && item.path === '/queue');
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive 
                  ? "bg-slate-800 text-white" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("w-5 h-5", isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")} />
                {item.name}
              </div>
              {item.count && (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-bold",
                  item.count > 1 ? "bg-rose-500/20 text-rose-400" : "bg-blue-500/20 text-blue-400"
                )}>
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
