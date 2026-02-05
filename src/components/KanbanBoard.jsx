import React from 'react';
import { MoreHorizontal, MessageSquare, AlertCircle } from 'lucide-react';

const KanbanColumn = ({ title, count, items, color }) => (
    <div className="flex-1 min-w-[300px] bg-slate-100/50 rounded-xl p-4 flex flex-col h-full border border-slate-200">
        <div className={`flex justify-between items-center mb-4 pb-3 border-b border-${color}-200`}>
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{title}</h3>
            <span className={`bg-${color}-100 text-${color}-800 text-xs font-bold px-2 py-1 rounded-full`}>{count}</span>
        </div>

        <div className="space-y-3 overflow-y-auto flex-1 pr-2">
            {items.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md cursor-pointer transition-all group relative">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-slate-400 font-mono">#{item.id}</span>
                        <MoreHorizontal size={14} className="text-slate-300 hover:text-slate-600" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">{item.student}</h4>
                    <p className="text-xs text-slate-500 mb-2 truncate">Target: <span className="text-plaksha-blue font-semibold">{item.mentor}</span></p>

                    <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${item.trl < 4 ? 'bg-red-400' : 'bg-green-400'}`}></span>
                            <span className="text-[10px] font-mono font-bold text-slate-500">TRL {item.trl}</span>
                        </div>
                        {item.urgent && <AlertCircle size={14} className="text-signal-orange" />}
                    </div>

                    {/* Hover Actions */}
                    <div className="absolute inset-0 bg-white/95 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded shadow-sm hover:bg-green-600">Approve</button>
                        <button className="px-3 py-1 bg-red-50 text-red-500 text-xs font-bold rounded border border-red-200 hover:bg-red-100">Reject</button>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const KanbanBoard = () => {
    // Mock Data
    const incoming = [
        { id: 'REC-001', student: 'AgroTech AI', mentor: 'Dr. Gupta', trl: 3, urgent: true },
        { id: 'REC-004', student: 'Urban Flow', mentor: 'S. Bhushan', trl: 2, urgent: false },
    ];

    const review = [
        { id: 'REC-002', student: 'BioSense', mentor: 'Naval Shah', trl: 5, urgent: false },
    ];

    const approved = [
        { id: 'REC-099', student: 'FinFlow', mentor: 'Naval Shah', trl: 7, urgent: false },
    ];

    return (
        <div className="flex gap-6 h-[calc(100vh-200px)] overflow-x-auto pb-4">
            <KanbanColumn title="Incoming Requests" count={2} items={incoming} color="blue" />
            <KanbanColumn title="Under CFE Review" count={1} items={review} color="orange" />
            <KanbanColumn title="Awaiting Mentor" count={1} items={approved} color="green" />
            <KanbanColumn title="Scheduled" count={5} items={[]} color="slate" />
        </div>
    );
};

export default KanbanBoard;
