'use client'
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
        }
    });

    const onSubmit = async (data: SignUpFormValues) => {
        setServerError("");
        setLoading(true);
        
        const name = `${data.firstName} ${data.lastName}`.trim();

        try {
            const res = await fetch("http://localhost:8080/api/v1/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    phone: data.phone, 
                    email: data.email, 
                    password: data.password, 
                    name 
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
                            <h1 className="font-medium text-[32px] leading-tight">Create Your Account</h1>
                            <p className="font-normal text-[14px]">
                                <span className="text-[rgba(0,0,0,0.63)]">Already have an account?</span>{' '}
                                <Link href="/login" className="text-[#135bec] hover:underline">Sign In</Link>
                            </p>
                        </div>
                    </div>

                    <form className="flex flex-col gap-[20px] items-start w-full" onSubmit={handleSubmit(onSubmit)}>
                        {serverError && <div className="text-red-500 text-sm font-['Montserrat',sans-serif] w-full text-center bg-red-50 py-2 rounded-[8px]">{serverError}</div>}

                        <div className="flex gap-[20px] items-start w-full">
                            <div className="flex flex-col gap-[10px] items-start w-full">
                                <label className="font-['Montserrat',sans-serif] font-normal text-[#151515] text-[12px]">First Name</label>
                                <div className={`bg-white h-[44px] relative rounded-[12px] w-full border ${errors.firstName ? 'border-red-500' : 'border-[#e5e7eb] focus-within:border-[#135bec]'} transition-colors`}>
                                    <input
                                        type="text"
                                        placeholder="Nathan"
                                        {...register("firstName")}
                                        className="w-full h-full px-[20px] py-[10px] rounded-[12px] bg-transparent outline-none font-['Montserrat',sans-serif] text-[14px] text-black placeholder:text-[#9ca3c1]"
                                    />
                                </div>
                                {errors.firstName && <span className="text-red-500 text-xs">{errors.firstName.message}</span>}
                            </div>
                            <div className="flex flex-col gap-[10px] items-start w-full">
                                <label className="font-['Montserrat',sans-serif] font-normal text-[#151515] text-[12px]">Last Name</label>
                                <div className={`bg-white h-[44px] relative rounded-[12px] w-full border ${errors.lastName ? 'border-red-500' : 'border-[#e5e7eb] focus-within:border-[#135bec]'} transition-colors`}>
                                    <input
                                        type="text"
                                        placeholder="Assefa"
                                        {...register("lastName")}
                                        className="w-full h-full px-[20px] py-[10px] rounded-[12px] bg-transparent outline-none font-['Montserrat',sans-serif] text-[14px] text-black placeholder:text-[#9ca3c1]"
                                    />
                                </div>
                                {errors.lastName && <span className="text-red-500 text-xs">{errors.lastName.message}</span>}
                            </div>
                        </div>

                        <div className="flex flex-col gap-[10px] items-start w-full">
                            <label className="font-['Montserrat',sans-serif] font-normal text-[#151515] text-[12px]">Phone Number</label>
                            <div className={`bg-white h-[44px] relative rounded-[12px] w-full border ${errors.phone ? 'border-red-500' : 'border-[#e5e7eb] focus-within:border-[#135bec]'} transition-colors`}>
                                <input
                                    type="tel"
                                    placeholder="+251980633712"
                                    {...register("phone")}
                                    className="w-full h-full px-[20px] py-[10px] rounded-[12px] bg-transparent outline-none font-['Montserrat',sans-serif] text-[14px] text-black placeholder:text-[#9ca3c1]"
                                />
                            </div>
                            {errors.phone && <span className="text-red-500 text-xs">{errors.phone.message}</span>}
                        </div>

                        <div className="flex flex-col gap-[10px] items-start w-full">
                            <label className="font-['Montserrat',sans-serif] font-normal text-[#151515] text-[12px]">Email</label>
                            <div className={`bg-white h-[44px] relative rounded-[12px] w-full border ${errors.email ? 'border-red-500' : 'border-[#e5e7eb] focus-within:border-[#135bec]'} transition-colors`}>
                                <input
                                    type="email"
                                    placeholder="name@gmail.com"
                                    {...register("email")}
                                    className="w-full h-full px-[20px] py-[10px] rounded-[12px] bg-transparent outline-none font-['Montserrat',sans-serif] text-[14px] text-black placeholder:text-[#9ca3c1]"
                                />
                            </div>
                            {errors.email && <span className="text-red-500 text-xs">{errors.email.message}</span>}
                        </div>

                        <div className="flex flex-col gap-[10px] items-start w-full">
                            <label className="font-['Montserrat',sans-serif] font-normal text-[#151515] text-[12px]">Password</label>
                            <div className={`bg-white h-[44px] relative rounded-[12px] w-full border ${errors.password ? 'border-red-500' : 'border-[#e5e7eb] focus-within:border-[#135bec]'} transition-colors`}>
                                <input
                                    type="password"
                                    placeholder="Enter Your Password"
                                    {...register("password")}
                                    className="w-full h-full px-[20px] py-[10px] rounded-[12px] bg-transparent outline-none font-['Montserrat',sans-serif] text-[14px] text-black placeholder:text-[#9ca3c1]"
                                />
                            </div>
                            {errors.password && <span className="text-red-500 text-xs">{errors.password.message}</span>}
                        </div>

                        <div className="flex flex-col items-start w-full">
                            <div className="flex gap-[10px] items-center justify-start relative">
                                <div className={`bg-white relative rounded-[7px] size-[20px] border ${errors.agreed ? 'border-red-500' : 'border-[#e5e7eb]'} flex items-center justify-center cursor-pointer shrink-0`}>
                                    <input 
                                        type="checkbox" 
                                        {...register("agreed")}
                                        className="opacity-0 absolute inset-0 cursor-pointer z-10 peer" 
                                    />
                                    {/* Workaround for react-hook-form uncontrolled checkbox styling */}
                                    <svg className="w-3 h-3 text-[#135bec] pointer-events-none absolute hidden peer-checked:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <label className="font-['Montserrat',sans-serif] font-normal text-[#484848] text-[12px]">
                                    I agree to the <a href="#" className="font-medium text-[#135bec] hover:underline" onClick={(e) => e.stopPropagation()}>Terms of Service</a> and <a href="#" className="font-medium text-[#135bec] hover:underline" onClick={(e) => e.stopPropagation()}>Privacy Policy</a>
                                </label>
                            </div>
                            {errors.agreed && <span className="text-red-500 text-xs mt-1">{errors.agreed.message}</span>}
                        </div>

                        <div className="flex flex-col gap-[30px] items-start w-full mt-2">
                            <button type="submit" disabled={loading} className="bg-[#135bec] rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] w-full py-[11px] px-[16px] text-white font-medium text-[16px] leading-[20px] hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
                                {loading ? "Creating Account..." : "Create Account"}
                            </button>

                            <div className="flex gap-[10px] items-center w-full">
                                <div className="bg-[#dedede] flex-1 h-px" />
                                <span className="font-['Montserrat',sans-serif] font-normal text-[#707070] text-[14px]">Or Continue With</span>
                                <div className="bg-[#dedede] flex-1 h-px" />
                            </div>

                            <div className="flex gap-[10px] items-start justify-center w-full">
                                <button type="button" className="flex-1 rounded-[12px] border border-[#cecece] bg-white hover:bg-gray-50 transition-colors flex items-center justify-center py-[8px] px-[16px] gap-[8px]">
                                    <div className="relative size-[23px]">
                                        <svg width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M21.5625 13.6562C21.5625 8.625 19.0469 5.03125 15.8125 5.03125C13.2969 5.03125 11.5 7.90625 11.5 7.90625C10.0625 10.0625 10.0625 14.0156 12.2188 9.70312C12.2188 9.70312 14.0156 6.82812 15.8125 6.82812C18.3281 6.82812 19.6537 11.1406 19.6537 13.6562C19.6537 14.375 19.4062 15.8125 17.9688 15.8125V17.9688C19.4062 17.9688 21.5625 16.8906 21.5625 13.6562Z" fill="url(#paint0_radial_26_344)" />
                                            <path d="M7.1875 5.03125V7.1875C4.8875 7.475 3.59375 11.1406 3.59375 13.6562C3.59375 14.375 3.95313 15.8125 5.03125 15.8125C6.82813 15.8125 8.89434 11.845 10.7813 8.94311C11.7829 7.40262 12.78 8.72533 12.0197 10.0625C10.2183 13.2308 8.41442 17.9688 5.03125 17.9688C3.59375 17.9688 1.4375 16.8906 1.4375 13.6562C1.4375 7.1875 5.39063 5.03125 7.1875 5.03125Z" fill="url(#paint1_radial_26_344)" />
                                            <path d="M17.9688 15.8125C15.4531 15.8125 12.5781 5.03125 7.1875 5.03125V7.1875C11.5 7.1875 13.2969 17.9688 17.9688 17.9688V15.8125Z" fill="#0768E1" />
                                            <defs>
                                                <radialGradient id="paint0_radial_26_344" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(17.9687 17.25) rotate(-101.31) scale(12.8272 9.97673)">
                                                    <stop stop-color="#0768E1" />
                                                    <stop offset="1" stop-color="#0082FB" />
                                                </radialGradient>
                                                <radialGradient id="paint1_radial_26_344" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(7.1875 6.46875) rotate(154.537) scale(8.35885 4.38415)">
                                                    <stop stop-color="#0768E1" />
                                                    <stop offset="1" stop-color="#0082FB" />
                                                </radialGradient>
                                            </defs>
                                        </svg>

                                    </div>
                                    <span className="font-medium text-[#5f5f5f] text-[15px]">Meta</span>
                                </button>
                                <button type="button" className="flex-1 rounded-[12px] border border-[#cecece] bg-white hover:bg-gray-50 transition-colors flex items-center justify-center py-[8px] px-[16px] gap-[8px]">
                                    <div className="relative size-[22px] flex items-center justify-center">
                                        <svg viewBox="0 0 24 24" className="w-5 h-5">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                    </div>
                                    <span className="font-medium text-[#5f5f5f] text-[15px]">Google</span>
                                </button>
                            </div>
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
                        backgroundSize: '4rem 4rem',
                    }}
                />

                <div className="flex flex-col gap-[24px] items-start justify-center max-w-[481px] z-10">
                    <div className="h-[408px] w-full relative rounded-[17px] bg-black/10 overflow-hidden shadow-2xl">
                        <img alt="Shop owner" className="absolute w-full h-full object-cover" src={'/images/imgImage3.png'} />
                    </div>
                    <div className="flex flex-col gap-[12px]">
                        <h2 className="font-medium text-[32px] text-white leading-tight">
                            Join 500+ shop owners who trust ShopOps
                        </h2>
                        <p className="font-medium text-[16px] text-[rgba(255,255,255,0.77)] leading-relaxed">
                            Track sales, manage inventory, and monitor expenses all in one powerful platform built for mini-markets and retail stores.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
