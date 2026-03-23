import React from "react";
import Header from "../components/Header";
import Hero from "../components/Hero";
import Features from "../components/Features";
import Workflow from "../components/Workflow";
import UseCases from "../components/UseCases";
import CTA from "../components/CTA";
import Footer from "../components/Footer";

export default function App() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-white font-sans relative selection:bg-[#135bec] selection:text-white">
      {/* Subtle Grid Background matching the design */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-50"
        style={{
          backgroundImage: `
            linear-gradient(to right, #f0f0f0 1px, transparent 1px),
            linear-gradient(to bottom, #f0f0f0 1px, transparent 1px)
          `,
          backgroundSize: '4rem 4rem',
        }}
      />

      <Header />
      <main className="w-full flex flex-col items-center z-10 mt-[64px]">
        <Hero />
        <Features />
        <Workflow />
        <UseCases />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
