import { DemoOne } from "@/components/ui/particle-wave";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Particle Wave Animation | Smark Connect",
  description: "Interactive 3D particle wave canvas animation with mouse interaction.",
};

export default function PreloaderDemoPage() {
  return <DemoOne />;
}
