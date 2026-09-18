"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

type SocialCompanyIdentityProps = {
  companyName: string;
  companyWebsite?: string | null;
  companyLogoUrl?: string | null;
  platform: "Reddit" | "Instagram" | "X" | "LinkedIn";
  meta?: string;
  compact?: boolean;
};

export function companySocialHandle(companyName: string, companyWebsite?: string | null) {
  if (companyWebsite) {
    try {
      return new URL(companyWebsite).hostname.replace(/^www\./, "").split(".")[0];
    } catch {
      // Fall through to the company-name-derived handle.
    }
  }

  return companyName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24) || "company";
}

export function companyLogoSource(companyLogoUrl?: string | null) {
  if (!companyLogoUrl) return null;
  return companyLogoUrl.startsWith("data:")
    ? companyLogoUrl
    : `/api/assets/logo?url=${encodeURIComponent(companyLogoUrl)}`;
}

export function SocialCompanyIdentity({
  companyName,
  companyWebsite,
  companyLogoUrl,
  platform,
  meta,
  compact = false,
}: SocialCompanyIdentityProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const handle = useMemo(
    () => companySocialHandle(companyName, companyWebsite),
    [companyName, companyWebsite],
  );
  const logoSrc = companyLogoSource(companyLogoUrl) || (companyWebsite ? `/api/assets/logo?website=${encodeURIComponent(companyWebsite)}` : null);
  const initials = companyName.trim().slice(0, 2).toUpperCase() || "CO";

  return (
    <div className={`social-company-identity ${compact ? "social-company-identity--compact" : ""}`}>
      <span className="social-company-identity__avatar" aria-hidden="true">
        {logoSrc && !imageFailed ? (
          <Image
            src={logoSrc}
            alt=""
            width={34}
            height={34}
            unoptimized
            className="social-company-identity__logo"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="social-company-identity__initials">{initials}</span>
        )}
      </span>
      <span className="social-company-identity__copy">
        <span className="social-company-identity__name">{companyName}</span>
        <span className="social-company-identity__detail">
          @{handle} · {platform}{meta ? ` · ${meta}` : ""}
        </span>
      </span>
    </div>
  );
}
