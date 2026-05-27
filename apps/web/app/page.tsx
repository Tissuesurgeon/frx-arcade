import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { LiveTournamentFeed } from "@/components/landing/LiveTournamentFeed";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { HookAnalyticsSection } from "@/components/landing/HookAnalyticsSection";
import { GameSection } from "@/components/landing/GameSection";
import { HowToPlaySection } from "@/components/landing/HowToPlaySection";
import { AISystemSection } from "@/components/landing/AISystemSection";
import { LeaderboardSection } from "@/components/landing/LeaderboardSection";
import { TournamentSystem } from "@/components/landing/TournamentSystem";
import { CompetitiveEdge } from "@/components/landing/CompetitiveEdge";
import { RoadmapSection } from "@/components/landing/RoadmapSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <LiveTournamentFeed />
        <HowItWorks />
        <HookAnalyticsSection />
        <GameSection />
        <HowToPlaySection />
        <AISystemSection />
        <LeaderboardSection />
        <TournamentSystem />
        <CompetitiveEdge />
        <RoadmapSection />
        <FaqSection />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
