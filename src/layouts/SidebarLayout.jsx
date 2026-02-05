import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Briefcase, Settings, Zap, BookOpen } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

const SidebarLayout = ({ children }) => {
    const location = useLocation();

    const navItems = [
        { label: 'Build (Student)', path: '/student', icon: Zap, role: 'Student' },
        { label: 'Match (Student)', path: '/student/match', icon: Users, role: 'Student' },
        { label: 'Briefing (Mentor)', path: '/mentor', icon: Briefcase, role: 'Mentor' },
        { label: 'Control Tower (Admin)', path: '/admin', icon: LayoutDashboard, role: 'Admin' },
        { label: 'Mentor Portfolio', path: '/admin/mentors', icon: Users, role: 'Admin' },
        { label: 'Definitions', path: '/admin/definitions', icon: BookOpen, role: 'Admin' },
    ];

    return (
        <div className="flex h-screen bg-slate-50 font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-plaksha-blue text-white flex flex-col shadow-xl z-20">
                <div className="p-6 border-b border-white/10">
                    <h1 className="text-xl font-bold tracking-tight text-white">
                        PLAKSHA<span className="text-signal-orange">COUNSEL</span>
                    </h1>
                    <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Innovation Blueprint</p>
                </div>

                <nav className="flex-1 overflow-y-auto py-4">
                    <div className="px-4 mb-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Navigation</p>
                    </div>
                    <ul className="space-y-1 px-2">
                        {navItems.map((item) => (
                            <li key={item.path}>
                                <NavLink
                                    to={item.path}
                                    end={item.path === '/admin' || item.path === '/student'}
                                    className={({ isActive }) =>
                                        cn(
                                            'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                                            isActive
                                                ? 'bg-signal-orange text-white shadow-md'
                                                : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                        )
                                    }
                                >
                                    <item.icon size={18} />
                                    <span>{item.label}</span>
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-signal-orange flex items-center justify-center font-bold text-xs">
                            US
                        </div>
                        <div>
                            <p className="text-sm font-medium">Test User</p>
                            <p className="text-xs text-slate-400">View as Role</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative">
                <div className="max-w-7xl mx-auto p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default SidebarLayout;
