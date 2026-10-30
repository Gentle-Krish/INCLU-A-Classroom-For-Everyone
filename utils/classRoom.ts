// Pure classroom-join helpers. The phone app depends on these shapes:
// QR `chalk://join?host=&port=&room=`, UDP beacon `{ room, classNumber, port }`,
// and roster rows `{ studentId, displayName, connected }`.

import type { ClassRosterEntry, ClassStudentRecord } from '../types';

export interface LanInterfaceAddress {
  address: string;
  netmask?: string;
  family: string | number;
  internal?: boolean;
}

export type LanInterfaceMap = Record<string, LanInterfaceAddress[] | undefined>;

export type { ClassRosterEntry, ClassStudentRecord };

export interface StudentHello {
  roomId: string;
  studentId: string;
  displayName: string;
}

export const CLASS_BEACON_PORT = 3031;
export const CLASS_BEACON_INTERVAL_MS = 2000;
export const CLASS_NAME_MAX = 40;
export const STUDENT_ID_MAX = 64;

const VIRTUAL_ADAPTER = /vEthernet|WSL|Hyper-V|VirtualBox|docker/i;
const WIFI_ADAPTER = /wi-?fi|wlan|wireless/i;

export function isVirtualAdapterName(name: string): boolean {
  return VIRTUAL_ADAPTER.test(name);
}

export function isWifiAdapterName(name: string): boolean {
  return WIFI_ADAPTER.test(name);
}

