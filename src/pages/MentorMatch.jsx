import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Check, Search, Sparkles } from 'lucide-react';
import WarpBackground from '../components/WarpBackground';

const MentorMatch = () => {
    const [stage, setStage] = useState(1);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);

    const stages = [
        {
            id: 1,
            label: 'Ideation',
            title: 'Stage 1: Ideation / Concept',
            desc: 'No MVP yet. Focus on problem definition and value proposition. Activities: Research, validation, concept notes.'
        },
        {
            id: 2,
            label: 'MVP',
            title: 'Stage 2: Proof-of-Concept',
            desc: 'MVP built but no revenue. Focus on technical validation and user feedback. Testing in limited environments.'
        },
        {
            id: 3,
            label: 'Traction',
            title: 'Stage 3: Early Traction',
            desc: 'Pilot customers or initial revenue/grants. Validated in real conditions. Focus on UX and early scaling.'
        },
        {
            id: 4,
            label: 'Growth',
            title: 'Stage 4: Growth',
            desc: 'Product-market fit established. Consistent growth. Raising Seed/Series A. Focus on scaling operations.'
        },
    ];

    const handleSearch = () => {
        setIsSearching(true);
        setTimeout(() => {
            setIsSearching(false);
            setShowResults(true);
        }, 3000); // Increased delay to show off the warp speed effect
    };

    return (
        <div className="flex h-[calc(100vh-140px)] gap-8">
            {/* LEFT COLUMN: Context Input */}
            <div className="w-7/12 p-1 flex flex-col h-full">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-plaksha-blue mb-1">Find a Mentor</h2>
                    <p className="text-slate-500 text-sm">Tell us where you are to generate matches.</p>
                </div>

                {/* Stage Selector - 2x2 Grid */}
                <div className="mb-6">
                    <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">Current Stage</label>
                    <div className="grid grid-cols-2 gap-3">
                        {stages.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setStage(s.id)}
                                className={`group relative flex flex-col items-start p-4 rounded-xl border text-left transition-all h-full
                                    ${stage === s.id
                                        ? 'bg-plaksha-blue text-white border-plaksha-blue shadow-md scale-[1.02]'
                                        : 'bg-white border-slate-200 text-slate-500 hover:border-plaksha-blue/40 hover:bg-slate-50'
                                    }`
                                }
                            >
                                <div className="flex items-center justify-between w-full mb-2">
                                    <span className={`block text-xs font-bold uppercase tracking-wider ${stage === s.id ? 'text-blue-200' : 'text-slate-400'}`}>
                                        {s.title.split(':')[0]}
                                    </span>
                                    {stage === s.id && <div className="w-2 h-2 rounded-full bg-signal-orange" />}
                                </div>
                                <span className={`block text-sm font-bold mb-2 ${stage === s.id ? 'text-white' : 'text-slate-800'}`}>
                                    {s.title.split(':')[1].trim()}
                                </span>
                                <p className={`text-[10px] leading-relaxed ${stage === s.id ? 'text-blue-100' : 'text-slate-500'}`}>
                                    {s.desc}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Inputs Section - Composer Layout */}
                <div className="mb-6 flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-0">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">The Ask</label>
                    </div>

                    <textarea
                        className="w-full flex-1 p-4 outline-none resize-none text-slate-700 placeholder-slate-300 text-sm min-h-[100px]"
                        placeholder="Describe your challenge... e.g., We need help structuring our Series A pitch deck."
                    ></textarea>

                    <div className="px-4 py-3 bg-slate-50/30 border-t border-slate-100 flex items-center gap-4">
                        <button className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-plaksha-blue transition-colors group">
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm group-hover:border-plaksha-blue group-hover:shadow-md transition-all">
                                <Upload size={14} />
                            </div>
                            <span>Attach Deck / Canvas</span>
                        </button>
                        <span className="text-[10px] text-slate-400">PDF, PPTX up to 10MB</span>
                    </div>
                </div>

                <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="w-full py-4 bg-plaksha-blue text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-900 transition-all disabled:opacity-80 shadow-lg shadow-blue-900/10"
                >
                    {isSearching ? (
                        <>
                            <Sparkles className="animate-spin" size={20} /> Analyzing Ecosystem...
                        </>
                    ) : (
                        <>
                            Search Matches <Search size={20} />
                        </>
                    )}
                </button>
            </div>

            {/* RIGHT COLUMN: AI Recommendations with Warp Speed */}
            <div className="w-5/12 bg-slate-950 rounded-2xl border border-slate-800 p-8 overflow-y-auto relative overflow-hidden group">
                {/* Background Animation */}
                <WarpBackground />

                {/* Content Overlay */}
                <div className="relative z-10 h-full">
                    {!showResults && !isSearching && (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-center">
                            <div>
                                <div className="w-20 h-20 bg-slate-900/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-800 backdrop-blur-sm">
                                    <Sparkles size={32} className="text-signal-orange animate-pulse" />
                                </div>
                                <h3 className="text-white font-bold text-lg mb-2">Awaiting Mission Paramaters</h3>
                                <p className="text-sm text-slate-500 max-w-[200px] mx-auto">Input your startup details to initiate the match protocol.</p>
                            </div>
                        </div>
                    )}

                    {isSearching && (
                        <div className="absolute inset-0 flex items-center justify-center text-center">
                            <div>
                                <h3 className="text-white font-bold text-2xl mb-2 animate-pulse tracking-widest uppercase">Scanning</h3>
                                <p className="text-signal-orange font-mono text-xs">ANALYZING MENTOR DATABASE...</p>
                            </div>
                        </div>
                    )}

                    {showResults && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-white">Top Recommendations</h3>
                                <span className="text-xs bg-signal-orange/20 text-signal-orange border border-signal-orange/20 px-3 py-1 rounded-full font-bold">98% Accuracy</span>
                            </div>

                            {/* Holographic Card 1 */}
                            <motion.div
                                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ type: "spring", bounce: 0.4 }}
                                className="bg-white/95 backdrop-blur-md rounded-xl p-6 shadow-2xl border border-white/20 relative overflow-hidden group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold border-2 border-slate-100">NS</div>
                                        <div>
                                            <h4 className="font-bold text-slate-900">Naval Shah</h4>
                                            <p className="text-xs text-slate-500">FinTech Growth Expert</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-green-600 font-mono">94%</div>
                                        <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Match Score</div>
                                    </div>
                                </div>

                                <p className="text-sm text-slate-600 mb-4 bg-slate-50 p-3 rounded italic border border-slate-100">
                                    "Proven track record in B2B GTM strategies for Series A startups. Can help refine your pitch."
                                </p>

                                <div className="flex gap-2 mb-6">
                                    <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 rounded text-slate-600 border border-slate-200">Fundraising</span>
                                    <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 rounded text-slate-600 border border-slate-200">B2B Sales</span>
                                </div>

                                <button className="w-full py-2 border border-plaksha-blue text-plaksha-blue font-bold rounded hover:bg-plaksha-blue hover:text-white transition-colors">
                                    Request Connection
                                </button>
                            </motion.div>

                            {/* Card 2 */}
                            <motion.div
                                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ delay: 0.1, type: "spring", bounce: 0.4 }}
                                className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-white/10 relative overflow-hidden hover:bg-white/95 transition-all cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold">SB</div>
                                        <div>
                                            <h4 className="font-bold text-slate-800">Sandeep Bhushan</h4>
                                            <p className="text-xs text-slate-500">Product Strategy</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-plaksha-blue font-mono">88%</div>
                                        <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Match Score</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-[10px] font-bold px-2 py-1 bg-white/50 rounded text-slate-600 border border-slate-200/50">Product Market Fit</span>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MentorMatch;
