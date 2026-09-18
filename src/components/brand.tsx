import Link from "next/link";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link className={`brand ${inverse ? "brand-inverse" : ""}`} href="/" aria-label="Smark Connect home">
      <span className="brand-mark" aria-hidden="true"><span /></span>
      <span>Smark Connect</span>
    </Link>
  );
}
