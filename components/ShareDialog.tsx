import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, CheckCircle2, QrCode, Wifi, Users } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useStore } from '../store';
import { toast } from '../utils/toast';
import { buildJoinQrValue, isPrivateIpv4, joinedCount } from '../utils/classRoom';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  onStartClass: (roomId: string) => void;
}

interface NetworkInfo {
  primaryIp: string;
  addresses: string[];
  port: number;
  primaryUrl: string;
  hostname: string;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({ isOpen, onClose, roomId, onStartClass }) => {
  const roster = useStore((state) => state.classRoster);
  const connected = joinedCount(roster);
  const [copiedLink, setCopiedLink] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/network-info')
      .then((res) => res.json())
      .then((data: NetworkInfo) => setNetworkInfo(data))
      .catch(() => setNetworkInfo(null));
  }, [isOpen]);

  const laptopHost = networkInfo?.primaryIp || '';
  const laptopPort = networkInfo?.port;
  const laptopAddress = laptopHost && laptopPort ? `${laptopHost}:${laptopPort}` : '';
  const joinQr = networkInfo && laptopPort && isPrivateIpv4(laptopHost) && /^\d{4}$/.test(roomId)
    ? buildJoinQrValue(laptopHost, laptopPort, roomId)
    : '';

  const handleCopyLink = () => {
    const value = joinQr || (laptopAddress ? `Inclu class ${roomId} · ${laptopAddress}` : `Inclu class ${roomId}`);
    navigator.clipboard.writeText(value);
    setCopiedLink(true);
    toast.success('Join link copied');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#3f2a1d]/30 backdrop-blur-xs font-sans">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0"
          />
          <motion.div
            role="dialog"
            aria-labelledby="class-room-title"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex w-full max-w-[920px] max-h-[92vh] flex-col overflow-y-auto rounded-[32px] border border-[#E7DDD2] bg-[#FBF6F0] shadow-2xl z-[101]"
          >
            <div className="flex items-start justify-between gap-4 px-7 pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F6D7A8] text-[#6B4423]">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-[11px] font-black tracking-[0.18em] text-[#C4A484]">Inclu</p>
                  <h3 id="class-room-title" className="text-[28px] font-black leading-none tracking-tight text-[#3F2A1D]">
                    Class room
                  </h3>
                  <p className="mt-1 text-sm font-medium text-[#8A7568]">
                    Join the interactive whiteboard session
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E5F6EA] px-3 py-1.5 text-sm font-bold text-[#1F7A45]">
                  <span className="h-2 w-2 rounded-full bg-[#22A06B]" />
                  {connected} joined
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E7DDD2] bg-[#F3EBE3] text-[#8A7568] cursor-pointer"
                  title="Close"
                >
                  <X size={18} strokeWidth={2.4} />
                </button>
              </div>
            </div>

            <div className="grid gap-4 px-7 pb-5 lg:grid-cols-[250px_minmax(0,1fr)]">
              <div className="flex flex-col items-center gap-3 rounded-[28px] border border-[#E7DDD2] bg-white p-4">
                <div className="flex w-full items-center justify-between text-[10px] font-bold tracking-[0.14em] text-[#8A7568]">
                  <span className="inline-flex items-center gap-1"><QrCode size={12} /> SCAN TO JOIN</span>
                  <span className="rounded-full bg-[#E5F6EA] px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-[#1F7A45]">Auto-connect</span>
                </div>
                <div className="rounded-[24px] border border-[#F0E6DC] bg-[#FFF9F4] p-3">
                  {joinQr ? (
                    <QRCodeSVG value={joinQr} size={196} level="M" fgColor="#4A3428" bgColor="#FFF9F4" />
                  ) : (
                    <div className="flex h-[196px] w-[196px] items-center justify-center px-4 text-center text-xs font-semibold text-[#8A7568]">
                      Waiting for a private Wi-Fi address
                    </div>
                  )}
                </div>
                {joinQr && <span className="sr-only">{joinQr}</span>}
                <p className="max-w-[200px] text-center text-[12px] font-medium leading-snug text-[#8A7568]">
                  Point tablet or phone camera to jump in
                </p>
              </div>

              <div className="flex min-w-0 flex-col gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-[#E7DDD2] bg-[#F7F0E8] px-4 py-3">
                    <div className="text-[10px] font-bold tracking-[0.16em] text-[#8A7568]">CLASS NUMBER</div>
                    <div className="mt-1 text-6xl font-black leading-none tracking-tight text-[#3F2A1D] tabular-nums">
                      {roomId}
                    </div>
                    <p className="mt-2 text-xs text-[#8A7568]">Enter code on tablet</p>
                  </div>
                  <div className="rounded-[22px] border border-[#E7DDD2] bg-[#F7F0E8] px-4 py-3">
                    <div className="text-[10px] font-bold tracking-[0.16em] text-[#8A7568]">LAPTOP ADDRESS</div>
                    <div className="mt-3 inline-flex max-w-full rounded-xl bg-white px-3 py-1.5 text-base font-black text-[#3F2A1D] tabular-nums">
                      <span className="truncate">{laptopAddress || '…'}</span>
                    </div>
                    <p className="mt-3 inline-flex items-center gap-1 text-xs text-[#8A7568]">
                      <Wifi size={12} /> Local Wi-Fi network
                    </p>
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#E7DDD2] bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-black tracking-[0.14em] text-[#3F2A1D]">
                      JOINED
                      <span className="h-2 w-2 rounded-full bg-[#22A06B]" />
                    </div>
                    <div className="text-xs font-medium text-[#8A7568]">
                      Class Attendance ({roster.length})
                    </div>
                  </div>
                  {roster.length > 0 && (
                    <ul className="flex flex-col gap-2" aria-live="polite">
                      {roster.map((student) => {
                        const here = student.connected;
                        return (
                          <li
                            key={student.studentId}
                            className={`flex items-center gap-3 rounded-full border px-3 py-2 ${
                              here ? 'border-[#D7EFE0] bg-[#F4FBF6]' : 'border-[#F3E4C4] bg-[#FFF8EC]'
                            }`}
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F6D7A8] text-sm font-black text-[#6B4423]">
                              {(student.displayName.trim().charAt(0) || '?').toUpperCase()}
                            </span>
                            <span className="min-w-0 flex-1 text-left">
                              <span className="block truncate font-bold text-[#3F2A1D]">
                                {student.displayName}, {here ? 'here' : 'away'}
                              </span>
                              <span className="block text-[11px] text-[#8A7568]">
                                {here ? 'Ready to write' : 'Disconnected'}
                              </span>
                            </span>
                            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                              here ? 'bg-[#DDF5E5] text-[#1F7A45]' : 'bg-[#F8E7C3] text-[#8A5A12]'
                            }`}>
                              {here ? 'Here' : 'Away'}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[#E7DDD2] px-7 py-4">
              <p className="text-xs text-[#8A7568]">
                Students will appear automatically as they enter the code.
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E7DDD2] bg-white px-4 py-2.5 text-sm font-bold text-[#3F2A1D] cursor-pointer"
                >
                  {copiedLink ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  {copiedLink ? 'Copied' : 'Copy Link'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onStartClass(roomId);
                    onClose();
                  }}
                  className="rounded-full bg-[#6B4423] px-5 py-2.5 text-sm font-bold text-[#FBF6F0] cursor-pointer"
                >
                  Start Class →
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ShareDialog;
