import React from 'react';
import { motion } from 'framer-motion';

const ReadinessGauge = ({ trl = 1, brl = 1, size = 'md' }) => {
    const maxLevel = 9;

    // Dimensions
    const sizes = {
        sm: { w: 100, t: 4, r1: 30, r2: 42, f: 'text-xs' },
        md: { w: 160, t: 8, r1: 45, r2: 65, f: 'text-lg' },
        lg: { w: 220, t: 10, r1: 65, r2: 90, f: 'text-2xl' },
    };

    const { w, t, r1, r2, f } = sizes[size];
    const center = w / 2;

    // Calculate circumference
    const c1 = 2 * Math.PI * r1;
    const c2 = 2 * Math.PI * r2;

    // Calculate stroke dashoffset
    const offset1 = c1 - (trl / maxLevel) * c1;
    const offset2 = c2 - (brl / maxLevel) * c2;

    // Color logic
    const getColor = (val) => {
        if (val <= 3) return 'text-red-500 stroke-red-500';
        if (val <= 6) return 'text-signal-yellow stroke-signal-yellow';
        return 'text-green-500 stroke-green-500';
    };

    return (
        <div className="relative flex flex-col items-center justify-center" style={{ width: w, height: w }}>
            <svg width={w} height={w} className="transform -rotate-90">
                {/* Outer Ring Background (BRL) */}
                <circle
                    cx={center}
                    cy={center}
                    r={r2}
                    stroke="currentColor"
                    strokeWidth={t}
                    fill="transparent"
                    className="text-slate-200"
                />
                {/* Outer Ring Progress (BRL) */}
                <motion.circle
                    initial={{ strokeDashoffset: c2 }}
                    animate={{ strokeDashoffset: offset2 }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    cx={center}
                    cy={center}
                    r={r2}
                    stroke="currentColor"
                    strokeWidth={t}
                    fill="transparent"
                    strokeDasharray={c2}
                    strokeLinecap="round"
                    className={`${getColor(brl)}`}
                />

                {/* Inner Ring Background (TRL) */}
                <circle
                    cx={center}
                    cy={center}
                    r={r1}
                    stroke="currentColor"
                    strokeWidth={t}
                    fill="transparent"
                    className="text-slate-200"
                />
                {/* Inner Ring Progress (TRL) */}
                <motion.circle
                    initial={{ strokeDashoffset: c1 }}
                    animate={{ strokeDashoffset: offset1 }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                    cx={center}
                    cy={center}
                    r={r1}
                    stroke="currentColor"
                    strokeWidth={t}
                    fill="transparent"
                    strokeDasharray={c1}
                    strokeLinecap="round"
                    className={`${getColor(trl)}`}
                />
            </svg>

            {/* Legend / Center Text */}
            <div className="absolute flex flex-col items-center justify-center text-center">
                <span className={`font-mono font-bold ${f} ${getColor(trl)}`}>T:{trl}</span>
                <span className={`font-mono font-bold ${f} ${getColor(brl)}`}>B:{brl}</span>
            </div>
        </div>
    );
};

export default ReadinessGauge;
