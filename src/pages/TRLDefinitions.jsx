import React, { useState } from 'react';
import { ChevronDown, ChevronRight, BookOpen, Globe, Rocket } from 'lucide-react';

const DefinitionItem = ({ level, nasa, eu, isOpen, toggle }) => (
    <div className="border border-slate-200 rounded-lg mb-3 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
        <button
            onClick={toggle}
            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
            <div className="flex items-center gap-4">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono text-sm shadow-sm
                    ${isOpen ? 'bg-plaksha-blue text-white' : 'bg-white border border-slate-200 text-slate-600'}
                `}>
                    {level}
                </span>
                <div>
                    <span className="font-bold text-slate-700 block text-sm">TRL {level}</span>
                    {!isOpen && <span className="text-xs text-slate-500 truncate max-w-md block">{nasa}</span>}
                </div>
            </div>
            {isOpen ? <ChevronDown size={20} className="text-plaksha-blue" /> : <ChevronRight size={20} className="text-slate-400" />}
        </button>

        {isOpen && (
            <div className="p-0 text-sm border-t border-slate-100 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                    {/* NASA Column */}
                    <div className="p-4 bg-blue-50/30">
                        <div className="flex items-center gap-2 mb-2 text-plaksha-blue font-bold text-xs uppercase tracking-wider">
                            <Rocket size={14} /> NASA Standard
                        </div>
                        <p className="text-slate-700 leading-relaxed">{nasa}</p>
                    </div>

                    {/* EU Column */}
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
                            <Globe size={14} /> European Union
                        </div>
                        <p className="text-slate-700 leading-relaxed">{eu}</p>
                    </div>
                </div>
            </div>
        )}
    </div>
);

const TRLDefinitions = () => {
    const [openIndex, setOpenIndex] = useState(0);

    const definitions = [
        {
            level: 1,
            nasa: "Basic principles observed and reported",
            eu: "Basic principles observed"
        },
        {
            level: 2,
            nasa: "Technology concept and/or application formulated",
            eu: "Technology concept formulated"
        },
        {
            level: 3,
            nasa: "Analytical and experimental critical function and/or characteristic proof-of concept",
            eu: "Experimental proof of concept"
        },
        {
            level: 4,
            nasa: "Component and/or breadboard validation in laboratory environment",
            eu: "Technology validated in lab"
        },
        {
            level: 5,
            nasa: "Component and/or breadboard validation in relevant environment",
            eu: "Technology validated in relevant environment (industrially relevant environment in the case of key enabling technologies)"
        },
        {
            level: 6,
            nasa: "System/subsystem model or prototype demonstration in a relevant environment (ground or space)",
            eu: "Technology demonstrated in relevant environment (industrially relevant environment in the case of key enabling technologies)"
        },
        {
            level: 7,
            nasa: "System prototype demonstration in a space environment",
            eu: "System prototype demonstration in operational environment"
        },
        {
            level: 8,
            nasa: "Actual system completed and \"flight qualified\" through test and demonstration (ground or space)",
            eu: "System complete and qualified"
        },
        {
            level: 9,
            nasa: "Actual system \"flight proven\" through successful mission operations",
            eu: "Actual system proven in operational environment (competitive manufacturing in the case of key enabling technologies; or in space)"
        },
    ];

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <div className="flex items-center gap-3 mb-8">
                <BookOpen className="text-plaksha-blue" size={32} />
                <div>
                    <h2 className="text-2xl font-bold text-plaksha-blue mb-1">Definition Master</h2>
                    <p className="text-slate-500">Global Standards for Technology Readiness.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                    <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider">Comparitive Standards</h3>
                    <div className="flex gap-4 text-xs font-bold">
                        <span className="flex items-center gap-1 text-plaksha-blue"><Rocket size={12} /> NASA</span>
                        <span className="flex items-center gap-1 text-indigo-600"><Globe size={12} /> EU</span>
                    </div>
                </div>

                {definitions.map((def, idx) => (
                    <DefinitionItem
                        key={def.level}
                        {...def}
                        isOpen={openIndex === idx}
                        toggle={() => setOpenIndex(idx === openIndex ? -1 : idx)}
                    />
                ))}
            </div>
        </div>
    );
};

export default TRLDefinitions;
