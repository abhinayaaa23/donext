import React, { useState, useEffect, useRef } from "react";
import { AppProvider, useApp } from "./context/AppContext.js";
import { AuthView } from "./components/AuthView.js";
import { DashboardView } from "./components/DashboardView.js";
import { AnalyticsView } from "./components/AnalyticsView.js";
import { SettingsView } from "./components/SettingsView.js";
import { NudgeChat } from "./components/NudgeChat.js";
import { MonogramDN } from "./components/MonogramDN.js";
import { 
  Sparkles, BarChart2, LayoutDashboard, Clock, 
  LogOut, Bell, Sliders, X, Check, AlertTriangle, Info, Menu
} from "lucide-react";

function MainAppContent() {
  const { 
    user, loadingAuth, logout, notifications, 
    markNotificationRead, clearAllNotifications 
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'insights' | 'settings'>('dashboard');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Unread notifications calculation
  const unreadNotifs = notifications.filter(n => !n.read);

  // Handle outside click to close notification popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Loading Session Screen
  if (loadingAuth) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5EFE6] transition-colors duration-300 font-sans">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-[10px] bg-[#75162D] text-[#F5EFE6] shadow-sm">
            <MonogramDN className="h-9 w-9 text-[#F5EFE6]" />
          </div>
          <div className="space-y-1.5 px-4">
            <h3 className="text-2xl font-normal text-[#2D2520] font-display tracking-wide">DoNext</h3>
            <p className="text-xs text-[#6A625B] max-w-xs font-light">Opening your supportive planner and aligning paces...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not Logged In View
  if (!user) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-[#F5EFE6] text-[#2D2520] flex flex-col font-sans transition-colors duration-300">
      
      {/* Top Header Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-[#DCCFBE] bg-[#FFFDF9]/90 backdrop-blur-md px-4 sm:px-6 py-4">
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-4">
          
          {/* Left Row: Hamburger + Logo Brand */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Hamburger Menu Trigger for Mobile */}
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="md:hidden p-2 -ml-1.5 rounded-[8px] border border-[#DCCFBE] bg-[#FFFDF9] text-[#6A625B] hover:text-[#75162D] hover:bg-[#F8F3EC] transition-colors cursor-pointer"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>

            {/* Logo Brand - slightly smaller on mobile */}
            <div className="flex items-center gap-2.5 md:gap-4 shrink-0">
              <div className="w-9 h-9 md:w-11 md:h-11 bg-[#75162D] rounded-[8px] md:rounded-[10px] flex items-center justify-center shadow-sm text-[#F5EFE6] transition-transform hover:scale-102">
                <MonogramDN className="h-6 w-6 md:h-8 md:w-8 text-[#F5EFE6]" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-normal tracking-wide text-[#2D2520] font-display leading-none">DoNext</h1>
              </div>
            </div>
          </div>

          {/* Navigation Tabs (Desktop only) */}
          <nav className="hidden md:flex items-center bg-[#F8F3EC] p-1 rounded-[10px] gap-1 border border-[#DCCFBE]">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-1.5 rounded-[8px] text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "dashboard"
                  ? "bg-[#75162D] text-[#F5EFE6] shadow-xs"
                  : "text-[#6A625B] hover:text-[#2D2520]"
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('insights')}
              className={`px-4 py-1.5 rounded-[8px] text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "insights"
                  ? "bg-[#75162D] text-[#F5EFE6] shadow-xs"
                  : "text-[#6A625B] hover:text-[#2D2520]"
              }`}
            >
              <BarChart2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Insights</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-1.5 rounded-[8px] text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "settings"
                  ? "bg-[#75162D] text-[#F5EFE6] shadow-xs"
                  : "text-[#6A625B] hover:text-[#2D2520]"
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </nav>

          {/* Action Center Controls (Bell, Theme, User) */}
          <div className="flex items-center gap-3">
            
            {/* Notification Bell Trigger Popover */}
            <div className="relative" ref={notifDropdownRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                title="Notifications Center"
                className="relative rounded-[8px] border border-[#DCCFBE] bg-[#FFFDF9] p-2 text-[#6A625B] hover:text-[#75162D] hover:bg-[#F8F3EC] transition-colors cursor-pointer shadow-3xs"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifs.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#75162D] text-[8px] font-bold text-[#F5EFE6] ring-2 ring-[#FFFDF9]">
                    {unreadNotifs.length}
                  </span>
                )}
              </button>

              {/* Popover list */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 z-40 w-80 flex flex-col rounded-[10px] border border-[#DCCFBE] bg-[#FFFDF9] shadow-md py-2 animate-slideUp text-[#2D2520]">
                  <div className="px-4 py-2 border-b border-[#DCCFBE] flex items-center justify-between">
                    <span className="text-xs font-bold font-sans">Notifications ({unreadNotifs.length})</span>
                    {unreadNotifs.length > 0 && (
                      <button
                        onClick={clearAllNotifications}
                        className="text-[10px] text-[#75162D] font-bold hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-[#DCCFBE]/30">
                    {unreadNotifs.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#6A625B]">
                        <Check className="h-8 w-8 mx-auto text-[#DCCFBE] mb-2" />
                        <span>All caught up! No unread companion alerts.</span>
                      </div>
                    ) : (
                      unreadNotifs.map((notif) => (
                        <div key={notif.id} className="p-3 text-[11px] leading-relaxed flex items-start justify-between gap-2.5">
                          <div className="flex items-start gap-2">
                            {notif.type === "warning" ? (
                              <AlertTriangle className="h-3.5 w-3.5 text-[#A06A3C] shrink-0 mt-0.5" />
                            ) : notif.type === "success" ? (
                              <Check className="h-3.5 w-3.5 text-[#5F7358] shrink-0 mt-0.5" />
                            ) : (
                              <Info className="h-3.5 w-3.5 text-[#75162D] shrink-0 mt-0.5" />
                            )}
                            <span className="text-[#2D2520] font-medium">{notif.text}</span>
                          </div>
                          
                          <button
                            onClick={() => markNotificationRead(notif.id)}
                            className="text-[9px] font-bold text-[#75162D] hover:text-[#560B18] uppercase tracking-wider shrink-0"
                          >
                            Dismiss
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Compact Profile summary & Log out */}
            <div className="hidden md:flex items-center gap-2.5 border-l border-[#DCCFBE] pl-3">
              <div className="w-8 h-8 rounded-full bg-[#F8F3EC] text-[#75162D] font-bold text-xs flex items-center justify-center border border-[#DCCFBE] shrink-0">
                {user?.displayName ? user.displayName.substring(0, 1).toUpperCase() : "U"}
              </div>
              <div className="text-left leading-tight shrink-0">
                <p className="text-[11px] font-bold text-[#2D2520] truncate max-w-[90px]" title={user?.displayName || ""}>
                  {user?.displayName?.split(" ")[0] || "Partner"}
                </p>
                <button
                  onClick={logout}
                  className="text-[9px] font-medium text-[#6A625B] hover:text-[#75162D] block mt-0.5 cursor-pointer transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>

          </div>

        </div>
      </header>

      {/* Render Active Tab Content Area */}
      <main className="flex-1 flex flex-col min-h-[500px]">
        {activeTab === "dashboard" ? (
          <DashboardView />
        ) : activeTab === "insights" ? (
          <AnalyticsView />
        ) : (
          <SettingsView />
        )}
      </main>

      {/* Slide-out Mobile Navigation Drawer */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop with elegant fade */}
          <div 
            className="fixed inset-0 bg-[#2D2520]/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative flex w-full max-w-xs flex-col bg-[#FFFDF9] border-r border-[#DCCFBE] p-6 shadow-xl animate-slideRight">
            {/* Header / Close button */}
            <div className="flex items-center justify-between pb-6 border-b border-[#DCCFBE]/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8.5 h-8.5 bg-[#75162D] rounded-[8px] flex items-center justify-center text-[#F5EFE6]">
                  <MonogramDN className="h-5.5 w-5.5 text-[#F5EFE6]" />
                </div>
                <span className="text-lg font-normal tracking-wide text-[#2D2520] font-display">DoNext</span>
              </div>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="rounded-[8px] border border-[#DCCFBE] bg-[#FFFDF9] p-2 text-[#6A625B] hover:text-[#75162D] hover:bg-[#F8F3EC] transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Navigation Drawer Links */}
            <div className="flex-1 py-6 space-y-2">
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setIsMobileDrawerOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[8px] text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  activeTab === "dashboard"
                    ? "bg-[#75162D] text-[#F5EFE6] shadow-xs"
                    : "text-[#6A625B] hover:text-[#2D2520] hover:bg-[#F8F3EC]"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('insights');
                  setIsMobileDrawerOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[8px] text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  activeTab === "insights"
                    ? "bg-[#75162D] text-[#F5EFE6] shadow-xs"
                    : "text-[#6A625B] hover:text-[#2D2520] hover:bg-[#F8F3EC]"
                }`}
              >
                <BarChart2 className="h-4 w-4" />
                <span>Insights</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('settings');
                  setIsMobileDrawerOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[8px] text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  activeTab === "settings"
                    ? "bg-[#75162D] text-[#F5EFE6] shadow-xs"
                    : "text-[#6A625B] hover:text-[#2D2520] hover:bg-[#F8F3EC]"
                }`}
              >
                <Sliders className="h-4 w-4" />
                <span>Settings</span>
              </button>
            </div>

            {/* Profile & Sign Out Footer */}
            <div className="border-t border-[#DCCFBE]/30 pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#F8F3EC] text-[#75162D] font-bold text-sm flex items-center justify-center border border-[#DCCFBE] shrink-0">
                  {user?.displayName ? user.displayName.substring(0, 1).toUpperCase() : "U"}
                </div>
                <div className="text-left leading-tight shrink-0 min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#2D2520] truncate" title={user?.displayName || ""}>
                    {user?.displayName || "Planner Partner"}
                  </p>
                  <p className="text-[10px] text-[#6A625B] truncate" title={user?.email || ""}>
                    {user?.email || "Offline Local Session"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[8px] border border-[#75162D]/20 hover:border-[#75162D] bg-transparent text-[#75162D] text-xs font-semibold transition-all cursor-pointer hover:bg-[#75162D]/5"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Persistent floating chat assistant */}
      <NudgeChat />

    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
