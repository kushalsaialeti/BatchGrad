import React from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { BATCH_YEARS } from '../../constants';

const BatchConfigForm = ({ formData, onChange, onVerify, checking, batchStatus }) => {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-indigo-300">
        <Lock className="w-5 h-5" />
        Batch Configuration
      </h2>

      <form onSubmit={onVerify} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-400">Batch Year</label>
          <select
            name="year"
            required
            value={formData.year}
            onChange={onChange}
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono appearance-none"
          >
            <option value="" disabled>Select Core Batch Year</option>
            {BATCH_YEARS.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Branch</label>
            <input
              required
              name="branch"
              type="text"
              placeholder="e.g. CSE"
              value={formData.branch}
              onChange={onChange}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono uppercase"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Section</label>
            <input
              required
              name="section"
              type="text"
              placeholder="e.g. A"
              value={formData.section}
              onChange={onChange}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono uppercase"
            />
          </div>
        </div>

        {batchStatus === 'entering' && (
          <button
            type="submit"
            disabled={checking}
            className="w-full mt-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {checking ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Directory Setup"}
          </button>
        )}
      </form>
    </div>
  );
};

export default BatchConfigForm;
