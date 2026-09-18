"use client";

import { signOut } from "next-auth/react";

export function LogoutButton({ className = "icon-button", label = "↗" }: { className?: string; label?: string }) {
  return (
    <button
      className={className}
      type="button"
      onClick={() => signOut({ redirectTo: "/login" })}
      aria-label="Sign out"
      title="Sign out of your workspace"
    >
      {label}
    </button>
  );
}
