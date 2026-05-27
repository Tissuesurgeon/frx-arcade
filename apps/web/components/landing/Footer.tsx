import Link from "next/link";
import { Container } from "@/components/Container";
import { API_URL } from "@/lib/utils";

const productLinks = [
  { href: "/dashboard", label: "Tournaments" },
  { href: "/leaderboard", label: "Leaderboards" },
  { href: "/dashboard", label: "Jackpot" },
  { href: "/#how-to-play", label: "Gameplay" },
] as const;

const developerLinks = [
  { href: `${API_URL}/api/docs`, label: "API Docs" },
  { href: "#hook-economy", label: "Hook Documentation" },
  { href: "#", label: "Smart Contracts" },
  { href: "#", label: "GitHub" },
] as const;

const communityLinks = [
  { href: "#community", label: "X/Twitter" },
  { href: "#community", label: "Discord" },
  { href: "#community", label: "Telegram" },
] as const;

const legalLinks = [
  { href: "#", label: "Terms" },
  { href: "#", label: "Privacy" },
  { href: "#", label: "Responsible Gaming" },
] as const;

function LinkGroup({
  title,
  links,
}: {
  title: string;
  links: readonly { href: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h3>
      <ul className="mt-3 space-y-2">
        {links.map(({ href, label }) => (
          <li key={label}>
            {href.startsWith("/") || href.startsWith("http") ? (
              <Link
                href={href}
                className="text-sm text-slate-400 transition-colors hover:text-cyan-300"
                {...(href.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {label}
              </Link>
            ) : (
              <a
                href={href}
                className="text-sm text-slate-400 transition-colors hover:text-cyan-300"
              >
                {label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer id="community" className="border-t border-white/10 py-12">
      <Container>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <p className="text-lg font-bold text-white">
              <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                Frx
              </span>{" "}
              Arcade
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
              Frx Arcade is a liquidity-powered competitive gaming platform built on X Layer
              and powered by Uniswap V4 Hooks.
            </p>
          </div>
          <LinkGroup title="Product" links={productLinks} />
          <LinkGroup title="Developers" links={developerLinks} />
          <div className="space-y-8">
            <LinkGroup title="Community" links={communityLinks} />
            <LinkGroup title="Legal" links={legalLinks} />
          </div>
        </div>

        <p className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-slate-500">
          Built on X Layer · Powered by Uniswap V4 Hooks · AI-Driven Competition
        </p>
        <p className="mt-2 text-center text-xs text-slate-600">© 2026 Frx Arcade</p>
      </Container>
    </footer>
  );
}
