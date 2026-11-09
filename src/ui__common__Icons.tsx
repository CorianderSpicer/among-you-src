import React from 'react';
const S = (d: string, fill = false) => (p: { size?: number }) => <svg viewBox="0 0 24 24" width={p.size || 28} height={p.size || 28} fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
export const IconUse = S('M8 13V5.5a1.5 1.5 0 013 0V11m0-1V4a1.5 1.5 0 013 0v7m0-5.5a1.5 1.5 0 013 0V12m0-3.5a1.5 1.5 0 013 0V15a6 6 0 01-6 6h-1.5a6 6 0 01-4.6-2.2L4.3 15.5a1.6 1.6 0 012.4-2.1L8 15');
export const IconReport = S('M3 10v4l3 .5V9.5zM6 9.5l11-5v15l-11-5M19 9a3 3 0 010 6M7.5 14.8l1.5 5h3l-1.2-4');
export const IconKill = S('M14.5 3.5l6 6-9.5 9.5-3 1 1-3zM4 20l3.5-3.5M12 6l6 6');
export const IconVent = S('M4 6h16v12H4zM4 9.5h16M4 12.5h16M4 15.5h16');
export const IconSab = S('M13 2L4 14h7l-1 8 9-12h-7z', true);
export const IconMap = S('M9 4L3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5zM9 4v13.5M15 6.5V20');
export const IconChat = S('M4 5h16v11H9l-5 4z');
