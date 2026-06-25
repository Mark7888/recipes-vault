import dns from 'node:dns/promises';
import net from 'node:net';

const PRIVATE_RANGES = [
  // Loopback
  { start: '127.0.0.0', end: '127.255.255.255' },
  // Private 10.x.x.x
  { start: '10.0.0.0', end: '10.255.255.255' },
  // Private 172.16.x.x - 172.31.x.x
  { start: '172.16.0.0', end: '172.31.255.255' },
  // Private 192.168.x.x
  { start: '192.168.0.0', end: '192.168.255.255' },
  // Link-local
  { start: '169.254.0.0', end: '169.254.255.255' },
  // Loopback IPv6
  { start: '::1', end: '::1' },
  // Link-local IPv6
  { start: 'fe80::', end: 'febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff' },
];

function ipToLong(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isPrivateIpv4(ip: string): boolean {
  const long = ipToLong(ip);
  for (const range of PRIVATE_RANGES) {
    if (!range.start.includes(':')) {
      const start = ipToLong(range.start);
      const end = ipToLong(range.end);
      if (long >= start && long <= end) return true;
    }
  }
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return normalized === '::1' || normalized.startsWith('fe80:') || normalized.startsWith('fc') || normalized.startsWith('fd');
}

export async function validateUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL format');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only http and https schemes are allowed');
  }

  const hostname = url.hostname;

  // Reject bare IPs that are obviously private without DNS lookup
  if (net.isIPv4(hostname)) {
    if (isPrivateIpv4(hostname)) {
      throw new Error('Target IP address is in a private range');
    }
    return url;
  }

  if (net.isIPv6(hostname)) {
    if (isPrivateIpv6(hostname)) {
      throw new Error('Target IP address is in a private range');
    }
    return url;
  }

  // Resolve DNS and check all returned IPs
  let addresses: string[];
  try {
    const results = await dns.resolve4(hostname).catch(() => [] as string[]);
    const results6 = await dns.resolve6(hostname).catch(() => [] as string[]);
    addresses = [...results, ...results6];
  } catch {
    throw new Error('DNS resolution failed');
  }

  if (addresses.length === 0) {
    throw new Error('DNS resolution returned no addresses');
  }

  for (const addr of addresses) {
    if (net.isIPv4(addr) && isPrivateIpv4(addr)) {
      throw new Error('Target resolves to a private IP address');
    }
    if (net.isIPv6(addr) && isPrivateIpv6(addr)) {
      throw new Error('Target resolves to a private IP address');
    }
  }

  return url;
}
