"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, KeyRound, ShieldCheck, HelpCircle } from "lucide-react";
import PageTitle from "@/app/components/ui/PageTitle";
import Card from "@/app/components/ui/Card";
import { useTour } from "@/app/hooks/useTour";
import { API_BASE_URL } from "@/lib/api";

type ProfileDetails = {
  fullName: string;
  email: string;
  phone: string;
  businessName: string;
  currency: string;
  language: string;
  timezone: string;
  tier: string;
};

type ApiUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  updated_at: string;
};

type ApiBusiness = {
  id: string;
  user_id: string;
  name: string;
  currency: string;
  language: string;
  timezone: string;
  tier: string;
  created_at: string;
  updated_at: string;
};

const ACCESS_TOKEN_KEYS = ["token", "access_token", "authToken"];

const inputClassName =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";

const defaultProfile: ProfileDetails = {
  fullName: "",
  email: "",
  phone: "",
  businessName: "",
  currency: "USD",
  language: "en",
  timezone: "UTC",
  tier: "FREE",
};

const getAccessToken = () => {
  if (typeof window === "undefined") {
    return null;
  }

  for (const key of ACCESS_TOKEN_KEYS) {
    const value = window.localStorage.getItem(key);
    if (value) {
      return value;
    }
  }

  const cookieToken = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("token="))
    ?.split("=")[1];

  return cookieToken ? decodeURIComponent(cookieToken) : null;
};

type ApiError = {
  error?: string;
  message?: string;
  details?: string;
};

const parseApiError = async (response: Response) => {
  let body: ApiError | null = null;

  try {
    body = (await response.json()) as ApiError;
  } catch {
    body = null;
  }

  return body?.error || body?.message || body?.details || `Request failed (${response.status})`;
};

const requestWithAuth = async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No auth token found. Please sign in again.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return (await response.json()) as T;
};

const mapDataToProfile = (user: ApiUser, business: ApiBusiness | null): ProfileDetails => ({
  fullName: user.name ?? "",
  email: user.email ?? "",
  phone: user.phone ?? "",
  businessName: business?.name ?? "",
  currency: business?.currency ?? "USD",
  language: business?.language ?? "en",
  timezone: business?.timezone ?? "UTC",
  tier: business?.tier ?? "FREE",
});

