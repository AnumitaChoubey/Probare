import { useRef, useMemo, useState } from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  getSortedRowModel,
  flexRender, 
  SortingState
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '../../lib/utils';
import { Filter, Search, MoreHorizontal, ArrowUpDown } from 'lucide-react';

// Mock Data Generator
const generateData = (count: number) => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `ERR-${1000 + i}`,
    area: ['Retail Banking', 'Commercial', 'Wealth', 'Credit Cards'][Math.floor(Math.random() * 4)],
    agent: ['John Doe', 'Jane Smith', 'Alice Johnson', 'Bob Williams'][Math.floor(Math.random() * 4)],
    status: ['Logged', 'Under Rebuttal', 'QA Re-Evaluating', 'Closed'][Math.floor(Math.random() * 4)],
    slaHours: Math.floor(Math.random() * 72),
    severity: ['Fatal', 'High', 'Coaching'][Math.floor(Math.random() * 3)],
  }));
};

export default function QueueTable() {
  const [data] = useState(() => generateData(1000));
  const [sorting, setSorting] = useState<SortingState>([]);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const columns = useMemo(() => [
    {
      accessorKey: 'id',
      header: 'Error ID',
      cell: (info: any) => <span className="font-mono text-blue-600 font-semibold">{info.getValue()}</span>,
      size: 100,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (info: any) => {
        const val = info.getValue();
        return (
          <span className={cn(
            "px-2 py-1 rounded text-xs font-bold",
            val === 'Logged' ? "bg-slate-100 text-slate-600" :
            val === 'Under Rebuttal' ? "bg-amber-100 text-amber-700" :
            val === 'Closed' ? "bg-emerald-100 text-emerald-700" :
            "bg-purple-100 text-purple-700"
          )}>
            {val}
          </span>
        );
      },
      size: 150,
    },
    {
      accessorKey: 'slaHours',
      header: 'Aging',
      cell: (info: any) => {
        const hrs = info.getValue() as number;
        return (
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              hrs < 24 ? "bg-emerald-500" : hrs < 48 ? "bg-amber-500" : "bg-rose-500 animate-pulse"
            )} />
            <span className={cn("text-xs font-semibold", hrs >= 48 ? "text-rose-600" : "text-slate-600")}>
              {hrs}h elapsed
            </span>
          </div>
        );
      },
      size: 120,
    },
    {
      accessorKey: 'area',
      header: 'Process Area',
      size: 150,
    },
    {
      accessorKey: 'agent',
      header: 'Agent',
      size: 150,
    },
    {
      accessorKey: 'severity',
      header: 'Severity',
      cell: (info: any) => {
        const val = info.getValue();
        return <span className={cn("text-xs font-bold", val === 'Fatal' ? "text-rose-600" : "text-slate-600")}>{val}</span>;
      },
      size: 100,
    }
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 44, // Exact row height
    overscan: 20,
  });

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* Table Toolbar */}
      <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Filter queue..." className="pl-9 pr-4 py-1.5 text-sm border border-slate-300 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-64" />
          </div>
          <button className="p-1.5 border border-slate-300 rounded-md bg-white text-slate-600 hover:bg-slate-50">
            <Filter className="w-4 h-4" />
          </button>
        </div>
        <div className="text-xs font-semibold text-slate-500">{data.length} records</div>
      </div>

      {/* Virtualized Table Container */}
      <div ref={tableContainerRef} className="flex-1 overflow-auto bg-white custom-scrollbar">
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
          
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 shadow-sm flex text-xs font-bold text-slate-500 uppercase tracking-wider">
            {table.getFlatHeaders().map(header => (
              <div 
                key={header.id} 
                className="px-4 py-3 flex items-center cursor-pointer hover:bg-slate-200 transition-colors select-none"
                style={{ width: header.getSize() }}
                onClick={header.column.getToggleSortingHandler()}
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
                {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? <ArrowUpDown className="w-3 h-3 ml-2 opacity-30" />}
              </div>
            ))}
          </div>

          {/* Virtual Rows */}
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const row = rows[virtualRow.index];
            return (
              <div
                key={row.id}
                className="absolute top-0 left-0 w-full flex border-b border-slate-100 hover:bg-blue-50/50 transition-colors group cursor-pointer"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start + 41}px)`, // Offset by header height
                }}
              >
                {row.getVisibleCells().map(cell => (
                  <div key={cell.id} className="px-4 py-3 text-sm text-slate-700 flex items-center truncate" style={{ width: cell.column.getSize() }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            );
          })}

        </div>
      </div>
    </div>
  );
}
