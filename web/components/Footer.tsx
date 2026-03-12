import React from "react";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-[#c3c3c3] flex justify-center py-[30px] z-10">
      <div className="w-full max-w-[1280px] flex flex-col md:flex-row items-center justify-between px-6 lg:px-0 gap-4">
        <Logo className="text-[#535353] grayscale opacity-80" />
        <p className="text-[14px] text-[rgba(10,10,10,0.69)] text-center">
          © 2026 ShopOps Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
