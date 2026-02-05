import React from 'react';
import ReadinessGauge from '../components/ReadinessGauge';
import NudgeFeed from '../components/NudgeFeed';
import { ArrowRight, Zap } from 'lucide-react';

const StudentDashboard = () => {
    // Mock Data
    const startup = {
        name: "EcoDrone Systems",
        logo: "E",
        trl: 4,
        brl: 3
    };

    const nudges = [
        { id: 1, title: 'Mentor Meeting: Naval Shah', time: 'In 2 Hours', description: 'Review the pitch deck and prepare 3 key questions.', status: 'urgent', action: 'Upload Pre-read Docs', type: 'upload' },
        { id: 2, title: 'Weekly Progress Log', time: 'Yesterday', description: 'You haven’t logged your progress for Week 4.', status: 'pending', action: 'Update Log', type: 'feedback' },
        { id: 3, title: 'CFE Review', time: 'Oct 24', description: 'Your MVP submission was approved.', status: 'past' },
    ];

    const mentorRequests = [
        { id: 1, mentor: 'Sandeep Bhushan', role: 'Growth Marketing', status: 'Drafting', date: 'Started 2h ago' },
        { id: 2, mentor: 'Dr. R. Gupta', role: 'Robotics', status: 'Pending CFE Review', date: 'Sent Yesterday' },
    ];

    return (
        <div className="grid grid-cols-12 gap-8">
            {/* COLUMN 1: Vitals (3 Cols) */}
            <div className="col-span-12 lg:col-span-3">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded bg-plaksha-blue text-white flex items-center justify-center font-bold text-xl font-mono">
                            {startup.logo}
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800 leading-tight">{startup.name}</h2>
                            <span className="text-xs text-slate-500 uppercase tracking-wider font-mono">Incubation Batch '25</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-center mb-8">
                        <ReadinessGauge trl={startup.trl} brl={startup.brl} size="md" />
                        <p className="text-xs text-center text-slate-400 mt-4 max-w-[150px]">
                            Current Readiness Levels based on last CFE Audit.
                        </p>
                    </div>

                    <button className="w-full flex items-center justify-center gap-2 py-3 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-plaksha-blue transition-all">
                        <Zap size={16} /> Update Progress
                    </button>
                </div>

                {/* Stats or other quick info could go here */}
            </div>

            {/* COLUMN 2: Nudge Feed (5 Cols) */}
            <div className="col-span-12 lg:col-span-5">
                <div className="bg-white/50 rounded-xl p-6 border border-slate-200/60 backdrop-blur-sm h-full">
                    <div className="mb-4">
                        <h2 className="text-xl font-bold text-plaksha-blue">The Build</h2>
                        <p className="text-slate-500 text-sm">Your immediate action plan.</p>
                    </div>
                    <NudgeFeed items={nudges} />
                </div>
            </div>

            {/* COLUMN 3: Mentor Status (4 Cols) */}
            <div className="col-span-12 lg:col-span-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-700">Mentorship Status</h3>
                        <button className="text-xs text-plaksha-blue font-semibold hover:underline">View All</button>
                    </div>

                    <div className="space-y-4">
                        {mentorRequests.map(req => (
                            <div key={req.id} className="p-4 rounded-lg bg-slate-50 border border-slate-100 hover:border-plaksha-blue/20 transition-colors group">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-semibold text-slate-800 text-sm">{req.mentor}</h4>
                                    <span className={`px-2 py-1 rounded text-[10px] font-mono font-bold uppercase
                                        ${req.status === 'Drafting' ? 'bg-slate-200 text-slate-600' : ''}
                                        ${req.status === 'Pending CFE Review' ? 'bg-orange-100 text-orange-600' : ''}
                                        ${req.status === 'Approved' ? 'bg-green-100 text-green-600' : ''}
                                    `}>
                                        {req.status}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mb-3">{req.role}</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-slate-400 font-mono">{req.date}</span>
                                    {req.status === 'Drafting' && (
                                        <ArrowRight size={14} className="text-slate-300 group-hover:text-plaksha-blue transition-colors" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-100">
                        <div className="p-4 rounded-lg bg-plaksha-light/50 border border-blue-100 text-center">
                            <p className="text-sm text-plaksha-blue font-medium mb-2">Need specific guidance?</p>
                            <button className="w-full py-2 bg-plaksha-blue text-white rounded font-bold text-xs shadow-md hover:shadow-lg hover:bg-blue-900 transition-all">
                                Find a Mentor
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
