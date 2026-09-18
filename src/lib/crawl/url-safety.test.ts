import { describe, expect, it } from "vitest";
import { assertPublicUrl, isPrivateAddress, normalizeWebsiteUrl, normalizedDomain } from "./url-safety";

describe("normalizeWebsiteUrl", () => {
  it("adds https and normalizes the hostname", () => {
    const url = normalizeWebsiteUrl("WWW.Example.COM");
    expect(url.href).toBe("https://www.example.com/");
    expect(normalizedDomain(url)).toBe("example.com");
  });

  it("rejects non-web protocols and embedded credentials", () => {
    expect(() => normalizeWebsiteUrl("file:///etc/passwd")).toThrow();
    expect(() => normalizeWebsiteUrl("https://user:pass@example.com")).toThrow();
  });

  it("blocks loopback, private, link-local, documentation, and mapped addresses", async () => {
    for (const address of ["127.0.0.1", "10.1.2.3", "169.254.1.2", "192.168.1.1", "198.51.100.4", "::1", "fd00::1", "fe80::1", "2001:db8::1"]) {
      expect(isPrivateAddress(address)).toBe(true);
      await expect(assertPublicUrl(`http://${address.includes(":") ? `[${address}]` : address}`)).rejects.toThrow(/private network/i);
    }
  });

  it("accepts a routable public IP", async () => {
    await expect(assertPublicUrl("https://1.1.1.1")).resolves.toBeInstanceOf(URL);
  });
});
