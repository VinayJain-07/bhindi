import { BlockList, isIP } from "node:net";
import { lookup } from "node:dns/promises";

const blockedHostnames = new Set(["localhost", "localhost.localdomain", "0.0.0.0"]);

const blockedAddresses = new BlockList();
for (const [network, prefix] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4]] as const) blockedAddresses.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of [["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10], ["2001:db8::", 32], ["ff00::", 8]] as const) blockedAddresses.addSubnet(network, prefix, "ipv6");

export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (!family) return true;
  return blockedAddresses.check(address, family === 4 ? "ipv4" : "ipv6");
}

export function normalizeWebsiteUrl(input: string): URL {
  const trimmed = input.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) throw new Error("Only public HTTP or HTTPS website URLs are allowed.");
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(candidate);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Only public HTTP or HTTPS website URLs are allowed.");
  if (url.username || url.password) throw new Error("Website URLs cannot contain credentials.");
  url.hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  url.hash = "";
  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) url.port = "";
  if (!url.pathname) url.pathname = "/";
  return url;
}

export async function assertPublicUrl(input: string | URL): Promise<URL> {
  const url = input instanceof URL ? input : normalizeWebsiteUrl(input);
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (blockedHostnames.has(hostname) || hostname.endsWith(".local") || hostname.endsWith(".internal")) throw new Error("Private network addresses cannot be audited.");
  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error("Private network addresses cannot be audited.");
    return url;
  }
  let addresses: Array<{ address: string; family: number }> = [];
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    try {
      const single = await lookup(hostname, { family: 4 });
      addresses = [{ address: single.address, family: single.family }];
    } catch {
      try {
        const single = await lookup(hostname, { family: 6 });
        addresses = [{ address: single.address, family: single.family }];
      } catch {
        throw new Error("The website hostname could not be resolved. Verify the URL is correct and publicly accessible.");
      }
    }
  }
  if (!addresses.length) throw new Error("The website hostname could not be resolved.");
  if (addresses.some(({ address }) => isPrivateAddress(address))) throw new Error("The website resolves to a private network address and cannot be audited.");
  return url;
}

export function normalizedDomain(url: URL): string {
  return url.hostname.replace(/^www\./, "");
}
