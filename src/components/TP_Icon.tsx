import React from 'react';
import { Zap } from 'lucide-react';

const TP_Icon: React.FC<{ size?: number, className?: string }> = ({ size = 20, className = '' }) => (
  // Using a custom 'tp-icon-bg' color from tailwind.config.js for the dark green background
  <div className={`p-2 rounded-xl bg-tp-icon-bg inline-flex items-center justify-center ${className}`}>
    <Zap size={size} className="text-white" />
  </div>
);

export default TP_Icon;