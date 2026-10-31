import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Copy,
  CheckCircle2,
  QrCode,
  Wifi,
  Users,
  RefreshCw,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useStore } from '../store';
import { toast } from '../utils/toast';
import {
  buildJoinQrValue,
  isPrivateIpv4,
  joinedCount,
  generateClassNumber,
  RoomSession,
} from '../utils/classRoom';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  savedRooms?: RoomSession[];
  onRefreshRoomId?: (newRoomId: string) => void;
  onSwitchRoom?: (roomId: string) => void;
  onCreateRoom?: (name?: string) => string;
  onDeleteRoom?: (roomId: string) => void;
  onStartClass: (roomId: string) => void;
}

interface NetworkInfo {
  primaryIp: string;
  addresses: string[];
  port: number;
  primaryUrl: string;
  hostname: string;
  wifiSsid?: string;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  isOpen,
  onClose,
  roomId,
  savedRooms = [],
  onRefreshRoomId,
  onSwitchRoom,
  onCreateRoom,
  onDeleteRoom,
  onStartClass,
}) => {
  const roster = useStore((state) => state.classRoster);
  const connected = joinedCount(roster);
  const [activeTab, setActiveTab] = useState<'current' | 'all'>('current');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [showAddress, setShowAddress] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');

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

  const webJoinUrl = laptopAddress ? `http://${laptopAddress}/?room=${roomId}` : '';

  const handleRefreshCode = () => {
    setIsRefreshing(true);
    const newCode = generateClassNumber();
    if (onRefreshRoomId) {
      onRefreshRoomId(newCode);
    }
    toast.success(`Generated new class code: ${newCode}`);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    toast.success(`Class code ${roomId} copied`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    const value = webJoinUrl || joinQr || (laptopAddress ? `Inclu class ${roomId} · ${laptopAddress}` : `Inclu class ${roomId}`);
    navigator.clipboard.writeText(value);
    setCopiedLink(true);
    toast.success('Join link copied');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCreateRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onCreateRoom) {
      const code = onCreateRoom(newRoomName.trim() || undefined);
      if (code) {
        toast.success(`Created and joined classroom: ${code}`);
        setNewRoomName('');
        setActiveTab('current');
      }
    }
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
            className="relative flex w-full max-w-[940px] max-h-[92vh] flex-col overflow-y-auto rounded-[32px] border border-[#E7DDD2] bg-[#FBF6F0] shadow-2xl z-[101]"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-7 pt-6 pb-3 border-b border-[#E7DDD2]/60">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F6D7A8] text-[#6B4423]">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-[11px] font-black tracking-[0.18em] text-[#C4A484]">Inclu</p>
                  <h3 id="class-room-title" className="text-[26px] font-black leading-none tracking-tight text-[#3F2A1D]">
                    Classroom Hub
                  </h3>
                  <p className="mt-1 text-xs font-medium text-[#8A7568]">
                    Manage multiple classrooms & student sessions
                  </p>
                </div>
              </div>

              {/* Navigation Tabs & Close */}
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-full bg-[#EFE6DC] p-1 border border-[#E7DDD2]">
                  <button
                    type="button"
                    onClick={() => setActiveTab('current')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'current'
                        ? 'bg-white text-[#6B4423] shadow-xs'
                        : 'text-[#8A7568] hover:text-[#3F2A1D]'
                    }`}
                  >
                    <QrCode size={13} />
                    <span>Active Session</span>
                    <span className="ml-1 inline-flex items-center rounded-full bg-[#E5F6EA] px-1.5 py-0.2 text-[10px] text-[#1F7A45]">
                      {connected}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'all'
                        ? 'bg-white text-[#6B4423] shadow-xs'
                        : 'text-[#8A7568] hover:text-[#3F2A1D]'
                    }`}
                  >
                    <Layers size={13} />
                    <span>All Rooms</span>
                    <span className="ml-1 inline-flex items-center rounded-full bg-[#F3EBE3] px-1.5 py-0.2 text-[10px] text-[#6B4423]">
                      {savedRooms.length || 1}
                    </span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E7DDD2] bg-[#F3EBE3] text-[#8A7568] hover:text-[#3F2A1D] hover:bg-white transition-colors cursor-pointer"
                  title="Close"
                >
                  <X size={18} strokeWidth={2.4} />
                </button>
              </div>
            </div>

            {/* TAB CONTENT: CURRENT ACTIVE SESSION */}
            {activeTab === 'current' ? (
              <div className="grid gap-4 px-7 py-5 lg:grid-cols-[250px_minmax(0,1fr)]">
                {/* QR Code Card */}
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
                    Point tablet or phone camera to jump into room <strong className="text-[#3F2A1D]">{roomId}</strong>
                  </p>
                </div>

                {/* Room Info & Attendance */}
                <div className="flex min-w-0 flex-col gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Class Number */}
                    <div className="rounded-[22px] border border-[#E7DDD2] bg-[#F7F0E8] px-4 py-3 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-bold tracking-[0.16em] text-[#8A7568]">CLASS CODE</div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleCopyCode}
                            className="flex items-center gap-1 rounded-full px-2 py-1 bg-white hover:bg-[#FFF9F4] text-[#6B4423] text-[11px] font-bold border border-[#E7DDD2] transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
                            title="Copy 4-digit code"
                          >
                            {copiedCode ? <CheckCircle2 size={11} className="text-[#1F7A45]" /> : <Copy size={11} />}
                            <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                          </button>
                          {onRefreshRoomId && (
                            <button
                              type="button"
                              onClick={handleRefreshCode}
                              className="flex items-center gap-1 rounded-full px-2 py-1 bg-white hover:bg-[#FFF9F4] text-[#6B4423] text-[11px] font-bold border border-[#E7DDD2] transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
                              title="Generate new class code"
                            >
                              <RefreshCw size={11} className={isRefreshing ? 'animate-spin' : ''} />
                              <span>New Code</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 text-5xl font-black leading-none tracking-tight text-[#3F2A1D] tabular-nums">
                        {roomId}
                      </div>
                      <p className="mt-2 text-xs text-[#8A7568]">Unique room code for this whiteboard</p>
                    </div>

                    {/* Wi-Fi & Host Network */}
                    <div className="rounded-[22px] border border-[#E7DDD2] bg-[#F7F0E8] px-4 py-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-bold tracking-[0.16em] text-[#8A7568]">
                          <span>CONNECTED WI-FI</span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1F7A45]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#22A06B]" />
                            Active
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E5F6EA] text-[#1F7A45]">
                            <Wifi size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-base sm:text-lg font-black text-[#3F2A1D]" title={networkInfo?.wifiSsid || 'Local Wi-Fi'}>
                              {networkInfo?.wifiSsid || 'Local Wi-Fi Network'}
                            </div>
                            <p className="text-[11px] font-medium text-[#8A7568] -mt-0.5">Students must be on this Wi-Fi</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-[#E7DDD2]/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 text-[11px] font-medium text-[#8A7568]">
                          <span className="font-semibold text-[#6B4423]">Host:</span>
                          {showAddress ? (
                            <span className="font-mono text-xs font-bold text-[#3F2A1D] tabular-nums select-all">
                              {laptopAddress || '127.0.0.1:3000'}
                            </span>
                          ) : (
                            <span className="font-mono tracking-widest text-[#B5A599] select-none text-xs">
                              •••••••••••••••
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAddress(!showAddress)}
                          className="p-1 rounded-md text-[#8A7568] hover:text-[#3F2A1D] hover:bg-white/80 transition-colors cursor-pointer"
                          title={showAddress ? 'Censor laptop address' : 'Reveal laptop address'}
                          aria-label={showAddress ? 'Censor laptop address' : 'Reveal laptop address'}
                        >
                          {showAddress ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Joined Students Roster */}
                  <div className="rounded-[24px] border border-[#E7DDD2] bg-white p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-black tracking-[0.14em] text-[#3F2A1D]">
                        ROOM {roomId} ATTENDANCE
                        <span className="h-2 w-2 rounded-full bg-[#22A06B]" />
                      </div>
                      <div className="text-xs font-medium text-[#8A7568]">
                        {connected} connected · {roster.length} registered
                      </div>
                    </div>
                    {roster.length > 0 ? (
                      <ul className="flex flex-col gap-2 max-h-[160px] overflow-y-auto custom-scrollbar" aria-live="polite">
                        {roster.map((student) => {
                          const here = student.connected;
                          return (
                            <li
                              key={student.studentId}
                              className={`flex items-center gap-3 rounded-full border px-3 py-2 ${
                                here ? 'border-[#D7EFE0] bg-[#F4FBF6]' : 'border-[#F3E4C4] bg-[#FFF8EC]'
                              }`}
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F6D7A8] text-xs font-black text-[#6B4423]">
                                {(student.displayName.trim().charAt(0) || '?').toUpperCase()}
                              </span>
                              <span className="min-w-0 flex-1 text-left">
                                <span className="block truncate font-bold text-xs text-[#3F2A1D]">
                                  {student.displayName}
                                </span>
                                <span className="block text-[10px] text-[#8A7568]">
                                  {here ? 'Active on whiteboard' : 'Disconnected'}
                                </span>
                              </span>
                              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                here ? 'bg-[#DDF5E5] text-[#1F7A45]' : 'bg-[#F8E7C3] text-[#8A5A12]'
                              }`}>
                                {here ? 'Here' : 'Away'}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="py-6 text-center text-xs font-medium text-[#8A7568] bg-[#FBF6F0]/60 rounded-2xl border border-dashed border-[#E7DDD2]">
                        No students in room {roomId} yet. Share the code or scan the QR code to join!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* TAB CONTENT: MANAGE ALL ROOMS (MULTI-ROOM) */
              <div className="px-7 py-5 flex flex-col gap-4">
                {/* Create New Classroom Form */}
                <form
                  onSubmit={handleCreateRoomSubmit}
                  className="flex flex-col sm:flex-row items-center gap-3 p-4 bg-white rounded-[24px] border border-[#E7DDD2] shadow-xs"
                >
                  <div className="flex-1 w-full">
                    <label htmlFor="new-room-name-input" className="block text-[11px] font-bold text-[#8A7568] uppercase tracking-wider mb-1">
                      Create New Classroom
                    </label>
                    <input
                      id="new-room-name-input"
                      type="text"
                      placeholder="e.g. Grade 10 Math, Science Lab, Room B"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-full border border-[#E7DDD2] bg-[#FAF5EE] text-[#3F2A1D] text-sm font-medium placeholder-[#A8988C] outline-none focus:border-[#6B4423] focus:bg-white transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full sm:w-auto mt-2 sm:mt-5 flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#6B4423] hover:bg-[#523319] text-[#FBF6F0] font-bold text-sm transition-all active:scale-95 cursor-pointer shadow-xs shrink-0"
                  >
                    <Plus size={16} />
                    <span>Create Room</span>
                  </button>
                </form>

                {/* Rooms List */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs font-black tracking-wider text-[#8A7568] px-1 uppercase">
                    <span>Active & Saved Classrooms ({savedRooms.length || 1})</span>
                    <span>Click to Switch</span>
                  </div>

                  <div className="grid gap-2.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                    {savedRooms.map((room) => {
                      const isActive = room.id === roomId;
                      return (
                        <div
                          key={room.id}
                          className={`flex items-center justify-between gap-3 p-3.5 rounded-[20px] border transition-all ${
                            isActive
                              ? 'border-[#6B4423] bg-white shadow-xs'
                              : 'border-[#E7DDD2] bg-white/70 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F6D7A8] text-base font-black text-[#6B4423] tabular-nums shadow-xs">
                              {room.id}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-[#3F2A1D] truncate">
                                  {room.name || `Classroom ${room.id}`}
                                </span>
                                {isActive && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E5F6EA] px-2 py-0.5 text-[10px] font-bold text-[#1F7A45]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#22A06B]" />
                                    Active Now
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-[#8A7568]">
                                Code: <strong className="font-mono text-[#6B4423]">{room.id}</strong> · Last active {new Date(room.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isActive ? (
                              <button
                                type="button"
                                onClick={() => setActiveTab('current')}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#EFE6DC] text-[#6B4423] font-bold text-xs hover:bg-[#E7DDD2] transition-colors cursor-pointer"
                              >
                                <span>View QR</span>
                                <ArrowRight size={13} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  onSwitchRoom?.(room.id);
                                  toast.success(`Switched to classroom: ${room.name || room.id}`);
                                  setActiveTab('current');
                                }}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#6B4423] hover:bg-[#523319] text-[#FBF6F0] font-bold text-xs transition-colors cursor-pointer shadow-xs"
                              >
                                <span>Switch</span>
                                <ArrowRight size={13} />
                              </button>
                            )}

                            {savedRooms.length > 1 && !isActive && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Remove room ${room.id} from your saved list?`)) {
                                    onDeleteRoom?.(room.id);
                                    toast.info(`Removed room ${room.id}`);
                                  }
                                }}
                                className="p-2 rounded-full text-[#A08B7A] hover:text-[#B22222] hover:bg-[#FBEAEA] transition-colors cursor-pointer"
                                title="Delete classroom"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E7DDD2] px-7 py-4 bg-[#FAF5EE]/50">
              <p className="text-xs text-[#8A7568]">
                {activeTab === 'current'
                  ? 'Students can join via camera QR scan or by entering code ' + roomId
                  : 'Each classroom has completely isolated whiteboard strokes, quests, and student rosters.'}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E7DDD2] bg-white px-4 py-2 text-sm font-bold text-[#3F2A1D] hover:bg-[#FAF5EE] transition-colors cursor-pointer"
                >
                  {copiedLink ? <CheckCircle2 size={14} className="text-[#1F7A45]" /> : <Copy size={14} />}
                  <span>{copiedLink ? 'Copied' : 'Copy Join Link'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onStartClass(roomId);
                    onClose();
                  }}
                  className="rounded-full bg-[#6B4423] hover:bg-[#523319] px-5 py-2 text-sm font-bold text-[#FBF6F0] transition-colors cursor-pointer shadow-xs"
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
