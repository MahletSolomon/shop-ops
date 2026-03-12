import React from "react";

export default function CTA() {
  return (
    <section className="w-full flex justify-center px-6 lg:px-0 py-[60px] lg:pt-[80px] lg:pb-[140px] z-10">
      <div className="w-full max-w-[1280px] relative">
        <div className="w-full bg-gradient-to-r from-[#2b98ff] to-[#135bec] rounded-[10px] py-[60px] px-[30px] lg:px-[78px] flex flex-col items-center justify-center gap-[24px] text-center overflow-hidden shadow-xl relative">

          <h2 className="text-[32px] lg:text-[36px] font-normal text-white z-10 max-w-[800px] leading-tight">
            Ready to Transform Your Business?
          </h2>
          <p className="text-[18px] lg:text-[20px] font-normal text-white/90 z-10 max-w-[700px]">
            Join hundreds of shop owners who trust ShopOps to manage their operations
          </p>
          <button className="bg-white text-[#373737] font-medium text-[16px] px-[28px] py-[14px] rounded-[8px] mt-2 shadow-sm hover:bg-gray-50 transition-colors z-10">
            Start Your Free Trial
          </button>

          {/* Abstract Shop Image */}
          <div className="absolute left-[-40px] bottom-[-40px] lg:left-0 lg:top-[18px] size-[220px] lg:size-[280px] opacity-20 lg:opacity-100 pointer-events-none">
            <img alt="Online Shop" className="w-full h-full object-contain drop-shadow-2xl" src={'/images/Online Shop 1.png'} />
          </div>
        </div>
      </div>
    </section>
  );
}
