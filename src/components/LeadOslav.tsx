import React from 'react';

export const LeadOslavAvatar: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <div
    className="rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-primary to-primary/60 shadow-sm"
    style={{ width: size, height: size, fontSize: size * 0.5 }}
  >
    🦉
  </div>
);
