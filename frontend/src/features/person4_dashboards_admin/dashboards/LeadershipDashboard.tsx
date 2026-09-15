import { useState, useEffect } from 'react';
import { Activity, TrendingUp, AlertOctagon, ArrowUpRight, BarChart3, Users } from 'lucide-react';

export default function LeadershipDashboard() {
  const [anomalies, setAnomalies] = useState<any[]>([]);

  // Task 25: Fetching the anomalies from the Leadership Dashboard endpoint
  useEffect(() => {
    // Simulating the /dashboards/leadership response for anomalies
    setTimeout(() => {
      setAnomalies([
        {
          id: '1',
          dimension: 'SubCategory',
          value: 'Documentation Missing',
          current_count: 45,
          baseline_avg: 12.5,
          z_score: 3.2,
          confidence_pct: 99.8,
          detected_at: new Date().toISOString()
        }
      ]);
    }, 800);
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Leadership Overview</h1>
          <p className="text-slate-500 mt-1">Real-time macro analytics and AI-driven quality insights.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
          <Activity className="w-4 h-4 text-emerald-500" />
          Live Metrics
        </div>
      </div>

      {/* Task 25: AI Anomalies Widget */}
      {anomalies.length > 0 && (
        <div className="bg-gradient-to-br from-rose-500 to-orange-600 rounded-2xl shadow-lg p-1 relative overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <AlertOctagon className="w-32 h-32 text-white" />
          </div>
          <div className="bg-white/95 backdrop-blur-md rounded-xl p-6 relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-rose-100 rounded-lg text-rose-600 shadow-sm">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">AI Anomalies Detected</h2>
                <p className="text-slate-500 text-sm">Statistical outliers detected against 30-day trailing baselines.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {anomalies.map(anomaly => (
                <div key={anomaly.id} className="bg-white border border-rose-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-1">
                        {anomaly.dimension} Spike
                      </div>
                      <h3 className="text-lg font-bold text-slate-800">{anomaly.value}</h3>
                    </div>
                    <div className="flex items-center gap-1 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-md text-sm font-bold">
                      <TrendingUp className="w-4 h-4" />
                      +{Math.round((anomaly.current_count / anomaly.baseline_avg) * 100 - 100)}%
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                    <div>
                      <div className="text-xs text-slate-400 font-medium mb-0.5">Current</div>
                      <div className="text-lg font-bold text-slate-700">{anomaly.current_count}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-medium mb-0.5">30d Avg</div>
                      <div className="text-lg font-bold text-slate-700">{anomaly.baseline_avg.toFixed(1)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-medium mb-0.5">Z-Score</div>
                      <div className="text-lg font-bold text-rose-600">{anomaly.z_score.toFixed(1)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mock Standard Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Overall Error Rate', val: '2.4%', icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-100' },
          { title: 'Client Impact Ratio', val: '14.2%', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100' },
          { title: 'SLA Adherence', val: '94.8%', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-100' }
        ].map(stat => (
          <div key={stat.title} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-500 mb-1">{stat.title}</div>
              <div className="text-3xl font-bold text-slate-800">{stat.val}</div>
            </div>
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-8 h-8" />
            </div>
          </div>
        ))}
      </div>
      
    </div>
  );
}
