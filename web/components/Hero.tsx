import Link from "next/link";
import React from "react";

export default function Hero() {
  return (
    <section className="w-full flex justify-center pt-[60px] lg:pt-[80px] pb-[60px] lg:pb-[100px] px-6 lg:px-0 relative overflow-hidden">
      <div className="w-full max-w-[1280px] flex flex-col lg:flex-row items-center justify-between relative min-h-[500px] lg:h-[631px]">
        {/* Text Content */}
        <div className="w-full lg:w-1/2 flex flex-col items-start gap-[20px] z-10">
          <div className="bg-[#e2f2ff] px-[16px] py-[11px] rounded-full border border-[#135bec] shadow-sm">
            <span className="font-medium text-[#636363] text-[14px]">Built For Small Businesses</span>
          </div>
          <h1 className="font-normal text-[#3b3b3b] text-[40px] md:text-[50px] lg:text-[60px] leading-[1.1] lg:leading-[60px] max-w-[553px]">
            Manage Your Shop <br className="hidden md:block" />
            with <span className="text-[#135bec] font-semibold">Confidence</span>
          </h1>
          <p className="font-normal text-[#3b3b3b] text-[16px] leading-[28px] max-w-[553px]">
            Track sales, manage inventory, and monitor expenses all in one powerful platform designed for mini-markets and retail stores.
          </p>
          <Link href="/sign-up" className="bg-[#135bec] text-white font-medium text-[16px] px-[24px] py-[12px] rounded-[8px] shadow-sm mt-2 hover:bg-blue-700 transition-colors hover:shadow-md">
            Start Free Trial
          </Link>
        </div>

        {/* 3D Images Cluster - Desktop */}
        <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-[650px] pointer-events-none">
          {/* Smartphone */}
          <div className="absolute right-[80px] top-[70px] size-[490px] z-0 drop-shadow-2xl">
            <img alt="Smartphone App" className="w-full h-full object-contain" src={'/images/Smartphone Discount 1.png'} />
          </div>
          {/* Voucher */}
          <div className="absolute right-[280px] top-[365px] size-[355px] flex items-center justify-center z-10">
            <div className="rotate-[6.41deg] size-[322px] drop-shadow-xl">
              <img alt="Voucher Discount" className="w-full h-full object-contain" src={'/images/Voucher Discount 1.png'} />
            </div>
          </div>
          {/* Sale Tag */}
          <div className="absolute right-[-20px] top-[316px] size-[297px] z-20  rounded-2xl bg-white/5 ">
            <img alt="Sale Tag" className="w-full h-full object-contain drop-shadow-2xl" src={'/images/Sale Tag 1.png'} />
          </div>
        </div>

        {/* Mobile Images Fallback */}
        <div className="block lg:hidden w-full relative h-[350px] mt-12 overflow-visible">
          <div className="absolute right-0 top-0 w-[80%] max-w-[400px] z-0">
            <img alt="Smartphone App" className="w-full h-auto drop-shadow-xl" src={'/images/Smartphone Discount 1.png'} />
          </div>
          <div className="absolute left-0 bottom-[20%] w-[50%] max-w-[250px] z-10 rotate-[6.41deg]">
            <img alt="Voucher Discount" className="w-full h-auto drop-shadow-lg" src={'/images/Voucher Discount 1.png'} />
          </div>
          <div className="absolute right-[-10%] bottom-0 w-[45%] max-w-[220px] z-20">
            <img alt="Sale Tag" className="w-full h-auto drop-shadow-2xl" src={'/images/Sale Tag 1.png'} />
          </div>
        </div>
      </div>
    </section>
  );
}
