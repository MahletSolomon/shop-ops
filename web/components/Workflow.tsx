import Link from "next/link";
import React from "react";

const steps = [
  {
    number: "01",
    title: "Log the sale at the counter",
    description: "Capture each transaction quickly so the day starts with real numbers, not guesswork.",
  },
  {
    number: "02",
    title: "Stock updates behind the scenes",
    description: "Inventory moves with the sale, helping the back room stay ahead of low-stock items.",
  },
  {
    number: "03",
    title: "Review expenses before closing",
    description: "End the day with a clear view of costs, margin, and what needs attention tomorrow.",
  },
];

const signals = [
  { label: "Sales", value: "42 orders", tone: "text-[#135bec]" },
  { label: "Inventory", value: "18 items low", tone: "text-[#0f7b5f]" },
  { label: "Expenses", value: "7 entries", tone: "text-[#8b5cf6]" },
];

export default function Workflow() {
  return (
    <section className="w-full flex justify-center px-6 lg:px-0 py-[60px] lg:py-[90px] z-10">
      <div className="w-full max-w-[1280px] relative overflow-hidden rounded-[32px] border border-[#d9e6ff] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] shadow-[0px_18px_50px_rgba(19,91,236,0.08)]">
        <div
          className="absolute inset-0 pointer-events-none opacity-70"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(19,91,236,0.06) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(19,91,236,0.06) 1px, transparent 1px)
            `,
            backgroundSize: "36px 36px",
          }}
        />

        <div className="relative px-6 py-10 lg:px-12 lg:py-14">
          <div className="max-w-[760px] flex flex-col gap-4">
            <div className="inline-flex w-fit items-center rounded-full border border-[#cfe0ff] bg-white px-4 py-2 text-[12px] font-medium uppercase tracking-[0.16em] text-[#135bec] shadow-sm">
              Daily workflow
            </div>
            <h2 className="text-[30px] lg:text-[44px] font-normal leading-[1.1] text-[#1f2937] max-w-[720px]">
              Built around the way a shop actually runs
            </h2>
            <p className="text-[16px] lg:text-[18px] leading-[1.7] text-[#4b5563] max-w-[680px]">
              ShopOps keeps the counter, store room, and back office in sync so the owner, cashier, and stock keeper all work from the same playbook.
            </p>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col gap-4">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="group rounded-[22px] border border-[#dbe7ff] bg-white/90 p-5 lg:p-6 shadow-[0px_8px_24px_rgba(15,23,42,0.04)] transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#e2f2ff] text-[13px] font-semibold tracking-[0.08em] text-[#135bec]">
                      {step.number}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-[18px] lg:text-[20px] font-medium text-[#111827]">{step.title}</h3>
                      <p className="text-[15px] lg:text-[16px] leading-[1.65] text-[#5b6575] max-w-[520px]">{step.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-[26px] border border-[#dbe7ff] bg-[#0f172a] p-6 text-white shadow-[0px_18px_40px_rgba(15,23,42,0.18)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[12px] uppercase tracking-[0.18em] text-white/55">Today at a glance</p>
                    <h3 className="mt-2 text-[24px] font-normal leading-tight">A live view of the shop, not a spreadsheet from last week</h3>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-medium text-white/80">
                    Synced now
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {signals.map((signal) => (
                    <div key={signal.label} className="rounded-[18px] border border-white/10 bg-white/5 p-4">
                      <p className="text-[12px] uppercase tracking-[0.14em] text-white/55">{signal.label}</p>
                      <p className={`mt-3 text-[20px] font-medium ${signal.tone}`}>{signal.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[26px] border border-[#dbe7ff] bg-white p-6 shadow-[0px_12px_30px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[12px] uppercase tracking-[0.18em] text-[#6b7280]">Alerts</p>
                    <h3 className="mt-2 text-[20px] font-medium text-[#111827]">Catch restock issues before they become lost sales</h3>
                  </div>
                  <div className="flex size-12 items-center justify-center rounded-full bg-[#e2f2ff] text-[#135bec]">
                    <span className="text-[18px] font-semibold">!</span>
                  </div>
                </div>

                <div className="mt-5 rounded-[18px] border border-[#cfe0ff] bg-[#f7fbff] p-4">
                  <p className="text-[14px] leading-[1.6] text-[#4b5563]">
                    When stock runs low or expenses spike, the owner sees it in the same place the team works from every day.
                  </p>
                </div>

                <Link
                  href="/sign-up"
                  className="mt-5 inline-flex w-fit rounded-[10px] bg-[#135bec] px-4 py-3 text-[14px] font-medium text-white transition-colors hover:bg-blue-700"
                >
                  See the workflow in action
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
