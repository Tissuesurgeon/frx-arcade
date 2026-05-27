"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/Container";
import { Button } from "@/components/Button";

const links = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#how-to-play", label: "How to Play" },
  { href: "#hook-economy", label: "Hook Economy" },
  { href: "#game", label: "Gameplay" },
  { href: "#tournaments", label: "Tournaments" },
  { href: "#leaderboard", label: "Leaderboard" },
  { href: "#faq", label: "FAQ" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-frx-bg/80 backdrop-blur-xl">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Frx
          </span>
          <span className="text-white"> Arcade</span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Main">
          {links.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="text-xs text-slate-400 transition-colors hover:text-cyan-300"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:block">
          <Button href="/demo" variant="primary" className="!py-2 !px-4 text-xs">
            Start Competing
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex rounded-lg p-2 text-slate-300 hover:bg-white/10 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          <span className="sr-only">Menu</span>
        </button>
      </Container>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="mobile-nav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-white/10 lg:hidden"
          >
            <Container className="flex flex-col gap-1 py-4">
              {links.map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
                  onClick={() => setOpen(false)}
                >
                  {label}
                </a>
              ))}
              <Button href="/demo" variant="primary" className="mt-2 w-full">
                Start Competing
              </Button>
            </Container>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
