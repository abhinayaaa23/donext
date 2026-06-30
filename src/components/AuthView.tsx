import React, { useState } from "react";
import { useApp } from "../context/AppContext.js";
import { AlertCircle } from "lucide-react";
import { MonogramDN } from "./MonogramDN.js";

export const AuthView: React.FC = () => {
  const { loginWithGoogle } = useApp();
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Google Sign-In failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5EFE6] px-4 py-12 transition-colors duration-300">
      <div className="w-full max-w-2xl flex flex-col items-center text-center space-y-8 py-6">
        
        {/* DoNext Logo and Brand */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#75162D] text-[#F5EFE6] shadow-sm">
            <MonogramDN className="h-7 w-7 text-[#F5EFE6]" />
          </div>
          <div className="flex flex-col items-center">
            <h1 className="text-3xl font-normal text-[#2D2520] font-display">DoNext</h1>
            <p className="text-[10px] text-[#75162D] font-bold tracking-widest uppercase font-mono mt-0.5">Plan Less. Execute More.</p>
          </div>
        </div>

        {/* Headline & Subtitle */}
        <div className="space-y-3">
          <h2 className="text-3xl sm:text-4xl font-normal text-[#2D2520] font-display leading-tight max-w-lg mx-auto">
            See tomorrow's workload today.
          </h2>
          <p className="text-sm sm:text-base font-medium text-[#6A625B] max-w-md mx-auto leading-relaxed">
            Built for students, researchers, creators, and curious minds.
          </p>
        </div>

        {/* Highlight Card */}
        <div className="w-full max-w-md rounded-[10px] bg-[#75162D] px-6 py-3.5 text-center transition-all duration-300 shadow-sm">
          <p className="text-xs sm:text-sm font-medium leading-relaxed text-[#FFFDF9] font-sans">
            Know what's coming before your workload catches up with you.
          </p>
        </div>

        {/* Clean, Refined Feature List */}
        <div className="flex flex-col items-center space-y-5 text-xs sm:text-sm font-semibold tracking-wide text-[#75162D] font-sans py-2">
          <span>✦   See What's Ahead   ✦</span>
          <span>✦   Create Breathing Room   ✦</span>
          <span>✦   Focus With Confidence   ✦</span>
        </div>

        {/* Authentication Card */}
        <div className="w-full max-w-md rounded-[10px] border border-[#DCCFBE] bg-[#FFFDF9] p-6 sm:p-8 shadow-xs text-center space-y-6">
          
          <div className="space-y-2 text-center">
            <h3 className="text-lg font-normal text-[#2D2520] font-display">Secure Access</h3>
            <p className="text-xs text-[#6A625B] leading-relaxed max-w-xs mx-auto font-light">
              Sign in with Google to save tasks, track progress, and access personalized planning insights.
            </p>
          </div>

          {/* Error Notification */}
          {error && (
            <div className="flex gap-2.5 rounded-[8px] bg-[#75162D]/10 border border-[#75162D]/20 p-3.5 text-xs text-[#75162D] text-left">
              <AlertCircle className="h-4.5 w-4.5 text-[#75162D] shrink-0" />
              <p className="leading-normal font-light">{error}</p>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full rounded-[8px] bg-[#75162D] hover:bg-[#560B18] disabled:opacity-50 text-[#F5EFE6] py-3.5 px-4 font-semibold text-xs shadow-2xs flex items-center justify-center gap-2.5 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer transition-all"
            id="google-signin-btn"
          >
            <svg className="h-4.5 w-4.5 shrink-0 fill-current" viewBox="0 0 24 24">
              <path d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.11C18.281 1.745 15.49 1 12.24 1c-6.075 0-11 4.925-11 11s4.925 11 11 11c6.34 0 10.56-4.455 10.56-10.75 0-.725-.075-1.275-.165-1.965H12.24z" />
            </svg>
            {loading ? "Connecting..." : "Sign In with Google"}
          </button>

          {/* Info footer */}
          <div className="pt-2 border-t border-[#DCCFBE]/30">
            <p className="text-[11px] text-[#6A625B] leading-normal font-light">
              DoNext uses Google Authentication to securely connect to cloud resources and sync your personal workload profile.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
