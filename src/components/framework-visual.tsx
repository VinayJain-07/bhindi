import type { CSSProperties } from "react";
import type { Framework } from "@/lib/documents/frameworks";

export function FrameworkVisual({ framework }: { framework: Framework }) {
  return <figure className={`framework-visual framework-${framework.kind}`} aria-label={`${framework.kind.toUpperCase()} framework`}>
    <div className="framework-cards">
      {framework.cards.map((card, index) => <section className="framework-card" key={`${index}-${card.title}`} style={{ "--stage-inset": `${Math.min(index * 3, 15)}%`, "--card-accent": ["#7c34bc", "#b74162", "#167c70", "#ad7024", "#3c65a5", "#6853a3"][index % 6] } as CSSProperties}>
        <h4>{card.title}</h4>
        <ul>{card.lines.map((line, lineIndex) => <li key={lineIndex}>{line}</li>)}</ul>
      </section>)}
    </div>
    {framework.kind === "funnel" && <figcaption>Stage widths show sequence, not measured volume or conversion.</figcaption>}
  </figure>;
}
