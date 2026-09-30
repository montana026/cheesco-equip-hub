import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import {
  TrustBar,
  CategoryCards,
  SponsoredShowcase,
  HowItWorks,
  Testimonials,
  SectorCoverage,
} from "@/components/sections";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <TrustBar />
        <CategoryCards />
        <SponsoredShowcase />
        <HowItWorks />
        <Testimonials />
        <SectorCoverage />
      </main>
      <Footer />
    </>
  );
}