export function isPrivateIpv4(address: string): boolean {
  const parts = address.split('.');
  if (parts.length !== 4) return false;
  const nums = parts.map((part) => Number(part));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = nums;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

export function isLinkLocalIpv4(address: string): boolean {
  return address.startsWith('169.254.');
}

function isIpv4Family(family: string | number): boolean {
  return family === 'IPv4' || family === 4;
}

function usablePrivateIpv4(iface: LanInterfaceAddress): boolean {
  if (!isIpv4Family(iface.family) || iface.internal) return false;
  if (!iface.address || isLinkLocalIpv4(iface.address)) return false;
  return isPrivateIpv4(iface.address);
}

/** Private Wi-Fi IPv4 first, then other private LAN addresses. Skips virtual adapters. */
export function listLanIpv4(interfaces: LanInterfaceMap): string[] {
  const wifi: string[] = [];
  const other: string[] = [];
  for (const name of Object.keys(interfaces)) {
    if (isVirtualAdapterName(name)) continue;
    const bucket = isWifiAdapterName(name) ? wifi : other;
    for (const iface of interfaces[name] ?? []) {
      if (usablePrivateIpv4(iface)) bucket.push(iface.address);
    }
  }
  return [...wifi, ...other];
}

export function pickLanIpv4(interfaces: LanInterfaceMap): string | null {
  return listLanIpv4(interfaces)[0] ?? null;
}

export function directedBroadcast(address: string, netmask: string): string | null {
  const ip = address.split('.');
  const mask = netmask.split('.');
  if (ip.length !== 4 || mask.length !== 4) return null;
  const ipNums = ip.map((part) => Number(part));
  const maskNums = mask.map((part) => Number(part));
  if ([...ipNums, ...maskNums].some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return ipNums.map((octet, i) => (octet | (~maskNums[i] & 0xff)) & 0xff).join('.');
}

/** Subnet broadcasts for real private interfaces, Wi-Fi first. Limited broadcast is the fallback. */
export function lanBroadcastAddresses(interfaces: LanInterfaceMap): string[] {
  const wifi: string[] = [];
  const other: string[] = [];
  for (const name of Object.keys(interfaces)) {
    if (isVirtualAdapterName(name)) continue;
    const bucket = isWifiAdapterName(name) ? wifi : other;
    for (const iface of interfaces[name] ?? []) {
      if (!usablePrivateIpv4(iface) || !iface.netmask) continue;
      const broadcast = directedBroadcast(iface.address, iface.netmask);
      if (broadcast) bucket.push(broadcast);
    }
  }
  const unique = [...new Set([...wifi, ...other])];
  return unique.length > 0 ? unique : ['255.255.255.255'];
}

export function generateClassNumber(random: () => number = Math.random): string {
  const n = Math.floor(random() * 10000);
  return String(n).padStart(4, '0');
}

export const CLASS_NUMBER_STORAGE_KEY = 'chalk_class_number';

/** The same four digits after a refresh. A new code is minted only when none is stored. */
export function rememberClassNumber(
  storage: { getItem(key: string): string | null; setItem(key: string, value: string): void },
  random: () => number = Math.random,
): string {
  try {
    const saved = storage.getItem(CLASS_NUMBER_STORAGE_KEY)?.trim() ?? '';
    if (/^\d{4}$/.test(saved)) return saved;
  } catch {
    // Storage can throw in a locked browser. Fall through and mint a code.
  }
  const next = generateClassNumber(random);
  try {
    storage.setItem(CLASS_NUMBER_STORAGE_KEY, next);
  } catch {
    // The code still works for this page load.
  }
  return next;
}

/** Custom-scheme join link. Never an http or https URL. */
export function buildJoinQrValue(host: string, port: number | string, room: string): string {
  if (!host || /https?:/i.test(host) || /[/?#\s]/.test(host)) {
    throw new Error('Join host must be a bare laptop address');
  }
  const portNum = Number(port);
  if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
    throw new Error('Join port is invalid');
  }
  if (!/^\d{4}$/.test(room)) {
    throw new Error('Join room must be four digits');
  }
  const value = `chalk://join?host=${host}&port=${portNum}&room=${room}`;
  if (/https?:/i.test(value)) {
    throw new Error('Join QR must not be an http link');
  }
  return value;
}

export interface ClassBeaconPayload {
  room: string;
  classNumber: string;
  port: number;
}

export function buildClassBeacon(classNumber: string, socketPort: number): ClassBeaconPayload {
  return { room: classNumber, classNumber, port: socketPort };
}

export function normalizeStudentHello(input: unknown): StudentHello | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  if (typeof raw.roomId !== 'string' || typeof raw.studentId !== 'string' || typeof raw.displayName !== 'string') {
    return null;
  }
  const roomId = raw.roomId.trim().toLowerCase();
  const studentId = raw.studentId.trim();
  const displayName = raw.displayName.trim().replace(/\s+/g, ' ');
  if (!/^\d{4}$/.test(roomId)) return null;
  if (studentId.length < 1 || studentId.length > STUDENT_ID_MAX) return null;
  if (displayName.length < 1 || displayName.length > CLASS_NAME_MAX) return null;
  return { roomId, studentId, displayName };
}

export function connectStudent(
  students: Record<string, ClassStudentRecord>,
  hello: Pick<StudentHello, 'studentId' | 'displayName'>,
  socketId: string,
): Record<string, ClassStudentRecord> {
  return {
    ...students,
    [hello.studentId]: {
      studentId: hello.studentId,
      displayName: hello.displayName,
      connected: true,
      socketId,
    },
  };
}

export function disconnectStudent(
  students: Record<string, ClassStudentRecord>,
  studentId: string,
  socketId: string,
): Record<string, ClassStudentRecord> {
  const existing = students[studentId];
  if (!existing || existing.socketId !== socketId) return students;
  return {
    ...students,
    [studentId]: { ...existing, connected: false },
  };
}

/** One row per studentId. A shared display name stays two rows. Disconnect keeps the row and marks it away. */
export function reduceClassRoster(
  students: Record<string, ClassStudentRecord>,
  event:
    | { type: 'hello'; studentId: string; displayName: string; socketId: string }
    | { type: 'disconnect'; studentId: string; socketId: string },
): Record<string, ClassStudentRecord> {
  if (event.type === 'hello') {
    return connectStudent(students, event, event.socketId);
  }
  return disconnectStudent(students, event.studentId, event.socketId);
}

export function publicRoster(students: Record<string, ClassStudentRecord> | undefined): ClassRosterEntry[] {
  if (!students) return [];
  return Object.values(students).map(({ studentId, displayName, connected }) => ({
    studentId,
    displayName,
    connected,
  }));
}

export function joinedCount(roster: ClassRosterEntry[]): number {
  return roster.reduce((count, student) => count + (student.connected ? 1 : 0), 0);
}

export function isAllowedSocketOrigin(
  origin: string | undefined,
  env: { nodeEnv?: string; allowedOrigin?: string } = {},
): boolean {
  if (env.nodeEnv !== 'production') return true;
  if (origin == null || origin === '' || origin === 'null') return true;
  if (env.allowedOrigin && origin === env.allowedOrigin) return true;
  let hostname = '';
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return false;
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.endsWith('.local')) {
    return true;
  }
  return isPrivateIpv4(hostname);
}
