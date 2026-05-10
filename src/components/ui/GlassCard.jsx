import React from 'react';

const GlassCard = ({ children, className = "" }) => (
  <div className={`bg-white/20 backdrop-blur-md border border-white/30 rounded-3xl p-6 shadow-xl ${className}`}>
    {children}
  </div>
);

export default GlassCard;
