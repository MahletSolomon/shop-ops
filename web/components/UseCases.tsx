import React from "react";

const roles = [
  {
    title: "Owner",
    description: "Checks sales, expenses, and margin at the end of the day without waiting for manual reports.",
    accent: "bg-[#e2f2ff] text-[#135bec]",
  },
  {
    title: "Cashier",
    description: "Moves quickly through sales with a clean interface that keeps the counter flowing.",
    accent: "bg-[#ecfff6] text-[#0f7b5f]",
  },
  {
    title: "Stock keeper",
    description: "Sees what needs to be reordered early, before a popular item is empty on the shelf.",
    accent: "bg-[#f5edff] text-[#7c3aed]",
  },
];

const checkpoints = [
  "Sales live in one place",
  "Inventory updates with each transaction",
  "Expenses stay organized by category",
  "Alerts surface what needs attention next",
];

export default function UseCases() {
  return (
    <section className="w-full flex justify-center px-6 lg:px-0 py-[30px] lg:py-[90px] z-10">
      <div className="w-full max-w-[1280px] grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-[32px] border border-[#dbe7ff] bg-[#0b1220] px-6 py-8 lg:px-8 lg:py-10 text-white shadow-[0px_18px_50px_rgba(15,23,42,0.18)]">
          <div className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-medium uppercase tracking-[0.16em] text-white/70">
            Who it serves
          </div>
          <h2 className="mt-5 text-[30px] lg:text-[40px] font-normal leading-[1.08] max-w-[420px]">
            Designed for the people actually running the shop
          </h2>
          <p className="mt-4 text-[16px] lg:text-[17px] leading-[1.75] text-white/70 max-w-[440px]">
            ShopOps keeps every role aligned. The owner gets visibility, the cashier gets speed, and the stock team gets a clear next step.
          </p>

          <div className="mt-8 space-y-3">
            {checkpoints.map((checkpoint) => (
              <div key={checkpoint} className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-[#135bec] text-[11px] font-semibold text-white">
                  OK
                </span>
                <span className="text-[14px] lg:text-[15px] text-white/80">{checkpoint}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          {roles.map((role, index) => (
            <div
              key={role.title}
              className={`grid gap-5 rounded-[28px] border border-[#dbe7ff] bg-white px-6 py-6 lg:px-7 lg:py-7 shadow-[0px_10px_28px_rgba(15,23,42,0.04)] ${
                index === 0 ? "lg:grid-cols-[1fr_auto]" : index === 1 ? "lg:grid-cols-[0.9fr_1.1fr]" : "lg:grid-cols-[1fr_auto]"
              }`}
            >
              <div className="space-y-3">
                <div className={`inline-flex w-fit rounded-full px-3 py-1 text-[12px] font-medium ${role.accent}`}>{role.title}</div>
                <p className="text-[16px] lg:text-[17px] leading-[1.7] text-[#4b5563] max-w-[540px]">{role.description}</p>
              </div>

              <div className="flex items-center gap-3 self-start rounded-[18px] border border-[#e6efff] bg-[#f7fbff] px-4 py-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-white text-[#135bec] shadow-sm">
                  <span className="text-[18px] font-semibold">0{index + 1}</span>
                </div>
                <div>
                  <p className="text-[12px] uppercase tracking-[0.16em] text-[#6b7280]">Focus</p>
                  <p className="text-[14px] font-medium text-[#111827]">
                    {index === 0 ? "Daily visibility" : index === 1 ? "Fast checkout" : "Stock control"}
                  </p>
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-[28px] border border-[#dbe7ff] bg-[linear-gradient(135deg,#f7fbff_0%,#ffffff_100%)] px-6 py-6 lg:px-7 lg:py-7 shadow-[0px_10px_28px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[12px] uppercase tracking-[0.16em] text-[#6b7280]">Built for</p>
                <h3 className="mt-2 text-[22px] lg:text-[26px] font-normal text-[#111827]">
                  Mini-markets, neighborhood stores, kiosks, and retail teams that need one simple system
                </h3>
              </div>
              <div className="rounded-full border border-[#cfe0ff] bg-white px-4 py-2 text-[13px] font-medium text-[#135bec] shadow-sm">
                One source of truth
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
