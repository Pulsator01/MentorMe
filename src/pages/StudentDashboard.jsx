import WarpBackground from '../components/WarpBackground';
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
        <div className="flex flex-col h-full">
            {/* PAGE HEADER */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-plaksha-blue text-white flex items-center justify-center text-sm font-mono">
                            {startup.logo}
                        </div>
                        {startup.name}
                    </h1>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-mono mt-1 ml-11">
                        Incubation Batch '25 • Active Sprint
                    </p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-plaksha-blue transition-all shadow-sm">
                        <Zap size={16} /> Update Progress
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8 flex-1 items-start">

                {/* COLUMN 1: Main Action Area (8 Cols) */}
                <div className="col-span-12 lg:col-span-8 h-full">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 h-full min-h-[500px]">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-plaksha-blue">Action Plan</h2>
                                <p className="text-slate-500 text-sm">Your immediate priorities for the sprint.</p>
                            </div>
                            <span className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase tracking-wide">Week 5</span>
                        </div>
                        <NudgeFeed items={nudges} />
                    </div>
                </div>

                {/* COLUMN 2: Sidebar Context (4 Cols) */}
                <div className="col-span-12 lg:col-span-4 space-y-6">

                    {/* WIDGET 1: Readiness Vitals */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden group">
                        {/* Deep Space Background */}
                        <div className="absolute inset-0 bg-slate-900 opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-0">
                            <WarpBackground speed={0.8} starCount={150} backgroundColor="#0f172a" />
                        </div>

                        <div className="relative z-10">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 group-hover:text-white transition-colors">Readiness Vitals</h3>

                            <div className="flex flex-col items-center justify-center py-4">
                                <ReadinessGauge trl={startup.trl} brl={startup.brl} size="md" />
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4 mb-6">
                                <div className="text-center p-2 bg-slate-50 rounded-lg group-hover:bg-white/10 transition-colors">
                                    <div className="text-xl font-bold text-plaksha-blue group-hover:text-white transition-colors">{startup.trl}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-300">TRL</div>
                                </div>
                                <div className="text-center p-2 bg-slate-50 rounded-lg group-hover:bg-white/10 transition-colors">
                                    <div className="text-xl font-bold text-plaksha-blue group-hover:text-white transition-colors">{startup.brl}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-300">BRL</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* WIDGET 2: Mentors */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Mentors</h3>
                            <button className="text-xs text-plaksha-blue font-bold hover:underline">View All</button>
                        </div>

                        <div className="space-y-3">
                            {mentorRequests.map(req => (
                                <div key={req.id} className="p-3 rounded-lg border border-slate-100 hover:border-plaksha-blue/30 hover:shadow-sm transition-all group bg-white">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-slate-800 text-sm">{req.mentor}</h4>
                                        {req.status === 'Drafting' && <ArrowRight size={14} className="text-slate-300 group-hover:text-plaksha-blue" />}
                                    </div>
                                    <p className="text-xs text-slate-500 mb-2">{req.role}</p>
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase
                                        ${req.status === 'Drafting' ? 'bg-slate-100 text-slate-500' : ''}
                                        ${req.status === 'Pending CFE Review' ? 'bg-orange-50 text-orange-600' : ''}
                                        ${req.status === 'Approved' ? 'bg-green-50 text-green-600' : ''}
                                    `}>
                                        {req.status}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <button className="w-full mt-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-xs hover:border-plaksha-blue hover:text-plaksha-blue transition-all flex items-center justify-center gap-2">
                            + Request New
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
