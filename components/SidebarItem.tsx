import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, active = false, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.025 }}
    whileTap={{ scale: 0.975 }}
    onClick={onClick}
    className={`relative flex items-center gap-3 w-full px-4 py-3 rounded-full transition-colors cursor-pointer select-none ${
      active ? 'text-[#FBF6F0] font-bold' : 'text-[#6B4423]/80 hover:text-[#3F2A1D] hover:bg-[#F3EBE3] font-medium'
    }`}
  >
    {active && (
      <motion.span
        layoutId="active-sidebar-pill"
        className="absolute inset-0 rounded-full bg-[#6B4423] shadow-md shadow-[#6B4423]/20"
        transition={{ type: 'spring', stiffness: 440, damping: 32 }}
      />
    )}
    <Icon size={19} className={`relative z-10 transition-colors ${active ? 'text-[#F6D7A8]' : 'text-[#6B4423]/80'}`} />
    <span className="relative z-10 text-[14px] tracking-tight">{label}</span>
  </motion.button>
);
