import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
  trailing?: React.ReactNode;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  icon: Icon,
  label,
  active = false,
  onClick,
  trailing,
}) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.();
      }
    }}
    className={`group relative flex items-center justify-between w-full px-4 py-2.5 rounded-full transition-all cursor-pointer select-none outline-none ${
      active
        ? 'text-[#FBF6F0] font-bold bg-[#6B4423] shadow-md shadow-[#6B4423]/20'
        : 'text-[#6B4423]/80 hover:text-[#3F2A1D] hover:bg-[#F3EBE3] font-medium'
    }`}
  >
    <div className="flex items-center gap-2 min-w-0">
      <Icon size={19} className={`transition-colors shrink-0 ${active ? 'text-[#F6D7A8]' : 'text-[#6B4423]/80'}`} />
      <span className="text-[14px] tracking-tight">{label}</span>
      {trailing}
    </div>
  </div>
);
