import React from "react";
import Logo from "./Logo";
import Link from "next/link";

export default function Header() {
  return (
    <header className="w-full bg-white/80 backdrop-blur-md border-b border-[#d5d5d5] flex justify-center fixed top-0 z-50">
      <div className="w-full max-w-[1280px] h-[64px] flex items-center justify-between px-6 lg:px-0">
        <Logo className="text-black" />
        <div className="flex items-center gap-[20px]">
          <Link href="/login" className="font-normal text-[14px] text-black hover:text-[#135bec] transition-colors">Login</Link>
          <Link href="/sign-up" className="bg-[#135bec] text-white font-medium text-[14px] px-[16px] py-[8px] rounded-[8px] shadow-sm hover:bg-blue-700 transition-colors">
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
