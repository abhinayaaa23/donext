import React, { useState } from "react";
import { useApp } from "../context/AppContext.js";
import { User, Bell, Shield, Sliders, Save, LogOut } from "lucide-react";

export const SettingsView: React.FC = () => {
  const { user, logout } = useApp();
  
  // Local preferences state
  const [focusGoal, setFocusGoal] = useState("45");
  const [notifyWarnings, setNotifyWarnings] = useState(true);
  const [notifyAi, setNotifyAi] = useState(true);
  const [notifyDaily, setNotifyDaily] = useState(false);
  const [defaultPriority, setDefaultPriority] = useState("medium");
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 3000);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-8 animate-fadeIn text-[#2D2520] bg-transparent transition-colors duration-300">
      
      {/* Title Header */}
      <div className="border-b border-[#DCCFBE]/30 pb-5">
        <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold tracking-widest text-[#75162D] uppercase">
          <span>Preferences & Control</span>
          <span>/</span>
          <span>Setup</span>
        </div>
        <h2 className="text-3xl font-normal text-[#2D2520] flex items-center gap-2.5 font-display mt-1">
          <Sliders className="h-6 w-6 text-[#75162D]" />
          Settings
        </h2>
        <p className="text-xs text-[#6A625B] mt-1 font-light leading-relaxed">
          Customize your daily workload limits, notification center, and interactive planning parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Profile Sidebar Info Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="rounded-[10px] border border-[#DCCFBE] bg-[#FFFDF9] p-6 text-center space-y-5 shadow-xs transition-colors duration-300">
            <div className="mx-auto w-20 h-20 rounded-full bg-[#F8F3EC] border border-[#DCCFBE]/80 flex items-center justify-center font-bold text-[#75162D] text-3xl shadow-sm">
              {user?.displayName ? user.displayName.substring(0, 1).toUpperCase() : "U"}
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-[#2D2520]">
                {user?.displayName || "Guest Planner"}
              </h3>
              <p className="text-xs text-[#6A625B] truncate font-light" title={user?.email || "Local Client"}>
                {user?.email || "Offline Local Session"}
              </p>
            </div>

            <div className="pt-2 border-t border-[#DCCFBE]/30 flex justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-[10px] font-bold tracking-wider uppercase font-mono bg-[#F8F3EC] border border-[#DCCFBE]/30 text-[#75162D]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#5F7358] animate-pulse" />
                Active Account
              </span>
            </div>

            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 rounded-[8px] border border-[#75162D] bg-transparent hover:bg-[#75162D]/5 text-[#75162D] py-2.5 text-xs font-semibold cursor-pointer transition-all"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out Session</span>
            </button>
          </div>

          {/* Tips box */}
          <div className="rounded-[10px] bg-[#F8F3EC] p-5.5 border border-[#DCCFBE]/60 space-y-2.5 transition-colors">
            <h4 className="text-[10px] font-bold text-[#75162D] uppercase tracking-wider">Pacing Strategy</h4>
            <p className="text-xs text-[#6A625B] leading-relaxed font-light">
              We automatically recalibrate estimates by applying protective support adjustments. This ensures you never run out of breathing room when deadlines cluster.
            </p>
          </div>
        </div>

        {/* Major Settings Forms */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Preferences card */}
            <div className="rounded-[10px] border border-[#DCCFBE] bg-[#FFFDF9] p-6.5 shadow-xs space-y-5 transition-colors duration-300">
              <h3 className="text-sm font-semibold text-[#2D2520] flex items-center gap-2 font-sans pb-3 border-b border-[#DCCFBE]/30">
                <Sliders className="h-4.5 w-4.5 text-[#75162D]" />
                Planning Preferences
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#6A625B] uppercase tracking-wider">Default Focus Goal</label>
                  <select
                    value={focusGoal}
                    onChange={(e) => setFocusGoal(e.target.value)}
                    className="w-full rounded-[8px] border border-[#DCCFBE] bg-[#FFFDF9] text-[#2D2520] px-3.5 py-2.5 text-xs outline-hidden focus:border-[#75162D] focus:ring-1 focus:ring-[#75162D] transition-all font-medium"
                  >
                    <option value="25">25 mins (Pomodoro)</option>
                    <option value="45">45 mins (Balanced Focus)</option>
                    <option value="60">60 mins (Deep Session)</option>
                    <option value="90">90 mins (Extreme Drive)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#6A625B] uppercase tracking-wider">Default Task Priority</label>
                  <select
                    value={defaultPriority}
                    onChange={(e) => setDefaultPriority(e.target.value)}
                    className="w-full rounded-[8px] border border-[#DCCFBE] bg-[#FFFDF9] text-[#2D2520] px-3.5 py-2.5 text-xs outline-hidden focus:border-[#75162D] focus:ring-1 focus:ring-[#75162D] transition-all font-medium"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Notification triggers card */}
            <div className="rounded-[10px] border border-[#DCCFBE] bg-[#FFFDF9] p-6.5 shadow-xs space-y-5 transition-colors duration-300">
              <h3 className="text-sm font-semibold text-[#2D2520] flex items-center gap-2 font-sans pb-3 border-b border-[#DCCFBE]/30">
                <Bell className="h-4.5 w-4.5 text-[#75162D]" />
                Notification Alerts
              </h3>

              <div className="space-y-4">
                <label className="flex items-start gap-3.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyWarnings}
                    onChange={(e) => setNotifyWarnings(e.target.checked)}
                    className="rounded-[4px] border-[#DCCFBE] text-[#75162D] focus:ring-[#75162D] mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-semibold text-[#2D2520] block">Workload Risk Warnings</span>
                    <span className="text-[11px] text-[#6A625B] block mt-0.5 font-light leading-relaxed">
                      Receive alerts immediately when any upcoming days cross 5 hours of total estimated effort.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyAi}
                    onChange={(e) => setNotifyAi(e.target.checked)}
                    className="rounded-[4px] border-[#DCCFBE] text-[#75162D] focus:ring-[#75162D] mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-semibold text-[#2D2520] block">Gemini Decompose Alerts</span>
                    <span className="text-[11px] text-[#6A625B] block mt-0.5 font-light leading-relaxed">
                      Receive friendly confirmation summaries when Gemini decomposes active workload tasks into checkpoints.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyDaily}
                    onChange={(e) => setNotifyDaily(e.target.checked)}
                    className="rounded-[4px] border-[#DCCFBE] text-[#75162D] focus:ring-[#75162D] mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-semibold text-[#2D2520] block">Daily Planning Highlights</span>
                    <span className="text-[11px] text-[#6A625B] block mt-0.5 font-light leading-relaxed">
                      Send a peaceful morning focus overview containing today's recommended high-impact DoNext action.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Save Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {isSaved && (
                <span className="text-xs text-[#75162D] font-bold animate-pulse">
                  Settings saved successfully!
                </span>
              )}
              <button
                type="submit"
                className="rounded-[8px] bg-[#75162D] hover:bg-[#560B18] text-[#F5EFE6] px-6 py-3 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>Save Preferences</span>
              </button>
            </div>

          </form>
        </div>

      </div>

    </div>
  );
};
