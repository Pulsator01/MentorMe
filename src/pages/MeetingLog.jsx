import React, { useState } from 'react';
import { Calendar, CheckCircle, Plus, X } from 'lucide-react';

const MeetingLog = () => {
    const [meetingHappened, setMeetingHappened] = useState(true);
    const [checklist, setChecklist] = useState(['Update financial model']);
    const [newItem, setNewItem] = useState('');

    const addChecklistItem = () => {
        if (newItem.trim()) {
            setChecklist([...checklist, newItem]);
            setNewItem('');
        }
    };

    const removeChecklistItem = (index) => {
        setChecklist(checklist.filter((_, i) => i !== index));
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-8 border-b border-slate-200 pb-8">
                <h2 className="text-3xl font-bold text-plaksha-blue mb-2">Post-Game Analysis</h2>
                <p className="text-slate-500">Log your mentorship session to track progress and unlock next steps.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                {/* Meeting Context */}
                <div className="flex items-center justify-between mb-8 p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-plaksha-light text-plaksha-blue rounded-full flex items-center justify-center">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Naval Shah</h3>
                            <p className="text-sm text-slate-500">Oct 24, 2025 • 2:00 PM</p>
                        </div>
                    </div>
                </div>

                {/* Did it happen? */}
                <div className="mb-8">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Did the meeting happen?</label>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setMeetingHappened(true)}
                            className={`flex-1 py-3 border rounded-lg font-bold transition-all ${meetingHappened ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-slate-200 text-slate-400'}`}
                        >
                            Yes, Completed
                        </button>
                        <button
                            onClick={() => setMeetingHappened(false)}
                            className={`flex-1 py-3 border rounded-lg font-bold transition-all ${!meetingHappened ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-slate-200 text-slate-400'}`}
                        >
                            No, Rescheduled/Missed
                        </button>
                    </div>
                </div>

                {meetingHappened && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Key Takeaways */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Key Takeaways</label>
                            <textarea
                                className="w-full h-32 p-4 rounded-lg border border-slate-200 focus:ring-2 focus:ring-plaksha-blue/20 outline-none text-slate-700 placeholder-slate-300"
                                placeholder="What were the main insights? (e.g., Focus on B2B pilot first...)"
                            ></textarea>
                        </div>

                        {/* Next Steps Checklist */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Next Steps Checklist</label>
                            <div className="bg-slate-50 rounded-lg p-6 border border-slate-100">
                                <ul className="space-y-3 mb-4">
                                    {checklist.map((item, index) => (
                                        <li key={index} className="flex items-center gap-3 bg-white p-3 rounded border border-slate-200 shadow-sm">
                                            <div className="w-5 h-5 rounded-full border-2 border-slate-300"></div>
                                            <span className="flex-1 text-slate-700">{item}</span>
                                            <button onClick={() => removeChecklistItem(index)} className="text-slate-400 hover:text-red-500">
                                                <X size={16} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newItem}
                                        onChange={(e) => setNewItem(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                                        className="flex-1 p-2 rounded border border-slate-300 focus:border-plaksha-blue outline-none"
                                        placeholder="Add actionable item..."
                                    />
                                    <button
                                        onClick={addChecklistItem}
                                        className="bg-plaksha-blue text-white p-2 rounded hover:bg-blue-900 transition-colors"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="flex justify-end pt-4 border-t border-slate-100">
                            <button className="px-8 py-3 bg-plaksha-blue text-white rounded-lg font-bold hover:bg-blue-900 shadow-lg shadow-blue-900/10 transition-all flex items-center gap-2">
                                <CheckCircle size={18} /> Submit Log
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MeetingLog;
