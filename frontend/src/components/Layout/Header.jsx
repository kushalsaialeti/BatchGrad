import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';

const Header = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center space-y-4 mb-16 text-center"
    >
      <div className="p-4 bg-indigo-500/10 rounded-2xl ring-1 ring-indigo-500/20 backdrop-blur-sm">
        <GraduationCap className="w-12 h-12 text-indigo-400" />
      </div>
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-teal-400">
        BatchGrad Analytics
      </h1>
      <p className="text-muted-foreground max-w-2xl text-lg">
        Real-time intelligent extraction mapped directly via HTTP Streams with a zero-persistence architecture.
      </p>
    </motion.div>
  );
};

export default Header;
