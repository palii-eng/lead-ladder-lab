import { Play } from 'lucide-react';

type Size = 'sm' | 'md' | 'lg';

const sizes: Record<Size, { outer: string; inner: string; icon: string }> = {
  sm: { outer: 'w-8 h-8', inner: 'w-[28px] h-[28px]', icon: 'w-3 h-3' },
  md: { outer: 'w-10 h-10', inner: 'w-[36px] h-[36px]', icon: 'w-4 h-4' },
  lg: { outer: 'w-12 h-12', inner: 'w-[44px] h-[44px]', icon: 'w-5 h-5' },
};

interface VideoBadgeProps {
  url: string;
  title?: string;
  size?: Size;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const VideoBadge: React.FC<VideoBadgeProps> = ({ url, title, size = 'sm', className = '', onClick }) => {
  const s = sizes[size];
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
      title={title ? `Відео: ${title}` : 'Відкрити відео'}
      className={`story-ring rounded-full p-[2px] flex items-center justify-center shrink-0 ${s.outer} ${className}`}
    >
      <span className={`rounded-full bg-card flex items-center justify-center text-primary ${s.inner}`}>
        <Play className={s.icon} fill="currentColor" />
      </span>
    </a>
  );
};

export default VideoBadge;
