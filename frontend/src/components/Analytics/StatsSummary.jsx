import React from 'react';
import { motion } from 'framer-motion';
import { Award, Users } from 'lucide-react';

const StatsSummary = ({ analytics }) => {
  if (!analytics) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="grid grid-cols-2 gap-6"
    >
      <div className="bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-3xl p-6 relative overflow-hidden group">
        <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 blur-3xl group-hover:bg-indigo-500/20 transition-all rounded-full" />
        <div className="flex items-center gap-3 mb-2 text-indigo-300">
          <Award className="w-5 h-5" />
          <span className="font-medium">Batch Average GPA</span>
        </div>
        <p className="text-5xl font-black text-white tracking-tighter">
          {analytics.averageGPA.toFixed(2)}
        </p>
      </div>

      <div className="bg-gradient-to-br from-teal-500/10 to-transparent border border-teal-500/20 rounded-3xl p-6 relative overflow-hidden group">
        <div className="absolute right-0 top-0 w-32 h-32 bg-teal-500/10 blur-3xl group-hover:bg-teal-500/20 transition-all rounded-full" />
        <div className="flex items-center gap-3 mb-2 text-teal-300">
          <Users className="w-5 h-5" />
          <span className="font-medium">Identities Scraped</span>
        </div>
        <p className="text-5xl font-black text-white tracking-tighter">
          {analytics.successfulScrapes}
          <span className="text-xl text-gray-500 font-medium tracking-normal ml-2">/ {analytics.totalAttempted}</span>
        </p>
      </div>
    </motion.div>
  );
};

export default StatsSummary;
