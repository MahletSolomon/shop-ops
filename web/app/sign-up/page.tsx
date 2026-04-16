"use client";
import Logo from "@/components/Logo";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const signUpSchema = z.object({
  firstName: z.string().min(2, "First Name must be at least 2 characters"),
  lastName: z.string().min(2, "Last Name must be at least 2 characters"),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  agreed: z.boolean().refine((val) => val === true, {
    message: "You must agree to the Terms of Service and Privacy Policy.",
  }),
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1";

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      password: "",
      agreed: false,
    },
  });

  const onSubmit = async (data: SignUpFormValues) => {
    setServerError("");
    setLoading(true);

    const name = `${data.firstName} ${data.lastName}`.trim();

    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: data.phone,
          email: data.email,
          password: data.password,
          name,
        }),
      });
      const resData = await res.json();

      if (res.ok) {
        // Check if the registration directly signs them in or just creates the account
        if (resData.token) {
          document.cookie = `token=${resData.token}; path=/; max-age=86400`;
          document.cookie = `refresh_token=${resData.refresh_token}; path=/; max-age=604800`;
          localStorage.setItem("user", JSON.stringify(resData.user));
          router.push("/dashboard");
        } else {
          router.push("/login");
        }
      } else {
        setServerError(resData.message || "Registration failed");
      }
    } catch (err) {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white min-h-screen w-full flex items-center justify-center font-['Inter',sans-serif] flex-row-reverse">
      <div className="bg-[#f9fafb] flex-[1_1_50%] min-h-screen flex flex-col items-center justify-center relative p-8 py-12">
        <div className="flex flex-col gap-[40px] items-start w-full max-w-[465px]">
          <div className="flex flex-col gap-[20px] items-start w-full">
            <Link href="/">
              <Logo className="text-black" />
            </Link>
            <div className="flex flex-col gap-[10px] items-start text-black">
              <h1 className="font-medium text-[32px] leading-tight">
                Create Your Account
              </h1>
              <p className="font-normal text-[14px]">
                <span className="text-[rgba(0,0,0,0.63)]">
                  Already have an account?
                </span>{" "}
                <Link href="/login" className="text-[#135bec] hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </div>

          <form
            className="flex flex-col gap-[20px] items-start w-full"
            onSubmit={handleSubmit(onSubmit)}
          >
            {serverError && (
              <div className="text-red-500 text-sm font-['Montserrat',sans-serif] w-full text-center bg-red-50 py-2 rounded-[8px]">
                {serverError}
              </div>
            )}

            <div className="flex gap-[20px] items-start w-full">
              <div className="flex flex-col gap-[10px] items-start w-full">
                <label className="font-['Montserrat',sans-serif] font-normal text-[#151515] text-[12px]">
                  First Name
                </label>
                <div
                  className={`bg-white h-[44px] relative rounded-[12px] w-full border ${errors.firstName ? "border-red-500" : "border-[#e5e7eb] focus-within:border-[#135bec]"} transition-colors`}
                >
                  <input
                    type="text"
                    placeholder="Nathan"
                    {...register("firstName")}
                    className="w-full h-full px-[20px] py-[10px] rounded-[12px] bg-transparent outline-none font-['Montserrat',sans-serif] text-[14px] text-black placeholder:text-[#9ca3c1]"
                  />
                </div>
                {errors.firstName && (
                  <span className="text-red-500 text-xs">
                    {errors.firstName.message}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-[10px] items-start w-full">
                <label className="font-['Montserrat',sans-serif] font-normal text-[#151515] text-[12px]">
                  Last Name
                </label>
                <div
                  className={`bg-white h-[44px] relative rounded-[12px] w-full border ${errors.lastName ? "border-red-500" : "border-[#e5e7eb] focus-within:border-[#135bec]"} transition-colors`}
                >
                  <input
                    type="text"
                    placeholder="Assefa"
                    {...register("lastName")}
                    className="w-full h-full px-[20px] py-[10px] rounded-[12px] bg-transparent outline-none font-['Montserrat',sans-serif] text-[14px] text-black placeholder:text-[#9ca3c1]"
                  />
                </div>
                {errors.lastName && (
                  <span className="text-red-500 text-xs">
                    {errors.lastName.message}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-[10px] items-start w-full">
              <label className="font-['Montserrat',sans-serif] font-normal text-[#151515] text-[12px]">
                Phone Number
              </label>
              <div
                className={`bg-white h-[44px] relative rounded-[12px] w-full border ${errors.phone ? "border-red-500" : "border-[#e5e7eb] focus-within:border-[#135bec]"} transition-colors`}
              >
                <input
                  type="tel"
                  placeholder="+251980633712"
                  {...register("phone")}
                  className="w-full h-full px-[20px] py-[10px] rounded-[12px] bg-transparent outline-none font-['Montserrat',sans-serif] text-[14px] text-black placeholder:text-[#9ca3c1]"
                />
              </div>
              {errors.phone && (
                <span className="text-red-500 text-xs">
                  {errors.phone.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-[10px] items-start w-full">
              <label className="font-['Montserrat',sans-serif] font-normal text-[#151515] text-[12px]">
                Email
              </label>
              <div
                className={`bg-white h-[44px] relative rounded-[12px] w-full border ${errors.email ? "border-red-500" : "border-[#e5e7eb] focus-within:border-[#135bec]"} transition-colors`}
              >
                <input
                  type="email"
                  placeholder="name@gmail.com"
                  {...register("email")}
                  className="w-full h-full px-[20px] py-[10px] rounded-[12px] bg-transparent outline-none font-['Montserrat',sans-serif] text-[14px] text-black placeholder:text-[#9ca3c1]"
                />
              </div>
              {errors.email && (
                <span className="text-red-500 text-xs">
                  {errors.email.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-[10px] items-start w-full">
              <label className="font-['Montserrat',sans-serif] font-normal text-[#151515] text-[12px]">
                Password
              </label>
              <div
                className={`bg-white h-[44px] relative rounded-[12px] w-full border ${errors.password ? "border-red-500" : "border-[#e5e7eb] focus-within:border-[#135bec]"} transition-colors`}
              >
                <input
                  type="password"
                  placeholder="Enter Your Password"
                  {...register("password")}
                  className="w-full h-full px-[20px] py-[10px] rounded-[12px] bg-transparent outline-none font-['Montserrat',sans-serif] text-[14px] text-black placeholder:text-[#9ca3c1]"
                />
              </div>
              {errors.password && (
                <span className="text-red-500 text-xs">
                  {errors.password.message}
                </span>
              )}
            </div>

            <div className="flex flex-col items-start w-full">
              <div className="flex gap-[10px] items-center justify-start relative">
                <div
                  className={`bg-white relative rounded-[7px] size-[20px] border ${errors.agreed ? "border-red-500" : "border-[#e5e7eb]"} flex items-center justify-center cursor-pointer shrink-0`}
                >
                  <input
                    type="checkbox"
                    {...register("agreed")}
                    className="opacity-0 absolute inset-0 cursor-pointer z-10 peer"
                  />
                  {/* Workaround for react-hook-form uncontrolled checkbox styling */}
                  <svg
                    className="w-3 h-3 text-[#135bec] pointer-events-none absolute hidden peer-checked:block"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <label className="font-['Montserrat',sans-serif] font-normal text-[#484848] text-[12px]">
                  I agree to the{" "}
                  <a
                    href="#"
                    className="font-medium text-[#135bec] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="#"
                    className="font-medium text-[#135bec] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Privacy Policy
                  </a>
                </label>
              </div>
              {errors.agreed && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.agreed.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-[30px] items-start w-full mt-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-[#135bec] rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] w-full py-[11px] px-[16px] text-white font-medium text-[16px] leading-[20px] hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-[#172134] flex-[1_1_50%] min-h-screen hidden lg:flex flex-col items-center justify-center relative p-12 overflow-hidden">
        {/* Grid Background overlay for aesthetic */}
        <div
          className="absolute inset-0 z-0 opacity-10 pointer-events-none"
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
              alt="Shop owner"
              className="absolute w-full h-full object-cover"
              src={"/images/imgImage3.png"}
            />
          </div>
          <div className="flex flex-col gap-[12px]">
            <h2 className="font-medium text-[32px] text-white leading-tight">
              Join 500+ shop owners who trust ShopOps
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
