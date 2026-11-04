import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';

/**
 * Address ranges an outbound fetch must never reach: loopback, private
 * networks, link-local (cloud metadata lives at 169.254.169.254), CGNAT,
 * "this network", benchmarking, multicast and reserved space.
 */
const blockList = new net.BlockList();
blockList.addSubnet('0.0.0.0', 8, 'ipv4');
blockList.addSubnet('10.0.0.0', 8, 'ipv4');
blockList.addSubnet('100.64.0.0', 10, 'ipv4');
blockList.addSubnet('127.0.0.0', 8, 'ipv4');
blockList.addSubnet('169.254.0.0', 16, 'ipv4');
blockList.addSubnet('172.16.0.0', 12, 'ipv4');
blockList.addSubnet('192.0.0.0', 24, 'ipv4');
blockList.addSubnet('192.0.2.0', 24, 'ipv4');
blockList.addSubnet('192.168.0.0', 16, 'ipv4');
blockList.addSubnet('198.18.0.0', 15, 'ipv4');
blockList.addSubnet('198.51.100.0', 24, 'ipv4');
blockList.addSubnet('203.0.113.0', 24, 'ipv4');
blockList.addSubnet('224.0.0.0', 3, 'ipv4'); // multicast + reserved + broadcast
blockList.addAddress('::', 'ipv6');
blockList.addAddress('::1', 'ipv6');
blockList.addSubnet('fc00::', 7, 'ipv6'); // unique local
blockList.addSubnet('fe80::', 10, 'ipv6'); // link-local
blockList.addSubnet('ff00::', 8, 'ipv6'); // multicast
blockList.addSubnet('2001:db8::', 32, 'ipv6'); // documentation

/** Embedded IPv4 in ::ffff:a.b.c.d, ::ffff:7f00:1, ::a.b.c.d or 64:ff9b::a.b.c.d. */
function embeddedIpv4(ip: string): string | null {
  const lower = ip.toLowerCase();
  const prefix = ['::ffff:', '64:ff9b::', '::'].find((p) => lower.startsWith(p));
  if (!prefix) return null;
  const rest = lower.slice(prefix.length);
  if (net.isIPv4(rest)) return rest;
  const hex = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(rest);
  if (!hex) return null;
  const hi = parseInt(hex[1], 16);
  const lo = parseInt(hex[2], 16);
  return `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
}

export function isBlockedAddress(ip: string): boolean {
  if (net.isIPv4(ip)) return blockList.check(ip, 'ipv4');
  if (net.isIPv6(ip)) {
    const v4 = embeddedIpv4(ip);
    if (v4 && blockList.check(v4, 'ipv4')) return true;
    return blockList.check(ip, 'ipv6');
  }
  // Anything that is not a recognizable address is not something we connect to.
  return true;
}

/**
 * Checks that a URL is http(s) and that a literal IP host is public. Hostnames
 * are checked at connect time by `safeLookup`, against the address the socket
 * actually uses, so a DNS answer that changes between check and connect
 * (DNS rebinding) cannot slip through.
 */
export async function validateUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL format');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https schemes are allowed');
  }
  if (url.username || url.password) {
    throw new Error('URLs with credentials are not allowed');
  }

  // WHATWG URL keeps IPv6 hosts in brackets.
  const host = url.hostname.replace(/^\[(.*)\]$/, '$1');
  if (net.isIP(host)) {
    if (isBlockedAddress(host)) throw new Error('Target IP address is in a private range');
    return url;
  }

  // Fail fast with a clear error on hostnames that already resolve somewhere
  // private; the connect-time check below is what actually enforces it.
  const addresses = await dns.promises.lookup(host, { all: true }).catch(() => {
    throw new Error('DNS resolution failed');
  });
  if (addresses.length === 0) throw new Error('DNS resolution returned no addresses');
  if (addresses.some((a) => isBlockedAddress(a.address))) {
    throw new Error('Target resolves to a private IP address');
  }
  return url;
}

/** dns.lookup replacement for the outbound agents: refuses private answers. */
const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, '', 0);
    const list = addresses as dns.LookupAddress[];
    const blocked = list.find((a) => isBlockedAddress(a.address));
    if (blocked || list.length === 0) {
      const error = Object.assign(new Error(`Refusing to connect to ${hostname}: private address`), { code: 'ESSRF' });
      return callback(error, '', 0);
    }
    if (options.all) return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
    callback(null, list[0].address, list[0].family);
  });
};

const httpAgent = new http.Agent({ lookup: safeLookup });
const httpsAgent = new https.Agent({ lookup: safeLookup });

const MAX_REDIRECTS = 5;

/**
 * GET an untrusted URL. Every hop of a redirect chain is re-validated, and the
 * sockets resolve hostnames through `safeLookup`, so neither a redirect nor a
 * rebinding DNS answer can point the request at an internal address. Use this
 * for every fetch of a user- or page-supplied URL.
 */
export async function safeGet<T = unknown>(
  rawUrl: string,
  config: Omit<AxiosRequestConfig, 'url' | 'method' | 'maxRedirects' | 'httpAgent' | 'httpsAgent'> = {},
): Promise<{ url: string; response: AxiosResponse<T> }> {
  let current = await validateUrl(rawUrl);

  for (let hop = 0; ; hop++) {
    const response = await axios.get<T>(current.toString(), {
      ...config,
      maxRedirects: 0,
      httpAgent,
      httpsAgent,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const location = response.headers['location'] as string | undefined;
    if (response.status < 300 || !location) {
      return { url: current.toString(), response };
    }
    if (hop >= MAX_REDIRECTS) throw new Error('Too many redirects');
    current = await validateUrl(new URL(location, current).toString());
  }
}
