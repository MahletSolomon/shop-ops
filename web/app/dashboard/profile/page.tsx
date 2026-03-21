"use client";

import React, { useMemo, useState } from "react";
import PageTitle from "@/app/components/ui/PageTitle";
import Card from "@/app/components/ui/Card";
import {
  Activity,
  Bell,
  Building2,
  Clock3,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";

type ProfileDetails = {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  branch: string;
  address: string;
  bio: string;
  timezone: string;
  language: string;
  emailAlerts: boolean;
  smsAlerts: boolean;
  twoFactorEnabled: boolean;
};

type ActivityItem = {
  id: number;
  title: string;
  description: string;
  timestamp: string;
};

const defaultProfile: ProfileDetails = {
  fullName: "James Abera",
  email: "james.abera@merkato-mini.com",
  phone: "+251 91 234 5678",
  role: "Manager",
  branch: "Merkato Mini-Market",
  address: "Arada Sub City, Addis Ababa",
  bio: "Oversees daily store operations, inventory planning, and staff coordination.",
  timezone: "Africa/Addis_Ababa",
  language: "English",
  emailAlerts: true,
  smsAlerts: false,
  twoFactorEnabled: true,
};

const recentActivity: ActivityItem[] = [
  {
    id: 1,
    title: "Updated product restock threshold",
    description: "Set low-stock alert for Rice (25kg) to 15 units.",
    timestamp: "Today, 09:14 AM",
  },
  {
    id: 2,
    title: "Approved daily expense",
    description: "Approved transport expense of Br 1,950.00.",
    timestamp: "Yesterday, 05:22 PM",
  },
  {
    id: 3,
    title: "Signed in from dashboard",
    description: "Successful login from in-store terminal.",
    timestamp: "Yesterday, 08:02 AM",
  },
];

const inputClassName =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";

export default function ProfilePage() {
  const [savedProfile, setSavedProfile] = useState<ProfileDetails>(defaultProfile);
  const [draftProfile, setDraftProfile] = useState<ProfileDetails>(defaultProfile);
  const [isEditing, setIsEditing] = useState(false);

  const activeProfile = isEditing ? draftProfile : savedProfile;

  const initials = useMemo(() => {
    const tokens = activeProfile.fullName.trim().split(" ").filter(Boolean);
    if (tokens.length === 0) return "NA";
    return tokens
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }, [activeProfile.fullName]);

  const handleFieldChange = <K extends keyof ProfileDetails>(
    key: K,
    value: ProfileDetails[K],
  ) => {
    setDraftProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleStartEdit = () => {
    setDraftProfile(savedProfile);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraftProfile(savedProfile);
    setIsEditing(false);
  };

  const handleSave = () => {
    setSavedProfile(draftProfile);
    setIsEditing(false);
  };

  const handleResetDefaults = () => {
    setSavedProfile(defaultProfile);
    setDraftProfile(defaultProfile);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col space-y-4">
      <PageTitle
        title="Profile"
        subtitle="Manage personal information, preferences, and security settings"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card
          title="Role"
          value={savedProfile.role}
          icon={ShieldCheck}
          iconWrapperClass="bg-indigo-50 text-indigo-600"
          trend=""
          trendDirection="up"
          description="Current access level"
        />
        <Card
          title="Branch"
          value={savedProfile.branch}
          icon={Building2}
          iconWrapperClass="bg-emerald-50 text-emerald-600"
          trend=""
          trendDirection="up"
          description="Assigned store"
        />
        <Card
          title="Security"
          value={savedProfile.twoFactorEnabled ? "2FA On" : "2FA Off"}
          icon={KeyRound}
          iconWrapperClass="bg-amber-50 text-amber-600"
          trend=""
          trendDirection="up"
          description="Two-factor authentication"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full border border-indigo-200 bg-indigo-100 text-lg font-bold text-indigo-700 flex items-center justify-center">
              {initials}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900 break-words">{activeProfile.fullName}</h2>
              <p className="text-sm text-slate-500">{activeProfile.role}</p>
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
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 sm:w-auto"
                >
                  Save changes
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
              onClick={handleResetDefaults}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 sm:w-auto"
            >
              Reset defaults
            </button>
          </div>
        </div>

        <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-2">
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Personal Details
            </h3>

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
                  {savedProfile.fullName}
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
                  {savedProfile.email}
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
                  {savedProfile.phone}
                </p>
              )}
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Bio</span>
              {isEditing ? (
                <textarea
                  value={draftProfile.bio}
                  onChange={(event) => handleFieldChange("bio", event.target.value)}
                  className={`${inputClassName} min-h-24`}
                />
              ) : (
                <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {savedProfile.bio}
                </p>
              )}
            </label>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Work and Preferences
            </h3>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Role</span>
              {isEditing ? (
                <input
                  value={draftProfile.role}
                  onChange={(event) => handleFieldChange("role", event.target.value)}
                  className={inputClassName}
                />
              ) : (
                <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {savedProfile.role}
                </p>
              )}
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Branch</span>
              {isEditing ? (
                <input
                  value={draftProfile.branch}
                  onChange={(event) => handleFieldChange("branch", event.target.value)}
                  className={inputClassName}
                />
              ) : (
                <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {savedProfile.branch}
                </p>
              )}
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Address</span>
              {isEditing ? (
                <input
                  value={draftProfile.address}
                  onChange={(event) => handleFieldChange("address", event.target.value)}
                  className={inputClassName}
                />
              ) : (
                <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {savedProfile.address}
                </p>
              )}
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-500">Timezone</span>
                {isEditing ? (
                  <input
                    value={draftProfile.timezone}
                    onChange={(event) => handleFieldChange("timezone", event.target.value)}
                    className={inputClassName}
                  />
                ) : (
                  <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {savedProfile.timezone}
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
                    {savedProfile.language}
                  </p>
                )}
              </label>
            </div>
          </section>
        </div>
      </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <User className="h-4 w-4 text-indigo-500" />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Profile Status</p>
              <p className="text-sm font-medium text-slate-700">Active</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <Clock3 className="h-4 w-4 text-indigo-500" />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Local Timezone</p>
              <p className="text-sm font-medium text-slate-700">{savedProfile.timezone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <Bell className="h-4 w-4 text-indigo-500" />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Alerts</p>
              <p className="text-sm font-medium text-slate-700">
                {savedProfile.emailAlerts || savedProfile.smsAlerts ? "Enabled" : "Disabled"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <Activity className="h-4 w-4 text-indigo-500" />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Sessions</p>
              <p className="text-sm font-medium text-slate-700">1 Active Device</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col w-full">


        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Recent Activity
          </h3>

          <div className="mt-4 space-y-3">
            {recentActivity.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-700">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                <p className="mt-2 text-[11px] text-slate-400">{item.timestamp}</p>
              </div>
            ))}
          </div>
        </div>
      </div>


    
    </div>
  );
}
