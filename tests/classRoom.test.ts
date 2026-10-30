import { describe, expect, it } from 'vitest';
import {
  buildJoinQrValue,
  CLASS_NUMBER_STORAGE_KEY,
  generateClassNumber,
  lanBroadcastAddresses,
  pickLanIpv4,
  publicRoster,
  rememberClassNumber,
  reduceClassRoster,
  type ClassStudentRecord,
} from '../utils/classRoom';

const ipv4 = (address: string, netmask = '255.255.255.0', internal = false) => ({
  address,
  netmask,
  family: 'IPv4' as const,
  internal,
});

describe('LAN address picker', () => {
  it('prefers Wi-Fi and skips virtual, internal, and link-local adapters', () => {
    const ip = pickLanIpv4({
      'vEthernet (WSL)': [ipv4('172.31.0.1')],
      'vEthernet (Default Switch)': [ipv4('172.22.80.1')],
      'Hyper-V Virtual Ethernet Adapter': [ipv4('192.168.100.1')],
      'VirtualBox Host-Only': [ipv4('192.168.56.1')],
      docker0: [ipv4('172.17.0.1')],
      Ethernet: [ipv4('10.0.0.8')],
      'Wi-Fi': [ipv4('192.168.1.20')],
      Loopback: [ipv4('127.0.0.1', '255.0.0.0', true)],
      'Local Area Connection* 2': [ipv4('169.254.12.4')],
    });

    expect(ip).toBe('192.168.1.20');
  });

  it('uses another private adapter when no Wi-Fi interface is present', () => {
    expect(pickLanIpv4({
      'vEthernet (WSL)': [ipv4('172.18.0.1')],
      Ethernet: [ipv4('10.1.2.3')],
    })).toBe('10.1.2.3');
  });

  it('accepts a numeric IPv4 family and ignores public addresses', () => {
    expect(pickLanIpv4({
      Ethernet: [{ address: '8.8.8.8', family: 4, internal: false, netmask: '255.255.255.0' }],
      'Wi-Fi 2': [{ address: '192.168.0.9', family: 4, internal: false, netmask: '255.255.255.0' }],
    })).toBe('192.168.0.9');
  });

  it('broadcasts on the Wi-Fi subnet and not on a virtual adapter', () => {
    expect(lanBroadcastAddresses({
      'vEthernet (WSL)': [ipv4('172.31.0.1')],
      'Wi-Fi': [ipv4('192.168.1.20', '255.255.255.0')],
    })).toEqual(['192.168.1.255']);
  });
});

describe('join QR', () => {
  it('contains chalk:// and does not contain http', () => {
    const qr = buildJoinQrValue('192.168.1.20', 3030, '4821');
    expect(qr).toContain('chalk://');
    expect(qr.includes('http')).toBe(false);
    expect(qr).toBe('chalk://join?host=192.168.1.20&port=3030&room=4821');
  });

  it('refuses a host that is already an http URL', () => {
    expect(() => buildJoinQrValue('http://192.168.1.20', 3030, '4821')).toThrow();
  });
});

describe('class roster', () => {
  it('keeps two rows when two students share a display name', () => {
    let students: Record<string, ClassStudentRecord> = {};
    students = reduceClassRoster(students, { type: 'hello', studentId: 'phone-a', displayName: 'Priya', socketId: 's1' });
    students = reduceClassRoster(students, { type: 'hello', studentId: 'phone-b', displayName: 'Priya', socketId: 's2' });
    const roster = publicRoster(students);
    expect(roster).toHaveLength(2);
    expect(roster.map((row) => row.studentId).sort()).toEqual(['phone-a', 'phone-b']);
    expect(roster.every((row) => row.displayName === 'Priya' && row.connected)).toBe(true);
  });

  it('marks the row away on disconnect and keeps it', () => {
    let students = reduceClassRoster({}, { type: 'hello', studentId: 'phone-a', displayName: 'Arun', socketId: 's1' });
    students = reduceClassRoster(students, { type: 'disconnect', studentId: 'phone-a', socketId: 's1' });
    expect(publicRoster(students)).toEqual([
      { studentId: 'phone-a', displayName: 'Arun', connected: false },
    ]);
  });

  it('reconnect with the same studentId keeps one row', () => {
    let students = reduceClassRoster({}, { type: 'hello', studentId: 'phone-a', displayName: 'Priya', socketId: 's1' });
    students = reduceClassRoster(students, { type: 'disconnect', studentId: 'phone-a', socketId: 's1' });
    students = reduceClassRoster(students, { type: 'hello', studentId: 'phone-a', displayName: 'Priya', socketId: 's2' });
    students = reduceClassRoster(students, { type: 'disconnect', studentId: 'phone-a', socketId: 's1' });
    const roster = publicRoster(students);
    expect(roster).toHaveLength(1);
    expect(roster[0]).toEqual({ studentId: 'phone-a', displayName: 'Priya', connected: true });
  });
});

describe('class number', () => {
  it('is four digits', () => {
    expect(generateClassNumber(() => 0)).toBe('0000');
    expect(generateClassNumber(() => 0.5)).toBe('5000');
    expect(generateClassNumber()).toMatch(/^\d{4}$/);
  });

  it('keeps the stored code across a reload', () => {
    const saved = new Map<string, string>();
    const storage = {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => { saved.set(key, value); },
    };
    expect(rememberClassNumber(storage, () => 0.2)).toBe('2000');
    expect(saved.get(CLASS_NUMBER_STORAGE_KEY)).toBe('2000');
    expect(rememberClassNumber(storage, () => 0.1)).toBe('2000');
  });
});
