import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, FileText, CheckCircle, Clock } from 'lucide-react';

const NudgeItem = ({ nudge }) => {
    const isUrgent = nudge.status === 'urgent';

    return (
        <div className={`relative pl-8 pb-8 border-l-2 ${isUrgent ? 'border-signal-orange' : 'border-slate-200'}`}>
            {/* Icon Node */}
            <div
                className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 
          ${isUrgent ? 'bg-signal-orange border-white' : 'bg-slate-50 border-slate-300'}
        `}
            />
            {isUrgent && (
                <motion.div
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-signal-orange"
                />
            )}

            {/* Content */}
            <div className={`p-4 rounded-lg border shadow-sm transition-all hover:shadow-md
        ${isUrgent ? 'bg-white border-signal-orange/30' : 'bg-white border-slate-100'}
      `}>
                <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs font-mono uppercase font-bold tracking-wider 
                ${isUrgent ? 'text-signal-orange' : 'text-slate-500'}
            `}>
                        {nudge.time}
                    </span>
                    {isUrgent && <AlertCircle size={14} className="text-signal-orange" />}
                </div>

                <h4 className="font-semibold text-slate-800 text-sm mb-1">{nudge.title}</h4>
                <p className="text-slate-600 text-xs mb-3">{nudge.description}</p>

                {nudge.action && (
                    <button className={`w-full py-2 px-3 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-2
                ${isUrgent
                            ? 'bg-signal-orange text-white hover:bg-orange-600'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
            `}>
                        {nudge.type === 'upload' && <FileText size={12} />}
                        {nudge.type === 'feedback' && <CheckCircle size={12} />}
                        {nudge.action}
                    </button>
                )}
            </div>
        </div>
    );
};

const NudgeFeed = ({ items }) => {
    return (
        <div className="mt-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Clock size={16} /> Action Timeline
            </h3>
            <div>
                {items.map((item) => (
                    <NudgeItem key={item.id} nudge={item} />
                ))}
                <div className="pl-8 text-xs text-slate-400 italic">No further actions required</div>
            </div>
        </div>
    );
};

export default NudgeFeed;
