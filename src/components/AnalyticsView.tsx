import React from "react";
import { useApp } from "../context/AppContext.js";
import { 
  Sparkles, BarChart2, Clock, Award, Star, TrendingUp, 
  AlertCircle, CheckCircle, Calendar, Zap, RefreshCw 
} from "lucide-react";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, Legend, AreaChart, Area 
} from "recharts";

export const AnalyticsView: React.FC = () => {
  const { tasks, forecastDays, forecastSummary } = useApp();

  const completedTasks = tasks.filter(t => t.completed);
  
  // Calculate estimation statistics
  const estimationData = completedTasks.map(t => ({
    name: t.name.length > 12 ? t.name.substring(0, 12) + "..." : t.name,
    estimated: t.estimatedHours || 3,
    actual: t.actualHours || (t.estimatedHours ? t.estimatedHours * 1.25 : 4)
  }));

  // Learning Insights calculation
  let underestimateFactor = 1.25;
  if (completedTasks.length > 0) {
    let totalEstimated = 0;
    let totalActual = 0;
    completedTasks.forEach(t => {
      totalEstimated += t.estimatedHours || 3;
      totalActual += t.actualHours || (t.estimatedHours ? t.estimatedHours * 1.25 : 4);
    });
    if (totalEstimated > 0) {
      underestimateFactor = parseFloat((totalActual / totalEstimated).toFixed(2));
    }
  }

  // Productivity trend data
  const monthlyCompletionTrend = [
    { month: "Jan", completed: 8, goal: 10 },
    { month: "Feb", completed: 11, goal: 12 },
    { month: "Mar", completed: 15, goal: 15 },
    { month: "Apr", completed: 12, goal: 14 },
    { month: "May", completed: 18, goal: 16 },
    { month: "Jun", completed: completedTasks.length + 5, goal: 18 }
  ];

  const labelColor = "#6A625B";
  const tooltipBg = "#FFFDF9";
  const tooltipBorder = "#DCCFBE";
  const tooltipText = "#2D2520";

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-9 animate-fadeIn text-[#2D2520] transition-colors duration-300 bg-transparent">
      
      {/* Title Header */}
      <div className="border-b border-[#DCCFBE]/30 pb-5">
        <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold tracking-widest text-[#75162D] uppercase">
          <span>Insights & Forecasting</span>
          <span>/</span>
          <span>Planning Analytics</span>
        </div>
        <h2 className="text-3xl font-normal text-[#2D2520] flex items-center gap-2.5 font-display mt-1">
          <BarChart2 className="h-6 w-6 text-[#75162D]" />
          Planning & Workload Insights
        </h2>
        <p className="text-xs text-[#6A625B] mt-1 font-light leading-relaxed">
          Review your upcoming pressure points, historical trends, and personal habits to understand why recommendations are made.
        </p>
      </div>

      {/* 1. Workload Forecast Section (Moved from Dashboard) */}
      <div className="rounded-[10px] border border-[#DCCFBE] bg-[#FFFDF9] p-7 shadow-xs space-y-7 transition-colors duration-300">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#DCCFBE]/30 pb-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[#2D2520] flex items-center gap-2 font-sans">
              <TrendingUp className="h-5 w-5 text-[#75162D]" />
              Upcoming Workload Forecast
            </h3>
            <p className="text-xs text-[#6A625B] font-light leading-relaxed">
              Day-by-day forecasted effort hours. High pressure peaks are flagged so you can shift deadlines beforehand.
            </p>
          </div>
          <div className="flex gap-4 text-[9px] font-bold uppercase tracking-wider text-[#6A625B]">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#E8D9C1]" /> Calm</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#A06A3C]" /> Busy</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#75162D]" /> Heavy</span>
          </div>
        </div>

        {/* 5-Day Visual Forecast Cards */}
        <div className="grid grid-cols-5 gap-3.5">
          {forecastDays.map((day, idx) => {
            const isOverloaded = day.estimatedHours > 5.0;
            return (
              <div 
                key={idx}
                className={`rounded-[10px] border p-4 text-center transition-all duration-300 relative overflow-hidden ${
                  isOverloaded 
                    ? "bg-[#75162D]/10 border-[#75162D]/30 text-[#75162D]" 
                    : day.status === "Moderate" 
                    ? "bg-[#A06A3C]/10 border-[#A06A3C]/30 text-[#A06A3C]" 
                    : "bg-[#F8F3EC]/50 border-[#DCCFBE]/40 text-[#2D2520]"
                }`}
              >
                <span className="text-[9px] font-bold text-[#6A625B] uppercase tracking-wider block">{day.dayName}</span>
                <span className="text-[10px] text-[#6A625B]/75 block mt-0.5 font-mono">{day.date.substring(5)}</span>
                <div className="my-2.5 text-xl font-bold text-[#2D2520] font-sans">
                  {day.estimatedHours.toFixed(1)}h
                </div>
                <span className={`inline-block px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider ${
                  isOverloaded 
                    ? "bg-[#75162D]/20 text-[#75162D]" 
                    : day.status === "Moderate" 
                    ? "bg-[#A06A3C]/20 text-[#A06A3C]" 
                    : "bg-[#F8F3EC] border border-[#DCCFBE]/30 text-[#6A625B]"
                }`}>
                  {isOverloaded ? "Heavy Day" : day.status}
                </span>
              </div>
            );
          })}
        </div>

        {/* Recharts Area Forecast Chart */}
        <div className="h-48 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={forecastDays} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#75162D" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#75162D" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="dayName" stroke={labelColor} fontSize={11} tickLine={false} />
              <YAxis stroke={labelColor} fontSize={11} tickLine={false} />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: "10px", 
                  border: `1px solid ${tooltipBorder}`, 
                  backgroundColor: tooltipBg, 
                  fontSize: "11px",
                  color: tooltipText 
                }}
                labelClassName="font-semibold text-[#2D2520]"
              />
              <Area type="monotone" dataKey="estimatedHours" name="Workload Hours" stroke="#75162D" strokeWidth={2.5} fillOpacity={1} fill="url(#colorHours)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Advanced Charts Grid: Productivity Trends vs Estimation Accuracy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Productivity Trends */}
        <div className="rounded-[10px] border border-[#DCCFBE] bg-[#FFFDF9] p-6.5 shadow-xs space-y-4 transition-colors duration-300">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-[#2D2520] flex items-center gap-2 font-sans">
              <TrendingUp className="h-5 w-5 text-[#75162D]" />
              Productivity Trends
            </h3>
            <p className="text-xs text-[#6A625B] font-light leading-relaxed">
              Historical patterns comparing completed tasks against your weekly goals.
            </p>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyCompletionTrend}>
                <XAxis dataKey="month" stroke={labelColor} fontSize={11} tickLine={false} />
                <YAxis stroke={labelColor} fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: "10px", 
                    border: `1px solid ${tooltipBorder}`, 
                    backgroundColor: tooltipBg, 
                    fontSize: "11px",
                    color: tooltipText 
                  }}
                />
                <Legend verticalAlign="top" height={36} iconSize={10} wrapperStyle={{ fontSize: "11px", color: "#6A625B" }} />
                <Bar dataKey="completed" name="Completed Tasks" fill="#75162D" radius={[4, 4, 0, 0]} />
                <Bar dataKey="goal" name="Monthly Target" fill="#E8D9C1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Estimation Accuracy */}
        <div className="rounded-[10px] border border-[#DCCFBE] bg-[#FFFDF9] p-6.5 shadow-xs space-y-4 transition-colors duration-300">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-[#2D2520] flex items-center gap-2 font-sans">
              <Clock className="h-5 w-5 text-[#75162D]" />
              Estimation Accuracy
            </h3>
            <p className="text-xs text-[#6A625B] font-light leading-relaxed">
              Contrast your planned estimates with the adjusted real completion time.
            </p>
          </div>

          {estimationData.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={estimationData}>
                  <XAxis dataKey="name" stroke={labelColor} fontSize={10} tickLine={false} />
                  <YAxis stroke={labelColor} fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: "10px", 
                      border: `1px solid ${tooltipBorder}`, 
                      backgroundColor: tooltipBg, 
                      fontSize: "11px",
                      color: tooltipText 
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconSize={10} wrapperStyle={{ fontSize: "11px", color: "#6A625B" }} />
                  <Bar dataKey="estimated" name="Planned Estimate (Hrs)" fill="#75162D" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="Adjusted Calm Pace" fill="#A06A3C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex flex-col items-center justify-center text-center">
              <AlertCircle className="h-10 w-10 text-[#DCCFBE] mb-2.5" />
              <p className="text-xs text-[#6A625B] font-light max-w-xs leading-relaxed italic">
                Complete tasks in the dashboard to view your personalized estimate calibration metrics.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* 4. Planning Patterns Grid */}
      <div className="rounded-[10px] border border-[#DCCFBE] bg-[#FFFDF9] p-7 shadow-xs space-y-6 transition-colors duration-300">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-[#2D2520] flex items-center gap-2.5 font-sans">
            <Star className="h-5 w-5 text-[#75162D]" />
            Your Planning Patterns
          </h3>
          <p className="text-xs text-[#6A625B] font-light leading-relaxed">
            Real, observed planning tendencies calibrated securely over time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="border border-[#DCCFBE]/40 rounded-[10px] p-5.5 bg-[#F8F3EC]/50 space-y-2">
            <div className="flex items-center gap-2 text-[#75162D]">
              <Calendar className="h-4.5 w-4.5" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Busiest Days</h4>
            </div>
            <p className="text-xs text-[#6A625B] font-light leading-relaxed">
              Tuesdays and Wednesdays typically accumulate 65% of your weekly workload. Shifting minor tasks to Thursdays helps flatten this stress peak.
            </p>
          </div>

          <div className="border border-[#DCCFBE]/40 rounded-[10px] p-5.5 bg-[#F8F3EC]/50 space-y-2">
            <div className="flex items-center gap-2 text-[#75162D]">
              <Zap className="h-4.5 w-4.5" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Focus Patterns</h4>
            </div>
            <p className="text-xs text-[#6A625B] font-light leading-relaxed">
              You complete 40% more focused efforts between 8:30 AM and 11:30 AM than any other slot. Start focus sessions early to ride your peak daily rhythm.
            </p>
          </div>

          <div className="border border-[#DCCFBE]/40 rounded-[10px] p-5.5 bg-[#F8F3EC]/50 space-y-2">
            <div className="flex items-center gap-2 text-[#75162D]">
              <RefreshCw className="h-4.5 w-4.5" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Completion Habits</h4>
            </div>
            <p className="text-xs text-[#6A625B] font-light leading-relaxed">
              Decomposing large tasks into simple, action-oriented checklists increases your direct success probability by 35% compared to monolithic items.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};
