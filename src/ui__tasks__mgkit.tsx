import React from 'react';
import { motion } from 'framer-motion';
import { sfx } from './game__audio__audio';
export type GP = { done: () => void; fail?: () => void; assist?: boolean; spot: string; kind: string };
export const R = (n: number) => Math.floor(Math.random() * n);
export const shuffle = <T,>(a: T[]) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = R(i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; };
export const Screen = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => <div className={`relative overflow-hidden rounded-xl border border-[#2a3a6e] bg-[radial-gradient(circle_at_50%_30%,#122046,#070b18)] ${className}`} style={{ boxShadow: 'inset 0 0 30px rgba(0,0,0,.6)' }}>{children}<div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(140,255,220,.08) 0 1px, transparent 1px 3px)' }} /></div>;
export const Pad = ({ children, onClick, active, className = '', disabled }: any) => <motion.button whileTap={{ scale: 0.92 }} disabled={disabled} onClick={() => { sfx('toggle'); onClick?.(); }} className={`rounded-xl border-2 font-display font-bold ${active ? 'border-cyan bg-cyan/30 text-cyan shadow-glow' : 'border-[#3a4a80] bg-[#16204a] text-ink hover:border-cyan/50'} ${disabled ? 'opacity-40' : ''} ${className}`}>{children}</motion.button>;

