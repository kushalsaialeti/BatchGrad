import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export const Button = ({ children, onClick, disabled, loading, variant = 'primary', className = '', type = 'button' }) => {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`btn-${variant} ${className} ${loading ? 'loading' : ''} flex items-center justify-center gap-2`}
    >
      {loading ? <Loader2 className="animate-spin w-5 h-5" /> : children}
    </motion.button>
  );
};

export default Button;
