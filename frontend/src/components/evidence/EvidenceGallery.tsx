import React, { useState } from 'react';
import {
  Paperclip,
  Volume2,
  FileCode,
  FileSpreadsheet,
  Play,
  Download,
  ExternalLink,
  Search,
  Filter,
  Eye,
} from 'lucide-react';
import { useQEMS } from '../../context/QEMSContext';
import { EvidenceItem } from '../../types';

export const EvidenceGallery: React.FC = () => {
  const { events, setSelectedEventId, setActiveSection, addToast } = useQEMS();
  const [filterType, setFilterType] = useState<string>('ALL');

  // Collect all evidence items from events
  const allEvidence: (EvidenceItem & { eventId: string; eventTitle: string; sopId: string })[] = [];
  (events || []).forEach((ev) => {
    (ev.evidence || []).forEach((evItem) => {
      allEvidence.push({
        ...evItem,
        eventId: ev.id,
        eventTitle: ev.title,
        sopId: ev.sopId,
      });
    });
  });

  const filteredEvidence = allEvidence.filter((e) => {
    if (filterType === 'ALL') return true;
    return e.type === filterType;
  });

  const openEvent = (id: string) => {
    setSelectedEventId(id);
    setActiveSection('QUALITY EVENTS');
  };

  const handleDownload = (fileName: string) => {
    addToast({
      type: 'info',
      title: 'Evidence Package Downloaded',
      description: `Downloaded ${fileName} with SHA-256 chain of custody hash.`,
    });
  };

  return (
    <div className="p-4 sm:p-5 lg:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
              Chain of Custody
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-600">•</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Audit Evidence Archive
            </span>
          </div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
            Quality Evidence Repository & Media Gallery
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Immutable call recordings, OCR document snapshots, and CRM transaction screenshots with highlighted defect stamps.
          </p>
        </div>

        <div className="flex items-center space-x-1.5 text-xs">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-2.5 py-1.5 rounded font-medium border transition ${
              filterType === 'ALL'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
            }`}
          >
            All Types ({allEvidence.length})
          </button>
          <button
            onClick={() => setFilterType('audio')}
            className={`px-2.5 py-1.5 rounded font-medium border transition ${
              filterType === 'audio'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
            }`}
          >
            Audio Calls
          </button>
          <button
            onClick={() => setFilterType('screenshot')}
            className={`px-2.5 py-1.5 rounded font-medium border transition ${
              filterType === 'screenshot'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
            }`}
          >
            Screenshots
          </button>
          <button
            onClick={() => setFilterType('document')}
            className={`px-2.5 py-1.5 rounded font-medium border transition ${
              filterType === 'document'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
            }`}
          >
            Documents
          </button>
        </div>
      </div>

      {/* Evidence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredEvidence.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 hover:border-slate-300 dark:hover:border-slate-700 transition space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {item.type === 'audio' ? (
                    <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  ) : item.type === 'screenshot' ? (
                    <FileCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  )}
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                    {item.fileName}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{item.fileSize}</span>
              </div>

              {/* Audio Waveform Snippet */}
              {item.type === 'audio' && (
                <div className="bg-slate-950 dark:bg-slate-950 rounded p-2.5 text-white space-y-1.5 border border-slate-800">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="flex items-center space-x-1 text-amber-400">
                      <Play className="w-3 h-3 fill-amber-400" />
                      <span>Timestamp: 04:28</span>
                    </span>
                    <span className="text-[10px] text-amber-300">Defect Marker</span>
                  </div>
                  <div className="flex items-center space-x-1 h-5">
                    {[4, 10, 14, 8, 18, 22, 16, 12, 18, 24, 20, 14, 9, 15, 21, 16, 10, 5].map(
                      (h, i) => (
                        <div
                          key={i}
                          className={`w-1 rounded-full ${
                            i >= 8 && i <= 11 ? 'bg-amber-400' : 'bg-slate-700'
                          }`}
                          style={{ height: `${h}px` }}
                        />
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Screenshot Mock Box */}
              {item.type === 'screenshot' && (
                <div className="bg-slate-50 dark:bg-slate-850 rounded p-2.5 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
                    <span>CRM Payout UI v2026.3</span>
                    <span className="text-rose-600 dark:text-rose-400 font-bold">Bounding Box #1</span>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border border-rose-300 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-[10px]">
                    [!] Mandatory SWIFT field collapsed — input omitted
                  </div>
                </div>
              )}

              {/* Document Mock */}
              {item.type === 'document' && (
                <div className="bg-slate-50 dark:bg-slate-850 rounded p-2.5 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    Referenced Policy Excerpt
                  </div>
                  <div className="text-[11px] font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                    Standard {item.sopId}: Section 4.2 Account Validation Protocol
                  </div>
                </div>
              )}

              <div className="text-xs text-slate-600 dark:text-slate-400 pt-1">
                Linked Case:{' '}
                <button
                  onClick={() => openEvent(item.eventId)}
                  className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {item.eventId}
                </button>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{item.eventTitle}</div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
              <span>By: {item.uploadedBy}</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownload(item.fileName)}
                  className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium flex items-center space-x-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => openEvent(item.eventId)}
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium flex items-center space-x-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>Open Event</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
