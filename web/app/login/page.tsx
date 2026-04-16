"use client";
import Link from "next/link";
import Logo from "@/components/Logo";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const REMEMBER_ME_KEY = "remember_me_credentials";

type RememberedCredentials = {
  phone: string;
  rememberMe: boolean;
};

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load remembered credentials on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const remembered = localStorage.getItem(REMEMBER_ME_KEY);
        if (remembered) {
          const credentials: RememberedCredentials = JSON.parse(remembered);
          setPhone(credentials.phone);
          setRememberMe(credentials.rememberMe);
        }
      } catch (err) {
        console.error("Failed to load remembered credentials:", err);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();

      if (res.ok && data.token) {
        // Handle Remember Me
        if (rememberMe) {
          localStorage.setItem(
            REMEMBER_ME_KEY,
            JSON.stringify({ phone, rememberMe: true }),
          );
          // Set longer expiry for cookies (30 days)
          document.cookie = `token=${data.token}; path=/; max-age=2592000`;
          document.cookie = `refresh_token=${data.refresh_token}; path=/; max-age=2592000`;
        } else {
          // Remove remembered credentials if unchecked
          localStorage.removeItem(REMEMBER_ME_KEY);
          // Set shorter expiry (1 day)
          document.cookie = `token=${data.token}; path=/; max-age=86400`;
          document.cookie = `refresh_token=${data.refresh_token}; path=/; max-age=604800`;
        }

        localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/dashboard");
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white min-h-screen w-full flex items-center justify-center font-['Inter',sans-serif]">
      <div className="bg-[#f9fafb] flex-[1_1_50%] h-screen flex flex-col items-center justify-center relative p-8">
        <div className="flex flex-col gap-[40px] items-start w-full max-w-[465px]">
          <div className="flex flex-col gap-[20px] items-start w-full">
            <Link href="/">
              <Logo className="text-black" />
            </Link>
            <div className="flex flex-col gap-[10px] items-start text-black">
              <h1 className="font-medium text-[32px] leading-tight">
                Welcome Back
              </h1>
              <p className="font-normal text-[14px]">
                <span className="text-[rgba(0,0,0,0.63)]">
                  Don’t have an account?
                </span>{" "}
                <Link
                  href="/sign-up"
                  className="text-[#135bec] hover:underline"
                >
                  Sign Up
                </Link>
              </p>
            </div>
          </div>

          <form
            className="flex flex-col gap-[20px] items-start w-full"
            onSubmit={handleLogin}
          >
            {error && (
              <div className="text-red-500 text-sm font-['Montserrat',sans-serif] w-full text-center bg-red-50 py-2 rounded-[8px]">
                {error}
              </div>
            )}
            <div className="flex flex-col gap-[10px] items-start w-full">
              <label className="font-['Montserrat',sans-serif] font-normal text-[#151515] text-[12px]">
                Phone Number
              </label>
              <div className="bg-white h-[44px] relative rounded-[12px] w-full border border-[#e5e7eb] focus-within:border-[#135bec] transition-colors">
                <input
                  type="tel"
                  placeholder="+251980633712"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full h-full px-[20px] py-[10px] rounded-[12px] bg-transparent outline-none font-['Montserrat',sans-serif] text-[14px] text-black placeholder:text-[#9ca3c1]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-[10px] items-start w-full">
              <label className="font-['Montserrat',sans-serif] font-normal text-[#151515] text-[12px]">
                Password
              </label>
              <div className="bg-white h-[44px] relative rounded-[12px] w-full border border-[#e5e7eb] focus-within:border-[#135bec] transition-colors">
                <input
                  type="password"
                  placeholder="Enter Your Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-full px-[20px] py-[10px] rounded-[12px] bg-transparent outline-none font-['Montserrat',sans-serif] text-[14px] text-black placeholder:text-[#9ca3c1]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-[30px] items-start w-full mt-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-[#135bec] rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] w-full py-[11px] px-[16px] text-white font-medium text-[16px] leading-[20px] hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-[#2189ff] flex-[1_1_50%] h-screen hidden lg:flex flex-col items-center justify-center relative p-12 overflow-hidden">
        {/* Grid Background overlay for aesthetic */}
        <div
          className="absolute inset-0 z-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)
            `,
            backgroundSize: "4rem 4rem",
          }}
        />

        <div className="flex flex-col gap-[24px] items-start justify-center max-w-[481px] z-10">
          <div className="h-[408px] w-full relative rounded-[17px] bg-black/10 overflow-hidden shadow-2xl">
            <img
              alt="Shop operations"
              className="absolute w-full h-full object-cover"
              src={"/images/imgImage2.png"}
            />
          </div>
          <div className="flex flex-col gap-[12px]">
            <h2 className="font-medium text-[32px] text-white leading-tight">
              Manage your shop operations effortlessly
            </h2>
            <p className="font-medium text-[16px] text-[rgba(255,255,255,0.77)] leading-relaxed">
              Track sales, manage inventory, and monitor expenses all in one
              powerful platform built for mini-markets and retail stores.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
