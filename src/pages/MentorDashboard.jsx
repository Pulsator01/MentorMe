import React from 'react';
import { Calendar, Video, FileText, CheckCircle, XCircle, ArrowUpRight } from 'lucide-react';

const MentorDashboard = () => {
    // Mock Data
    const requests = [
        {
            id: 1,
            student: 'Arjun K. (EcoDrone)',
            stage: 'MVP',
            ask: 'Need help with Series A narrative and B2B pricing model.',
            matchScore: 94
        },
        {
            id: 2,
            student: 'Sarah L. (MediTech)',
            stage: 'Idea',
            ask: 'Validating the problem statement for rural healthcare.',
            matchScore: 88
        }
    ];

    const schedule = [
        { id: 1, time: 'Today, 2:00 PM', student: 'EcoDrone Systems', topic: 'GTM Strategy', link: '#' },
        { id: 2, time: 'Tomorrow, 11:00 AM', student: 'FinFlow', topic: 'Tech Stack Review', link: '#' },
    ];

    return (
        <div className="flex gap-8 h-full">
            {/* LEFT: Main Feed */}
            <div className="flex-1">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-plaksha-blue mb-1">Good Morning, Naval</h2>
                    <p className="text-slate-500">You have 2 pending requests and 1 meeting today.</p>
                </div>

                {/* INCOMING STACK */}
                <div className="mb-10">
                    <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4">Incoming Requests (CFE Approved)</h3>

                    <div className="space-y-4">
                        {requests.map((req) => (
                            <div key={req.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex gap-6 hover:shadow-md transition-shadow">
                                <div className="w-1/2">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-lg text-slate-800">{req.student}</h4>
                                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{req.stage}</span>
                                    </div>
                                    <p className="text-slate-600 text-sm mb-4">"{req.ask}"</p>
                                    <div className="flex items-center gap-2">
                                        <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100">
                                            <FileText size={14} /> Preview Pitch Deck
                                        </button>
                                        <div className="text-xs text-green-600 font-bold ml-auto">{req.matchScore}% Match</div>
                                    </div>
                                </div>

                                <div className="w-px bg-slate-100"></div>

                                <div className="flex-1 flex flex-col justify-center gap-3">
                                    <button className="w-full py-2 bg-plaksha-blue text-white rounded font-bold text-sm hover:bg-blue-900 transition-colors flex items-center justify-center gap-2">
                                        <CheckCircle size={16} /> Accept & Share Calendly
                                    </button>
                                    <button className="w-full py-2 border border-slate-200 text-slate-500 rounded font-bold text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                                        <XCircle size={16} /> Pass
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* UPCOMING SCHEDULE */}
                <div>
                    <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4">Upcoming Schedule</h3>
                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                        {schedule.map((item) => (
                            <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-orange-100 text-signal-orange flex items-center justify-center">
                                        <Calendar size={20} />
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-slate-700 text-sm">{item.student}</h5>
                                        <p className="text-xs text-slate-500">{item.time} • {item.topic}</p>
                                    </div>
                                </div>
                                <a href={item.link} className="flex items-center gap-2 text-xs font-bold text-plaksha-blue hover:underline">
                                    <Video size={14} /> Join Call <ArrowUpRight size={12} />
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT: Student Profile Snapshot (Sidebar) */}
            <div className="w-80 border-l border-slate-200 pl-8 hidden xl:block">
                <div className="sticky top-8">
                    <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4">Focus: EcoDrone System</h3>
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm font-bold text-slate-700">Progress</span>
                            <span className="text-green-600 text-xs font-bold">+15%</span>
                        </div>
                        {/* Simple timeline visual */}
                        <div className="space-y-4">
                            <div className="flex gap-3 relative">
                                <div className="w-2 h-2 rounded-full bg-slate-300 mt-1.5 z-10"></div>
                                <div className="absolute left-1 top-2 bottom-[-16px] w-px bg-slate-200"></div>
                                <div>
                                    <p className="text-xs font-bold text-slate-600">Initial Idea</p>
                                    <p className="text-[10px] text-slate-400">Aug 2025</p>
                                </div>
                            </div>
                            <div className="flex gap-3 relative">
                                <div className="w-2 h-2 rounded-full bg-signal-orange mt-1.5 z-10"></div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800">MVP Validation</p>
                                    <p className="text-[10px] text-slate-400">Current Phase</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MentorDashboard;