export default function ProfilePage() {
  const router = useRouter();
  const { resetTour } = useTour();

  const [savedProfile, setSavedProfile] = useState<ProfileDetails>(defaultProfile);
  const [draftProfile, setDraftProfile] = useState<ProfileDetails>(defaultProfile);

  const [businesses, setBusinesses] = useState<ApiBusiness[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const [phoneCurrentPassword, setPhoneCurrentPassword] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const activeProfile = isEditing ? draftProfile : savedProfile;

  const initials = useMemo(() => {
    const tokens = activeProfile.fullName.trim().split(" ").filter(Boolean);
    if (tokens.length === 0) return "NA";
    return tokens
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }, [activeProfile.fullName]);

  const fetchProfile = async () => {
    setIsLoadingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const [user, businesses] = await Promise.all([
        requestWithAuth<ApiUser>("/users/me", { method: "GET" }),
        requestWithAuth<ApiBusiness[]>("/businesses", { method: "GET" }),
      ]);

      const primaryBusiness = businesses.length > 0 ? businesses[0] : null;
      const mapped = mapDataToProfile(user, primaryBusiness);

      setBusinesses(businesses);
      setSelectedBusinessId(primaryBusiness?.id ?? null);
      setSavedProfile(mapped);
      setDraftProfile(mapped);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Failed to load profile");
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleFieldChange = <K extends keyof ProfileDetails>(key: K, value: ProfileDetails[K]) => {
    setDraftProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleStartEdit = () => {
    setProfileError(null);
    setProfileSuccess(null);
    setDraftProfile(savedProfile);
    setPhoneCurrentPassword("");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setProfileError(null);
    setProfileSuccess(null);
    setDraftProfile(savedProfile);
    setPhoneCurrentPassword("");
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      let nextProfile = { ...savedProfile };

      const nameChanged = draftProfile.fullName.trim() !== savedProfile.fullName.trim();
      const emailChanged = draftProfile.email.trim() !== savedProfile.email.trim();
      const phoneChanged = draftProfile.phone.trim() !== savedProfile.phone.trim();

      const businessNameChanged =
        draftProfile.businessName.trim() !== savedProfile.businessName.trim();
      const currencyChanged = draftProfile.currency.trim() !== savedProfile.currency.trim();
      const languageChanged = draftProfile.language.trim() !== savedProfile.language.trim();

      if (nameChanged || emailChanged) {
        const updatedUser = await requestWithAuth<ApiUser>("/users/me", {
          method: "PATCH",
          body: JSON.stringify({
            name: draftProfile.fullName.trim(),
            email: draftProfile.email.trim(),
          }),
        });

        nextProfile = {
          ...nextProfile,
          fullName: updatedUser.name ?? nextProfile.fullName,
          email: updatedUser.email ?? nextProfile.email,
        };
      }

      if (phoneChanged) {
        if (!phoneCurrentPassword) {
          throw new Error("Current password is required to change phone number.");
        }

        const updatedUser = await requestWithAuth<ApiUser>("/users/me/phone", {
          method: "PUT",
          body: JSON.stringify({
            current_password: phoneCurrentPassword,
            new_phone: draftProfile.phone.trim(),
          }),
        });

        nextProfile = {
          ...nextProfile,
          phone: updatedUser.phone ?? draftProfile.phone.trim(),
        };
      }

      if (businessNameChanged || currencyChanged || languageChanged) {
        if (selectedBusinessId) {
          const updatedBusiness = await requestWithAuth<ApiBusiness>(`/businesses/${selectedBusinessId}`, {
            method: "PATCH",
            body: JSON.stringify({
              name: draftProfile.businessName.trim(),
              currency: draftProfile.currency.trim().toUpperCase(),
              language: draftProfile.language.trim(),
            }),
          });

          setBusinesses((prev) =>
            prev.map((business) => (business.id === updatedBusiness.id ? updatedBusiness : business)),
          );

          nextProfile = {
            ...nextProfile,
            businessName: updatedBusiness.name,
            currency: updatedBusiness.currency,
            language: updatedBusiness.language,
            timezone: updatedBusiness.timezone,
            tier: updatedBusiness.tier,
          };
        } else {
          const createdBusiness = await requestWithAuth<ApiBusiness>("/businesses", {
            method: "POST",
            body: JSON.stringify({
              name: draftProfile.businessName.trim(),
              currency: draftProfile.currency.trim().toUpperCase(),
              language: draftProfile.language.trim(),
              timezone: draftProfile.timezone.trim(),
            }),
          });

          setBusinesses((prev) => [...prev, createdBusiness]);
          setSelectedBusinessId(createdBusiness.id);
          nextProfile = {
            ...nextProfile,
            businessName: createdBusiness.name,
            currency: createdBusiness.currency,
            language: createdBusiness.language,
            timezone: createdBusiness.timezone,
            tier: createdBusiness.tier,
          };
        }
      }

      if (
        !nameChanged &&
        !emailChanged &&
        !phoneChanged &&
        !businessNameChanged &&
        !currencyChanged &&
        !languageChanged
      ) {
        setProfileSuccess("No changes to save.");
        setIsEditing(false);
        return;
      }

      setSavedProfile(nextProfile);
      setDraftProfile(nextProfile);
      setPhoneCurrentPassword("");
      setIsEditing(false);
      setProfileSuccess("Profile updated successfully.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleReload = () => {
    setIsEditing(false);
    setPhoneCurrentPassword("");
    fetchProfile();
  };

  const handleBusinessChange = (businessId: string) => {
    setSelectedBusinessId(businessId);

    const business = businesses.find((item) => item.id === businessId);
    if (!business) {
      return;
    }

    setSavedProfile((prev) => ({
      ...prev,
      businessName: business.name,
      currency: business.currency,
      language: business.language,
      timezone: business.timezone,
      tier: business.tier,
    }));

    setDraftProfile((prev) => ({
      ...prev,
      businessName: business.name,
      currency: business.currency,
      language: business.language,
      timezone: business.timezone,
      tier: business.tier,
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setIsSavingPassword(true);

    try {
      await requestWithAuth<{ message: string }>("/users/me/password", {
        method: "PUT",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Password updated successfully.");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Failed to update password");
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <PageTitle
          title="Profile"
          subtitle="Manage your user and business information"
        />
        <div className="flex gap-2">
          <button
            onClick={resetTour}
            className="rounded-lg bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-100 flex items-center gap-2"
          >
            <HelpCircle size={16} />
            <span className="hidden sm:inline">Restart Tour</span>
          </button>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card
          title="Business"
          value={savedProfile.businessName || "Not set"}
          icon={Building2}
          iconWrapperClass="bg-emerald-50 text-emerald-600"
          trend=""
          trendDirection="up"
          description="Primary business"
        />
        <Card
          title="Tier"
          value={savedProfile.tier || "FREE"}
          icon={ShieldCheck}
          iconWrapperClass="bg-indigo-50 text-indigo-600"
          trend=""
          trendDirection="up"
          description="Subscription level"
        />
        <Card
          title="Currency"
          value={savedProfile.currency || "USD"}
          icon={KeyRound}
          iconWrapperClass="bg-amber-50 text-amber-600"
          trend=""
          trendDirection="up"
          description="Business currency"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-indigo-200 bg-indigo-100 text-lg font-bold text-indigo-700">
              {initials}
            </div>
            <div className="min-w-0">
              <h2 className="break-words text-lg font-semibold text-slate-900">{activeProfile.fullName || "Unnamed User"}</h2>
              <p className="text-sm text-slate-500">{activeProfile.businessName || "No business yet"}</p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSavingProfile}
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                >
                  {isSavingProfile ? "Saving..." : "Save changes"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleStartEdit}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 sm:w-auto"
              >
                Edit profile
              </button>
            )}
            <button
              type="button"
              onClick={handleReload}
              disabled={isLoadingProfile}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            >
              Reload profile
            </button>
          </div>
        </div>

        <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-2">
          <section className="space-y-4">
            {isLoadingProfile && (
              <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                Loading profile...
              </p>
            )}
            {profileError && (
              <p className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {profileError}
              </p>
            )}
            {profileSuccess && (
              <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {profileSuccess}
              </p>
            )}

            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">User Details</h3>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Full Name</span>
              {isEditing ? (
                <input
                  value={draftProfile.fullName}
                  onChange={(event) => handleFieldChange("fullName", event.target.value)}
                  className={inputClassName}
                />
              ) : (
                <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {savedProfile.fullName || "-"}
                </p>
              )}
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Email</span>
              {isEditing ? (
                <input
                  type="email"
                  value={draftProfile.email}
                  onChange={(event) => handleFieldChange("email", event.target.value)}
                  className={inputClassName}
                />
              ) : (
                <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {savedProfile.email || "-"}
                </p>
              )}
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Phone</span>
              {isEditing ? (
                <input
                  value={draftProfile.phone}
                  onChange={(event) => handleFieldChange("phone", event.target.value)}
                  className={inputClassName}
                />
              ) : (
                <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {savedProfile.phone || "-"}
                </p>
              )}
            </label>

            {isEditing && draftProfile.phone.trim() !== savedProfile.phone.trim() && (
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-500">
                  Current Password (required for phone change)
                </span>
                <input
                  type="password"
                  value={phoneCurrentPassword}
                  onChange={(event) => setPhoneCurrentPassword(event.target.value)}
                  className={inputClassName}
                />
              </label>
            )}
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Business Details</h3>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Select Business</span>
              <select
                value={selectedBusinessId ?? ""}
                onChange={(event) => handleBusinessChange(event.target.value)}
                disabled={isEditing || businesses.length === 0}
                className={inputClassName}
              >
                {businesses.length === 0 ? (
                  <option value="">No business found</option>
                ) : (
                  businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Business Name</span>
              {isEditing ? (
                <input
                  value={draftProfile.businessName}
                  onChange={(event) => handleFieldChange("businessName", event.target.value)}
                  className={inputClassName}
                />
              ) : (
                <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {savedProfile.businessName || "-"}
                </p>
              )}
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Currency</span>
              {isEditing ? (
                <input
                  value={draftProfile.currency}
                  onChange={(event) => handleFieldChange("currency", event.target.value.toUpperCase())}
                  className={inputClassName}
                />
              ) : (
                <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {savedProfile.currency || "-"}
                </p>
              )}
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Language</span>
              {isEditing ? (
                <input
                  value={draftProfile.language}
                  onChange={(event) => handleFieldChange("language", event.target.value)}
                  className={inputClassName}
                />
              ) : (
                <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {savedProfile.language || "-"}
                </p>
              )}
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Timezone</span>
              <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {savedProfile.timezone || "-"}
              </p>
            </label>
          </section>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Security</h3>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-xs font-medium text-slate-500">Current Password</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className={inputClassName}
              placeholder="Enter current password"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-500">New Password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className={inputClassName}
              placeholder="Enter new password"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-500">Confirm Password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClassName}
              placeholder="Confirm new password"
            />
          </label>
        </div>

        {passwordError && (
          <p className="mt-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {passwordError}
          </p>
        )}

        {passwordSuccess && (
          <p className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {passwordSuccess}
          </p>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={isSavingPassword}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSavingPassword ? "Updating..." : "Update password"}
          </button>
        </div>
      </div>
    </div>
  );
}
