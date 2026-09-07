import React from 'react';
import leadOslavImg from '@/assets/leadoslav-avatar.png';

export const LeadOslavAvatar: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <img
    src={leadOslavImg}
    alt="AI LeadОслав"
    className="rounded-full shrink-0 object-cover shadow-sm"
    style={{ width: size, height: size }}
  />
);
