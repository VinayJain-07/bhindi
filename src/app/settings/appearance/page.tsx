import { SettingsShell } from "@/components/settings-shell";
import { ThemeSettings } from "@/components/theme-settings";
import { requireUser } from "@/lib/auth-helpers";

export default async function AppearanceSettingsPage() {
  await requireUser();
  return <SettingsShell active="Appearance"><div className="settings-heading"><p className="eyebrow">APPEARANCE</p><h2>Make the workspace yours</h2><p>Switch between the original warm interface and a focused dark theme.</p></div><ThemeSettings /></SettingsShell>;
}
