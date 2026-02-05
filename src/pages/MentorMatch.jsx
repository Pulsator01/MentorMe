import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Check, Search, Sparkles } from 'lucide-react';

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
        }, 1500);
    };

    return (
        <div className="flex h-[calc(100vh-140px)] gap-8">
            {/* LEFT COLUMN: Context Input */}
            <div className="w-1/2 p-1">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-plaksha-blue mb-2">Find a Mentor</h2>
                    <p className="text-slate-500">Tell us where you are, and our AI will find the perfect match.</p>
                </div>

                {/* Stage Selector */}
                <div className="mb-8">
                    <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">Current Stage</label>
                    <div className="grid grid-cols-1 gap-2">
                        {stages.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setStage(s.id)}
                                className={`group relative flex items-start p-3 rounded-lg border text-left transition-all
                                    ${stage === s.id
                                        ? 'bg-plaksha-blue text-white border-plaksha-blue shadow-md'
                                        : 'bg-white border-slate-200 text-slate-500 hover:border-plaksha-blue/40'
                                    }`
                                }
                            >
                                <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center mr-3 shrink-0
                                    ${stage === s.id ? 'border-white' : 'border-slate-300'}`}
                                >
                                    {stage === s.id && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                                <div>
                                    <span className={`block text-sm font-bold ${stage === s.id ? 'text-white' : 'text-slate-700'}`}>
                                        {s.title}
                                    </span>
                                    <span className={`block text-xs mt-1 leading-relaxed ${stage === s.id ? 'text-blue-100' : 'text-slate-400'}`}>
                                        {s.desc}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* The Ask */}
                <div className="mb-8">
                    <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">The Ask</label>
                    <textarea
                        className="w-full h-32 p-4 rounded-xl border border-slate-200 focus:border-plaksha-blue focus:ring-1 focus:ring-plaksha-blue outline-none transition-all resize-none text-slate-700 placeholder-slate-300"
                        placeholder="e.g., We need help structuring our Series A pitch deck..."
                    ></textarea>
                </div>

                {/* Artifact Uploader */}
                <div className="mb-8">
                    <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">Artifacts</label>
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 hover:border-plaksha-blue/50 hover:bg-slate-50 transition-all cursor-pointer group">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <Upload size={20} className="text-slate-400 group-hover:text-plaksha-blue" />
                        </div>
                        <p className="text-sm font-medium text-slate-600">Drop Pitch Deck or Canvas</p>
                        <p className="text-xs">PDF, PPTX up to 10MB</p>
                    </div>
                </div>

                <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="w-full py-4 bg-plaksha-blue text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-900 transition-all disabled:opacity-80"
                >
                    {isSearching ? (
                        <>
                            <Sparkles className="animate-spin" size={20} /> Analyzing...
                        </>
                    ) : (
                        <>
                            Search Matches <Search size={20} />
                        </>
                    )}
                </button>
            </div>

            {/* RIGHT COLUMN: AI Recommendations */}
            <div className="w-1/2 bg-slate-100/50 rounded-2xl border border-slate-200 p-8 overflow-y-auto relative">
                {!showResults && !isSearching && (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-center">
                        <div>
                            <Sparkles size={48} className="mx-auto mb-4 opacity-20" />
                            <p>Fill out the details to generate<br />AI-powered matches.</p>
                        </div>
                    </div>
                )}

                {showResults && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-700">Top Recommendations</h3>
                            <span className="text-xs bg-signal-orange/10 text-signal-orange px-3 py-1 rounded-full font-bold">98% Accuracy</span>
                        </div>

                        {/* Holographic Card 1 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-xl p-6 shadow-lg border border-slate-100 relative overflow-hidden group"
                        >
                            {/* Holographic Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none transform -translate-x-full group-hover:translate-x-full" style={{ transitionDuration: '1.5s' }} />

                            <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold">NS</div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">Naval Shah</h4>
                                        <p className="text-xs text-slate-500">FinTech Growth Expert</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-green-600 font-mono">94%</div>
                                    <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Match Score</div>
                                </div>
                            </div>

                            <p className="text-sm text-slate-600 mb-4 bg-slate-50 p-3 rounded italic">
                                "Proven track record in B2B GTM strategies for Series A startups. Can help refine your pitch."
                            </p>

                            <div className="flex gap-2 mb-6">
                                <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 rounded text-slate-600">Fundraising</span>
                                <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 rounded text-slate-600">B2B Sales</span>
                            </div>

                            <button className="w-full py-2 border border-plaksha-blue text-plaksha-blue font-bold rounded hover:bg-plaksha-blue hover:text-white transition-colors">
                                Request Connection
                            </button>
                        </motion.div>

                        {/* Card 2 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 relative overflow-hidden opacity-75 hover:opacity-100 transition-all"
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
                                <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 rounded text-slate-600">Product Market Fit</span>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MentorMatch;
