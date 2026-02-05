import React, { useState } from 'react';
import { Search, UserPlus } from 'lucide-react';

const MentorRow = ({ mentor }) => {
    const [capacity, setCapacity] = useState(mentor.capacity);
    const utilization = (mentor.booked / capacity) * 100;
    const isOverloaded = utilization >= 100;

    return (
        <tr className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${isOverloaded ? 'bg-red-50/50' : ''}`}>
            <td className="p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                        {mentor.initials}
                    </div>
                    <div>
                        <p className="font-bold text-slate-800">{mentor.name}</p>
                        <p className="text-xs text-slate-500">{mentor.domain}</p>
                    </div>
                </div>
            </td>
            <td className="p-4">
                <input
                    type="range"
                    min="1"
                    max="10"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-plaksha-blue"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1 font-mono">
                    <span>Limit: {capacity}/mo</span>
                </div>
            </td>
            <td className="p-4">
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div
                        className={`h-2.5 rounded-full ${isOverloaded ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                    ></div>
                </div>
                <p className="text-xs text-slate-500 mt-1 text-right">{mentor.booked} booked</p>
            </td>
            <td className="p-4 text-center">
                <span className={`px-2 py-1 rounded text-xs font-bold ${isOverloaded ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {isOverloaded ? 'Hidden' : 'Active'}
                </span>
            </td>
        </tr>
    );
};

const MentorPortfolio = () => {
    const mentors = [
        { id: 1, name: 'Naval Shah', initials: 'NS', domain: 'FinTech', capacity: 4, booked: 2 },
        { id: 2, name: 'Sandeep Bhushan', initials: 'SB', domain: 'Product Strategy', capacity: 2, booked: 2 },
        { id: 3, name: 'Dr. R. Gupta', initials: 'RG', domain: 'DeepTech', capacity: 5, booked: 1 },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-plaksha-blue mb-1">Mentor Portfolio</h2>
                    <p className="text-slate-500">Manage capacity and visibility.</p>
                </div>
                <button className="bg-plaksha-blue text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-900 transition-colors">
                    <UserPlus size={18} /> Add Mentor
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-400 font-bold tracking-wider">
                            <th className="p-4">Mentor Profile</th>
                            <th className="p-4 w-1/4">Monthly Capacity</th>
                            <th className="p-4 w-1/4">Utilization</th>
                            <th className="p-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mentors.map(m => <MentorRow key={m.id} mentor={m} />)}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MentorPortfolio;
