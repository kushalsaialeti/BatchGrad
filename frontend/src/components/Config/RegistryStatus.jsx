import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Upload, Loader2 } from 'lucide-react';

const RegistryStatus = ({ status, onUpload, onUpdateRegistry, uploading, excelFile, setExcelFile }) => {
  return (
    <AnimatePresence mode="popLayout">
      {status === 'needs_upload' && (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6 p-5 bg-teal-500/10 border border-teal-500/20 rounded-xl"
        >
            <h4 className="text-sm font-semibold text-teal-300 mb-2 flex flex-row items-center gap-2">
                <Upload className="w-4 h-4" /> Roster Not Found
            </h4>
            <p className="text-xs text-teal-200/70 mb-4 font-mono">
                Upload an Excel sheet identifying the target batch. The scraper seeks the column named <b>redg_no</b> starting from row 2 until it hits an empty block.
            </p>
            <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-500/20 file:text-teal-400 hover:file:bg-teal-500/30 mb-4 transition-colors"
            />
            <button
                onClick={onUpload}
                disabled={uploading || !excelFile}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium py-2.5 px-4 rounded-lg shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Index Batch Records"}
            </button>
        </motion.div>
      )}

      {status === 'ready' && (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6"
        >
            <div className="flex items-center justify-between text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg mb-6">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">Registry linked.</span>
                </div>
                <button 
                  onClick={onUpdateRegistry} 
                  type="button" 
                  className="text-xs hover:text-emerald-300 underline underline-offset-2"
                >
                  Update registry
                </button>
            </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RegistryStatus;
