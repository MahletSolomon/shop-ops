"use client";

import React, { useMemo, useState } from "react";
import PageTitle from "@/app/components/ui/PageTitle";
import { Moon, Save, SlidersHorizontal, Sun } from "lucide-react";
import { useTheme } from "@/app/components/providers/ThemeProvider";

type BasicSettings = {
  language: string;
  currency: string;
  lowStockAlerts: boolean;
  compactTables: boolean;
  startOnDashboard: boolean;
};

const defaultBasicSettings: BasicSettings = {
  language: "English",
  currency: "ETB (Br)",
  lowStockAlerts: true,
  compactTables: false,
  startOnDashboard: true,
};

const inputClassName =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";

const Toggle = ({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        enabled ? "bg-indigo-600" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
          enabled ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
};

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [savedSettings, setSavedSettings] = useState<BasicSettings>(defaultBasicSettings);
  const [draftSettings, setDraftSettings] = useState<BasicSettings>(defaultBasicSettings);
  const [statusMessage, setStatusMessage] = useState("");

  const hasChanges = useMemo(
    () => JSON.stringify(savedSettings) !== JSON.stringify(draftSettings),
    [savedSettings, draftSettings],
  );

  const updateField = <K extends keyof BasicSettings>(key: K, value: BasicSettings[K]) => {
    setDraftSettings((prev) => ({ ...prev, [key]: value }));
    setStatusMessage("");
  };

  const handleSave = () => {
    setSavedSettings(draftSettings);
    setStatusMessage("Settings saved locally.");
  };

  const handleCancel = () => {
    setDraftSettings(savedSettings);
    setStatusMessage("Unsaved changes discarded.");
  };

  const handleReset = () => {
    setTheme("light");
    setDraftSettings(defaultBasicSettings);
    setSavedSettings(defaultBasicSettings);
    setStatusMessage("Default settings restored.");
  };

  return (
    <div className="flex flex-col space-y-4">
      <PageTitle
        title="Settings"
        subtitle="Choose your theme and basic app preferences"
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-800">Settings</p>
            <p className="text-xs text-slate-500">
              Customize your experience and preferences
            </p>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={!hasChanges}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges}
              className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <Save size={14} />
              Save
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 sm:w-auto"
            >
              Reset defaults
            </button>
          </div>
        </div>

        {statusMessage && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            {statusMessage}
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4 sm:p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Theme</h3>

          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`rounded-xl border p-4 text-left transition ${
                theme === "light"
                  ? "border-indigo-400 bg-indigo-50"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2 text-slate-700">
                <Sun size={16} />
                <span className="text-sm font-medium">Light Theme</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Bright interface for daytime use</p>
            </button>

            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`rounded-xl border p-4 text-left transition ${
                theme === "dark"
                  ? "border-indigo-400 bg-indigo-50"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2 text-slate-700">
                <Moon size={16} />
                <span className="text-sm font-medium">Dark Theme</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Reduced brightness for low-light use</p>
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4 sm:p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">General</h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Language</span>
              <select
                className={inputClassName}
                value={draftSettings.language}
                onChange={(event) => updateField("language", event.target.value)}
              >
                <option>English</option>
                <option>Amharic</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Currency</span>
              <select
                className={inputClassName}
                value={draftSettings.currency}
                onChange={(event) => updateField("currency", event.target.value)}
              >
                <option>ETB (Br)</option>
                <option>USD ($)</option>
                <option>EUR (€)</option>
              </select>
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-slate-700">Low Stock Alerts</p>
                <p className="text-xs text-slate-500">Show alerts when stock is running low</p>
              </div>
              <Toggle
                enabled={draftSettings.lowStockAlerts}
                onToggle={() => updateField("lowStockAlerts", !draftSettings.lowStockAlerts)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-slate-700">Compact Tables</p>
                <p className="text-xs text-slate-500">Make dashboard tables denser</p>
              </div>
              <Toggle
                enabled={draftSettings.compactTables}
                onToggle={() => updateField("compactTables", !draftSettings.compactTables)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-slate-700">Start on Dashboard</p>
                <p className="text-xs text-slate-500">Open dashboard first after sign-in</p>
              </div>
              <Toggle
                enabled={draftSettings.startOnDashboard}
                onToggle={() =>
                  updateField("startOnDashboard", !draftSettings.startOnDashboard)
                }
              />
            </div>
          </div>
        </section>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <SlidersHorizontal size={14} />
          <span>{hasChanges ? "You have unsaved changes." : "All settings are up to date."}</span>
        </div>
      </div>
    </div>
  );
}
