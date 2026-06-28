import React, { useState } from "react";
import { useApp } from "../context/AppContext.js";
import { Mail, Lock, User as UserIcon, AlertCircle, ArrowRight } from "lucide-react";
import { MonogramDN } from "./MonogramDN.js";

export const AuthView: React.FC = () => {
  const { loginWithGoogle, loginWithEmail, signUpWithEmail } = useApp();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        if (!displayName.trim()) {
          throw new Error("Display Name is required");
        }
        await signUpWithEmail(email, password, displayName);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Authentication failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

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

        {/* Clean, Refined Feature List (No descriptions, no boxes) */}
        <div className="flex flex-col items-center space-y-5 text-xs sm:text-sm font-semibold tracking-wide text-[#75162D] font-sans py-2">
          <span>✦   See What's Ahead   ✦</span>
          <span>✦   Create Breathing Room   ✦</span>
          <span>✦   Focus With Confidence   ✦</span>
        </div>

        {/* Authentication Card */}
        <div className="w-full max-w-md rounded-[10px] border border-[#DCCFBE] bg-[#FFFDF9] p-6 sm:p-8 shadow-xs text-left">
          
          {/* Tab Selection */}
          <div className="grid grid-cols-2 gap-1 rounded-[8px] bg-[#F8F3EC] p-1 mb-6 border border-[#DCCFBE]/30">
            <button
              onClick={() => { setIsSignUp(false); setError(""); }}
              className={`rounded-[6px] py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                !isSignUp 
                  ? "bg-[#75162D] text-[#F5EFE6] shadow-2xs" 
                  : "text-[#6A625B] hover:text-[#2D2520]"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsSignUp(true); setError(""); }}
              className={`rounded-[6px] py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                isSignUp 
                  ? "bg-[#75162D] text-[#F5EFE6] shadow-2xs" 
                  : "text-[#6A625B] hover:text-[#2D2520]"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Notification */}
          {error && (
            <div className="flex gap-2.5 rounded-[8px] bg-[#75162D]/10 border border-[#75162D]/20 p-3.5 mb-5 text-xs text-[#75162D]">
              <AlertCircle className="h-4.5 w-4.5 text-[#75162D] shrink-0" />
              <p className="leading-normal font-light">{error}</p>
            </div>
          )}

          {/* Email Password Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4.5">
            
            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#6A625B] uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute top-3.5 left-3.5 h-4 w-4 text-[#6A625B]/70" />
                  <input
                    type="text"
                    required
                    placeholder="e.g., Jane Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-[8px] border border-[#DCCFBE] py-2.5 pr-4 pl-10 text-sm outline-hidden focus:border-[#75162D] focus:ring-1 focus:ring-[#75162D] bg-[#FFFDF9] text-[#2D2520] placeholder-[#6A625B]/40 transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#6A625B] uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute top-3.5 left-3.5 h-4 w-4 text-[#6A625B]/70" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-[8px] border border-[#DCCFBE] py-2.5 pr-4 pl-10 text-sm outline-hidden focus:border-[#75162D] focus:ring-1 focus:ring-[#75162D] bg-[#FFFDF9] text-[#2D2520] placeholder-[#6A625B]/40 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#6A625B] uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute top-3.5 left-3.5 h-4 w-4 text-[#6A625B]/70" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-[8px] border border-[#DCCFBE] py-2.5 pr-4 pl-10 text-sm outline-hidden focus:border-[#75162D] focus:ring-1 focus:ring-[#75162D] bg-[#FFFDF9] text-[#2D2520] placeholder-[#6A625B]/40 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-[8px] bg-[#75162D] hover:bg-[#560B18] disabled:opacity-50 text-[#F5EFE6] py-3.5 font-semibold text-xs transition-all duration-250 shadow-2xs flex items-center justify-center gap-1.5 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              {loading ? "Authenticating..." : isSignUp ? "Create Your Account" : "Sign In to Dashboard"}
              <ArrowRight className="h-4 w-4 text-[#E8D9C1]" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#DCCFBE]/30" />
            </div>
            <span className="relative bg-[#FFFDF9] px-3.5 text-[10px] text-[#6A625B] uppercase tracking-wider font-semibold font-mono">
              or continue with
            </span>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full rounded-[8px] border border-[#DCCFBE] hover:bg-[#F8F3EC] bg-transparent py-3 px-4 font-semibold text-xs text-[#2D2520] shadow-2xs flex items-center justify-center gap-2.5 cursor-pointer transition-colors"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.11C18.281 1.745 15.49 1 12.24 1c-6.075 0-11 4.925-11 11s4.925 11 11 11c6.34 0 10.56-4.455 10.56-10.75 0-.725-.075-1.275-.165-1.965H12.24z"
              />
            </svg>
            Google Cloud Authentication
          </button>

          {/* Guest Access Mode Indicator */}
          <p className="text-center text-[11px] text-[#6A625B] mt-5 leading-normal font-light">
            Your tasks are saved safely and kept in your local session.
          </p>

        </div>

      </div>
    </div>
  );
};
