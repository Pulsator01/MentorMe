import React from 'react';
import KanbanBoard from '../components/KanbanBoard';

const AdminDashboard = () => {
    return (
        <div className="h-full flex flex-col">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-plaksha-blue mb-1">Control Tower</h2>
                    <p className="text-slate-500">Pipeline Overview & Match Management</p>
                </div>
                <div className="flex gap-4">
                    <div className="text-right">
                        <p className="text-2xl font-bold text-slate-800">12</p>
                        <p className="text-xs text-slate-400 uppercase tracking-widest">Active Requests</p>
                    </div>
                    <div className="w-px bg-slate-200"></div>
                    <div className="text-right">
                        <p className="text-2xl font-bold text-signal-orange">3</p>
                        <p className="text-xs text-slate-400 uppercase tracking-widest">Urgent Actions</p>
                    </div>
                </div>
            </div>

            <KanbanBoard />
        </div>
    );
};

export default AdminDashboard;
