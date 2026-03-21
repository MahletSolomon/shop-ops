import React from "react";

export default function Features() {
  return (
    <section className="w-full flex justify-center py-[60px] lg:py-[73px] px-6 lg:px-0 z-10">
      <div className="w-full max-w-[1280px] flex flex-col items-center gap-[40px] lg:gap-[60px]">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center gap-[10px]">
          <h2 className="text-[28px] lg:text-[36px] font-normal leading-[1.2] lg:leading-[60px] text-black">
            Everything You Need to Run Your Business
          </h2>
          <p className="text-[16px] lg:text-[20px] font-normal leading-[28px] text-[#484848]">
            Powerful features designed specifically for small retail operations
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[25px] w-full">
          {/* Card 1 */}
          <div className="bg-[#e2f2ff] rounded-[16px] p-[30px] flex flex-col gap-[16px] hover:-translate-y-1 transition-transform duration-300">
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="44" height="44" rx="9" fill="#5D93FF" />
              <path d="M18 32C18.5523 32 19 31.5523 19 31C19 30.4477 18.5523 30 18 30C17.4477 30 17 30.4477 17 31C17 31.5523 17.4477 32 18 32Z" stroke="#F2F2F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M29 32C29.5523 32 30 31.5523 30 31C30 30.4477 29.5523 30 29 30C28.4477 30 28 30.4477 28 31C28 31.5523 28.4477 32 29 32Z" stroke="#F2F2F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12.05 12.05H14.05L16.71 24.47C16.8076 24.9248 17.0607 25.3315 17.4258 25.6198C17.7908 25.9082 18.245 26.0603 18.71 26.05H28.49C28.9452 26.0493 29.3865 25.8933 29.7411 25.6078C30.0956 25.3224 30.3422 24.9245 30.4401 24.48L32.09 17.05H15.12" stroke="#F2F2F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            <div className="flex flex-col gap-[5px]">
              <h3 className="text-[20px] font-medium text-black">Sales Tracking</h3>
              <p className="text-[16px] text-[rgba(72,72,72,0.78)] leading-[1.4]">
                Monitor daily sales, track customer transactions, and analyze revenue trends with detailed reports.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#e2f2ff] rounded-[16px] p-[30px] flex flex-col gap-[16px] hover:-translate-y-1 transition-transform duration-300">
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="44" height="44" rx="9" fill="#5D93FF" />
              <path d="M31 18C30.9996 17.6493 30.9071 17.3048 30.7315 17.0012C30.556 16.6975 30.3037 16.4454 30 16.27L23 12.27C22.696 12.0945 22.3511 12.0021 22 12.0021C21.6489 12.0021 21.304 12.0945 21 12.27L14 16.27C13.6963 16.4454 13.444 16.6975 13.2685 17.0012C13.0929 17.3048 13.0004 17.6493 13 18V26C13.0004 26.3508 13.0929 26.6952 13.2685 26.9989C13.444 27.3025 13.6963 27.5547 14 27.73L21 31.73C21.304 31.9056 21.6489 31.998 22 31.998C22.3511 31.998 22.696 31.9056 23 31.73L30 27.73C30.3037 27.5547 30.556 27.3025 30.7315 26.9989C30.9071 26.6952 30.9996 26.3508 31 26V18Z" stroke="#F2F2F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13.3 17L22 22L30.7 17" stroke="#F2F2F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 32V22" stroke="#F2F2F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            <div className="flex flex-col gap-[5px]">
              <h3 className="text-[20px] font-medium text-black">Inventory Management</h3>
              <p className="text-[16px] text-[rgba(72,72,72,0.78)] leading-[1.4]">
                Keep track of stock levels, get low stock alerts, and never run out of popular items again.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-[#e2f2ff] rounded-[16px] p-[30px] flex flex-col gap-[16px] hover:-translate-y-1 transition-transform duration-300">
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="44" height="44" rx="9" fill="#5D93FF" />
              <path d="M15 31V25" stroke="#F2F2F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 31V19" stroke="#F2F2F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M29 31V13" stroke="#F2F2F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            <div className="flex flex-col gap-[5px]">
              <h3 className="text-[20px] font-medium text-black">Expense Tracking</h3>
              <p className="text-[16px] text-[rgba(72,72,72,0.78)] leading-[1.4]">
                Track all business expenses, categorize spending, and understand your profit margins better.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="w-full mt-4 backdrop-blur-[27px] bg-[#e2f2ff] rounded-[10px] py-[40px] lg:py-[50px] px-[30px] lg:px-[78px] flex flex-col md:flex-row items-center justify-between gap-[40px] md:gap-0">
          <div className="flex items-center gap-[20px]">
            <span className="text-[#135bec] text-[48px] lg:text-[56px] font-medium leading-[1.2]">10K+</span>
            <span className="text-[16px] lg:text-[18px] text-black tracking-[0.36px] max-w-[164px]">Happy customers on the platform</span>
          </div>
          <div className="hidden md:block w-px h-[60px] bg-[#135bec]/20" />
          <div className="flex items-center gap-[20px]">
            <span className="text-[#135bec] text-[48px] lg:text-[56px] font-medium leading-[1.2]">19+</span>
            <span className="text-[16px] lg:text-[18px] text-black tracking-[0.36px] max-w-[178px]">Awards Honored to the platform</span>
          </div>
          <div className="hidden md:block w-px h-[60px] bg-[#135bec]/20" />
          <div className="flex items-center gap-[20px]">
            <span className="text-[#135bec] text-[48px] lg:text-[56px] font-medium leading-[1.2]">4.9+</span>
            <span className="text-[16px] lg:text-[18px] text-black tracking-[0.36px] max-w-[164px]">Rating 4.9 from over 9K reviews</span>
          </div>
        </div>
      </div>
    </section>
  );
}
