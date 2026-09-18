from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request


MOBILE_UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36 SmarkConnectTiming/1.0"
DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36 SmarkConnectTiming/1.0"


def response_score(ttfb_ms: float, total_ms: float, transfer_bytes: int) -> int:
    """A transparent response-speed heuristic, intentionally not a Lighthouse score."""
    ttfb_penalty = max(0.0, ttfb_ms - 200.0) / 22.0
    total_penalty = max(0.0, total_ms - 900.0) / 45.0
    size_penalty = max(0, transfer_bytes - 500_000) / 85_000
    return max(0, min(100, round(100 - ttfb_penalty - total_penalty - size_penalty)))


import ipaddress
import socket
import urllib.parse


class SafeRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        parsed = urllib.parse.urlparse(newurl)
        if parsed.scheme not in ("http", "https"):
            raise urllib.error.HTTPError(newurl, code, "Invalid redirect scheme", headers, fp)
        hostname = parsed.hostname
        if not hostname:
            raise urllib.error.HTTPError(newurl, code, "Invalid redirect host", headers, fp)
        try:
            addr_info = socket.getaddrinfo(hostname, None)
            for _, _, _, _, sockaddr in addr_info:
                ip = ipaddress.ip_address(sockaddr[0])
                if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                    raise urllib.error.HTTPError(newurl, 403, "Redirect to private address forbidden", headers, fp)
        except Exception as err:
            if isinstance(err, urllib.error.HTTPError):
                raise
            raise urllib.error.HTTPError(newurl, code, f"DNS resolution failed: {err}", headers, fp)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def run(payload: dict[str, object]) -> dict[str, object]:
    website_url = str(payload["websiteUrl"])
    strategy = str(payload.get("strategy", "desktop"))
    opener = urllib.request.build_opener(SafeRedirectHandler)
    request = urllib.request.Request(
        website_url,
        headers={
            "User-Agent": MOBILE_UA if strategy == "mobile" else DESKTOP_UA,
            "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.7",
            "Accept-Encoding": "identity",
            "Cache-Control": "no-cache",
        },
    )
    started = time.perf_counter()
    try:
        with opener.open(request, timeout=20) as response:
            headers_received = time.perf_counter()
            body = response.read(8_000_000)
            completed = time.perf_counter()
            status_code = int(response.status)
            final_url = response.geturl()
    except urllib.error.HTTPError as error:
        headers_received = time.perf_counter()
        body = error.read(1_000_000)
        completed = time.perf_counter()
        status_code = int(error.code)
        final_url = error.geturl()
    ttfb_ms = round((headers_received - started) * 1000, 1)
    response_time_ms = round((completed - started) * 1000, 1)
    transfer_size_bytes = len(body)
    return {
        "strategy": strategy,
        "performance": response_score(ttfb_ms, response_time_ms, transfer_size_bytes),
        "accessibility": None,
        "bestPractices": None,
        "seo": None,
        "lcp": None,
        "fcp": None,
        "tbt": None,
        "cls": None,
        "statusCode": status_code,
        "responseTime": response_time_ms,
        "ttfb": ttfb_ms,
        "transferSize": transfer_size_bytes,
        "finalUrl": final_url,
        "source": "Python URL timing test",
    }


def main() -> None:
    payload = json.load(sys.stdin)
    print(json.dumps(run(payload)))


if __name__ == "__main__":
    main()
