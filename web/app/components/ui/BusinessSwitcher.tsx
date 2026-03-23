"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, Building2, Store, Check } from "lucide-react";

interface Business {
  id: string;
  name: string;
  currency: string;
  language: string;
  timezone: string;
}

export default function BusinessSwitcher() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("UTC");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getToken = () => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )token=([^;]+)'));
    if (match) return match[2];
    return null;
  };

  const fetchBusinesses = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch("http://localhost:8080/businesses", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
         const data = await res.json();
         const businessesList = data || [];
         setBusinesses(businessesList);
         if (businessesList.length > 0 && !activeBusiness) {
            setActiveBusiness(businessesList[0]); // fallback to first one
         }
      }
    } catch(e) {
      console.error("Failed to fetch businesses", e);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    if (activeBusiness) {
       localStorage.setItem("activeBusiness", JSON.stringify(activeBusiness));
       window.dispatchEvent(new Event("activeBusinessChanged"));
    }
  }, [activeBusiness]);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const clickOutside = (e: MouseEvent) => {
       if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
          setIsDropdownOpen(false);
       }
    };
    const keydown = (e: KeyboardEvent) => {
       if (e.key === "Escape") setIsDropdownOpen(false);
    };
    document.addEventListener("mousedown", clickOutside);
    document.addEventListener("keydown", keydown);
    return () => {
       document.removeEventListener("mousedown", clickOutside);
       document.removeEventListener("keydown", keydown);
    }
  }, [isDropdownOpen]);

  const handleCreate = async (e: React.FormEvent) => {
     e.preventDefault();
     setLoading(true);
     setError("");
     const token = getToken();
     if (!token) {
       setError("Not authenticated");
       setLoading(false);
       return;
     }

     try {
       const res = await fetch("http://localhost:8080/businesses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ name, currency, language, timezone })
       });
       const data = await res.json();
       if (res.ok) {
          setBusinesses(prev => [...prev, data]);
          setActiveBusiness(data);
          setIsDialogOpen(false);
          setName("");
          setCurrency("USD");
      } else {
        setError(data.error || "Failed to create business");
      }
     } catch (e) {
        setError("Error connecting to server");
     } finally {
       setLoading(false);
     }
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button 
           onClick={() => setIsDropdownOpen(p => !p)}
           className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all group"
        >
          <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-600 truncate max-w-[150px]">
            {activeBusiness ? activeBusiness.name : (businesses.length > 0 ? "Select Business" : "No Business")}
          </span>
          <ChevronDown size={16} className="text-slate-400 group-hover:text-indigo-600" />
        </button>

        {isDropdownOpen && (
           <div className="absolute left-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-lg z-30 py-2">
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Your Businesses</div>
              <ul className="max-h-60 overflow-y-auto">
                 {businesses.map(b => (
                   <li key={b.id}>
                     <button 
                       onClick={() => { setActiveBusiness(b); setIsDropdownOpen(false); }}
                       className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                     >
                        <div className="flex items-center gap-2 truncate">
                           <Store size={14} className="text-slate-400" />
                           <span className="truncate">{b.name}</span>
                        </div>
                        {activeBusiness?.id === b.id && <Check size={14} className="text-indigo-600 shrink-0" />}
                     </button>
                   </li>
                 ))}
                 {businesses.length === 0 && (
                   <div className="px-4 py-3 text-sm text-slate-500 text-center">No businesses found</div>
                 )}
              </ul>
              <div className="border-t border-slate-100 mt-2 pt-2 px-2">
                 <button 
                   onClick={() => { setIsDropdownOpen(false); setIsDialogOpen(true); }}
                   className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                 >
                   <Plus size={16} />
                   Create a business
                 </button>
              </div>
           </div>
        )}
      </div>

      {isDialogOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
               <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                     <Building2 size={20} className="text-indigo-600" />
                     Create New Business
                  </h3>
               </div>
               <form onSubmit={handleCreate} className="p-6">
                  {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
                  
                  <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="My Awesome Shop"
                          value={name} 
                          onChange={e => setName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        />
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                           <select 
                             value={currency} 
                             onChange={e => setCurrency(e.target.value)}
                             className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                           >
                             <option value="USD">USD ($)</option>
                             <option value="ETB">ETB (Br)</option>
                             <option value="KES">KES (KSh)</option>
                             <option value="NGN">NGN (₦)</option>
                             <option value="EUR">EUR (€)</option>
                             <option value="GBP">GBP (£)</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Language</label>
                           <select 
                             value={language} 
                             onChange={e => setLanguage(e.target.value)}
                             className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                           >
                             <option value="en">English</option>
                             <option value="fr">French</option>
                             <option value="sw">Swahili</option>
                             <option value="am">Amharic</option>
                           </select>
                        </div>
                     </div>
                     
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
                        <select 
                          value={timezone} 
                          onChange={e => setTimezone(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        >
                          <option value="UTC">UTC</option>
                          <option value="Africa/Addis_Ababa">East Africa Time (EAT)</option>
                          <option value="Africa/Nairobi">Nairobi (EAT)</option>
                          <option value="Africa/Lagos">West Africa Time (WAT)</option>
                          <option value="Africa/Johannesburg">South Africa Standard Time (SAST)</option>
                        </select>
                     </div>
                  </div>
                  
                  <div className="mt-8 flex items-center justify-end gap-3">
                     <button 
                       type="button" 
                       onClick={() => setIsDialogOpen(false)}
                       className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                     >
                        Cancel
                     </button>
                     <button 
                       type="submit" 
                       disabled={loading || !name}
                       className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
                     >
                        {loading ? "Creating..." : "Create Business"}
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </>
  );
}
