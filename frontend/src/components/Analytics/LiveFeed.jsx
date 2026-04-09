import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TerminalSquare } from 'lucide-react';

const LiveFeed = ({ rows, loading, processedCount, totalCount, elapsedTime }) => {
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!loading && rows.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full min-h-[400px] border border-white/5 rounded-3xl bg-[#0a0f18] flex flex-col items-center justify-center p-8"
    >
      <div className="text-center mb-8">
        <div className="relative mb-6 inline-block">
          <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-teal-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-teal-400 font-bold">
            {totalCount > 0 ? `${Math.round((processedCount / totalCount) * 100)}%` : '0%'}
          </div>
        </div>
        <h3 className="text-xl font-bold text-teal-300">Extraction in Progress</h3>
        <p className="text-gray-400 font-mono mt-1 text-sm bg-black/40 px-3 py-1 rounded inline-block border border-white/5">
          Processed: {processedCount} / {totalCount || '?'} Queries
        </p>
        <div className="mt-3 text-emerald-400/80 font-mono flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Elapsed Time: {formatTime(elapsedTime)}
        </div>
      </div>

      <div className="w-full max-w-2xl bg-black border border-white/10 rounded-xl overflow-hidden font-mono text-xs">
        <div className="bg-gray-900 border-b border-white/10 px-4 py-2 flex items-center gap-2 text-gray-400">
          <TerminalSquare className="w-4 h-4" />
          Live Extraction Feed (Top 10)
        </div>
        <div className="p-4 h-48 overflow-y-auto space-y-2 flex flex-col justify-end text-emerald-400/90 tracking-wide">
          {rows.length === 0 && <span className="opacity-50 blur-[0.5px]">Waiting for raw pipeline buffers...</span>}
          <AnimatePresence>
            {rows.map((row, idx) => (
              <motion.div
                key={`${row.regNo}-${idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="border-b border-emerald-900/30 pb-1 flex gap-4"
              >
                <span className="text-indigo-400 font-bold shrink-0">[{row.regNo}]</span>
                <span className="truncate flex-1">{row.subject}</span>
                <span className="text-white bg-white/10 px-2 rounded shrink-0">{row.grade}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default LiveFeed;
