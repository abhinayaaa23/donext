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
  const { tasks, forecastDays, forecastSummary, focusEvents = [] } = useApp();

  const completedTasks = tasks.filter(t => t.completed);

  // Calculate historical metrics for new user insights threshold
  const completedTasksCount = completedTasks.length;
  const completedFocusSessions = focusEvents.filter(e => e.eventType === 'complete_step' || e.eventType === 'complete_task').length;

  const activityDates = new Set<string>();
  tasks.forEach(t => {
    if (t.createdAt) activityDates.add(t.createdAt.substring(0, 10));
    if (t.completedAt) activityDates.add(t.completedAt.substring(0, 10));
    if (t.deadline) activityDates.add(t.deadline.substring(0, 10));
  });
  focusEvents.forEach(e => {
    if (e.timestamp) {
      activityDates.add(e.timestamp.substring(0, 10));
    }
  });
  const activityDaysCount = activityDates.size;
  const activityDays = activityDaysCount;

  const hasSufficientData = completedTasksCount >= 3 || completedFocusSessions >= 5 || activityDaysCount >= 7;
  const insightsUnlocked = hasSufficientData;

  // Temporary verification console logs as requested
  console.log("Completed Tasks:", completedTasks);
  console.log("Completed Focus Sessions:", completedFocusSessions);
  console.log("Activity Days:", activityDays);
  console.log("Insights Unlocked:", insightsUnlocked);

  // Calculate actual dynamic insights for Busiest Days, Focus Patterns, and Completion Habits
  // --- Busiest Days ---
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  tasks.forEach(t => {
    const dateStr = t.deadline || t.createdAt;
    if (dateStr) {
      const d = new Date(dateStr);
      const day = d.getDay();
      if (!isNaN(day)) {
        dayCounts[day]++;
      }
    }
  });
  focusEvents.forEach(e => {
    if (e.timestamp) {
      const d = new Date(e.timestamp);
      const day = d.getDay();
      if (!isNaN(day)) {
        dayCounts[day]++;
      }
    }
  });
  let busiestDayIdx = 2; // Default to Tuesday
  let maxDayCount = -1;
  dayCounts.forEach((count, idx) => {
    if (count > maxDayCount) {
      maxDayCount = count;
      busiestDayIdx = idx;
    }
  });
  const busiestDayName = dayNames[busiestDayIdx];

  // --- Focus Patterns ---
  let morningCount = 0;   // 5 AM - 12 PM
  let afternoonCount = 0; // 12 PM - 5 PM
  let eveningCount = 0;   // 5 PM - 11 PM
  let nightCount = 0;     // 11 PM - 5 AM

  focusEvents.forEach(e => {
    if (e.timestamp) {
      const d = new Date(e.timestamp);
      const hour = d.getHours();
      if (!isNaN(hour)) {
        if (hour >= 5 && hour < 12) morningCount++;
        else if (hour >= 12 && hour < 17) afternoonCount++;
        else if (hour >= 17 && hour < 23) eveningCount++;
        else nightCount++;
      }
    }
  });

  let favoriteTimeSlot = "Morning (5 AM - 12 PM)";
  let maxSlotCount = morningCount;
  if (afternoonCount > maxSlotCount) {
    favoriteTimeSlot = "Afternoon (12 PM - 5 PM)";
    maxSlotCount = afternoonCount;
  }
  if (eveningCount > maxSlotCount) {
    favoriteTimeSlot = "Evening (5 PM - 11 PM)";
    maxSlotCount = eveningCount;
  }
  if (nightCount > maxSlotCount) {
    favoriteTimeSlot = "Late Night (11 PM - 5 AM)";
    maxSlotCount = nightCount;
  }

  // --- Completion Habits ---
  const tasksWithChecklists = tasks.filter(t => t.subtasks && t.subtasks.length > 0);
  const tasksWithoutChecklists = tasks.filter(t => !t.subtasks || t.subtasks.length === 0);
  const completedWithChecklists = tasksWithChecklists.filter(t => t.completed).length;
  const completedWithoutChecklists = tasksWithoutChecklists.filter(t => t.completed).length;

  const rateWithChecklists = tasksWithChecklists.length > 0
    ? Math.round((completedWithChecklists / tasksWithChecklists.length) * 100)
    : 0;
  const rateWithoutChecklists = tasksWithoutChecklists.length > 0
    ? Math.round((completedWithoutChecklists / tasksWithoutChecklists.length) * 100)
    : 0;
  
  
  // Calculate estimation statistics safely without NaN or infinity
  const estimationData = completedTasks.map(t => {
    const estimated = Math.max(0, t.estimatedHours || 3);
    const actual = Math.max(0, t.actualHours || (t.estimatedHours ? t.estimatedHours * 1.25 : 4));
    return {
      name: t.name.length > 12 ? t.name.substring(0, 12) + "..." : t.name,
      estimated: isFinite(estimated) && !isNaN(estimated) ? estimated : 3,
      actual: isFinite(actual) && !isNaN(actual) ? actual : 4
    };
  });

  // Learning Insights calculation safely
  let underestimateFactor = 1.25;
  if (completedTasks.length > 0) {
    let totalEstimated = 0;
    let totalActual = 0;
    completedTasks.forEach(t => {
      const est = Math.max(0, t.estimatedHours || 3);
      const act = Math.max(0, t.actualHours || (t.estimatedHours ? t.estimatedHours * 1.25 : 4));
      totalEstimated += isFinite(est) && !isNaN(est) ? est : 3;
      totalActual += isFinite(act) && !isNaN(act) ? act : 4;
    });
    if (totalEstimated > 0) {
      const factor = totalActual / totalEstimated;
      underestimateFactor = isFinite(factor) && !isNaN(factor) ? parseFloat(factor.toFixed(2)) : 1.25;
    }
  }

  // Productivity trend data generated dynamically from actual completed tasks
  const getMonthlyCompletionTrend = () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const trend = [];
    
    // Generate actual past 6 months dynamically based on current local date
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIdx = d.getMonth();
      const monthLabel = months[monthIdx];
      
      // Count actual completed tasks for this month & year
      const completedCount = tasks.filter(t => {
        if (!t.completed) return false;
        const compDateStr = t.completedAt || t.deadline || t.createdAt;
        if (!compDateStr) return false;
        
        const compDate = new Date(compDateStr);
        return compDate.getFullYear() === year && compDate.getMonth() === monthIdx;
      }).length;
      
      trend.push({
        month: monthLabel,
        completed: completedCount,
        goal: 10 // realistic monthly baseline target
      });
    }
    return trend;
  };

  const monthlyCompletionTrend = getMonthlyCompletionTrend();

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
          {tasks.filter(t => !t.completed).length > 0 ? (
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
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center text-center border border-dashed border-[#DCCFBE]/50 rounded-[10px] bg-[#F8F3EC]/10 p-4">
              <AlertCircle className="h-8 w-8 text-[#DCCFBE]/80 mb-2" />
              <p className="text-xs text-[#6A625B] font-light italic">
                Complete more tasks to unlock insights.
              </p>
            </div>
          )}
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
            {tasks.filter(t => t.completed).length > 0 ? (
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
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-center border border-dashed border-[#DCCFBE]/50 rounded-[10px] bg-[#F8F3EC]/10 p-4">
                <AlertCircle className="h-8 w-8 text-[#DCCFBE]/80 mb-2" />
                <p className="text-xs text-[#6A625B] font-light italic">
                  Complete more tasks to unlock insights.
                </p>
              </div>
            )}
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
            <div className="h-60 flex flex-col items-center justify-center text-center border border-dashed border-[#DCCFBE]/50 rounded-[10px] bg-[#F8F3EC]/10 p-4">
              <AlertCircle className="h-8 w-8 text-[#DCCFBE]/80 mb-2.5" />
              <p className="text-xs text-[#6A625B] font-light max-w-xs leading-relaxed italic text-center">
                Complete more tasks to unlock insights.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Focus Session Analytics */}
      <div className="rounded-[10px] border border-[#DCCFBE] bg-[#FFFDF9] p-7 shadow-xs space-y-6 transition-colors duration-300">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-[#2D2520] flex items-center gap-2.5 font-display">
            <Clock className="h-5 w-5 text-[#75162D]" />
            Focus Session Analytics
          </h3>
          <p className="text-xs text-[#6A625B] font-light leading-relaxed">
            Methodical insights parsed from your actual focus sessions, completed subtasks, and restart history.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border border-[#DCCFBE]/40 rounded-[10px] p-4 bg-[#F8F3EC]/30 text-center">
            <span className="text-[10px] font-mono text-[#6A625B] uppercase tracking-wider block">Total Focus Time</span>
            <span className="text-2xl font-bold text-[#75162D] font-sans mt-1 block">
              {focusEvents.filter(e => e.eventType === 'complete_step').reduce((acc, e) => acc + e.durationMinutes, 0)} min
            </span>
          </div>

          <div className="border border-[#DCCFBE]/40 rounded-[10px] p-4 bg-[#F8F3EC]/30 text-center">
            <span className="text-[10px] font-mono text-[#6A625B] uppercase tracking-wider block">Intervals Cleared</span>
            <span className="text-2xl font-bold text-[#75162D] font-sans mt-1 block">
              {focusEvents.filter(e => e.eventType === 'complete_step').length}
            </span>
          </div>

          <div className="border border-[#DCCFBE]/40 rounded-[10px] p-4 bg-[#F8F3EC]/30 text-center">
            <span className="text-[10px] font-mono text-[#6A625B] uppercase tracking-wider block">Pacing Restarts</span>
            <span className="text-2xl font-bold text-[#75162D] font-sans mt-1 block">
              {focusEvents.filter(e => e.eventType === 'restart_step').length}
            </span>
          </div>

          <div className="border border-[#DCCFBE]/40 rounded-[10px] p-4 bg-[#F8F3EC]/30 text-center">
            <span className="text-[10px] font-mono text-[#6A625B] uppercase tracking-wider block">Completion Rate</span>
            <span className={`font-bold text-[#75162D] font-sans mt-1 block ${tasks.length > 0 ? "text-2xl" : "text-xs"}`}>
              {tasks.length > 0 
                ? `${Math.min(100, Math.max(0, Math.round((completedTasks.length / tasks.length) * 100)))}%` 
                : "Not enough data yet"}
            </span>
          </div>
        </div>

        {/* Focus Events log table */}
        {focusEvents.length > 0 && (
          <div className="border border-[#DCCFBE]/40 rounded-[10px] overflow-hidden">
            <div className="bg-[#F8F3EC]/50 px-4 py-2 text-[10px] font-mono font-bold uppercase text-[#6A625B] tracking-wider border-b border-[#DCCFBE]/40">
              Focus Activity Log (Latest Events)
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-[#DCCFBE]/20 text-xs">
              {[...focusEvents].reverse().slice(0, 10).map((event) => (
                <div key={event.id} className="p-3 flex items-center justify-between gap-3 text-[#2D2520]">
                  <div className="flex items-center gap-2.5">
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      event.eventType === 'complete_step' 
                        ? 'bg-[#5F7358]' 
                        : event.eventType === 'restart_step' 
                        ? 'bg-[#A06A3C]' 
                        : event.eventType === 'complete_task'
                        ? 'bg-blue-500'
                        : 'bg-[#75162D]'
                    }`} />
                    <div>
                      <span className="font-semibold text-xs capitalize">
                        {event.eventType.replace('_', ' ')}: 
                      </span>
                      <span className="text-xs text-[#6A625B] ml-1">
                        {event.subtaskName ? `"${event.subtaskName}" under ` : ""} "{event.taskName}"
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 font-mono text-[10px] text-[#6A625B]">
                    {event.durationMinutes > 0 ? `${event.durationMinutes}m` : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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

        {hasSufficientData ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
            
            <div className="border border-[#DCCFBE]/40 rounded-[10px] p-5.5 bg-[#F8F3EC]/50 space-y-2">
              <div className="flex items-center gap-2 text-[#75162D]">
                <Calendar className="h-4.5 w-4.5" />
                <h4 className="text-xs font-bold uppercase tracking-wider font-sans">Busiest Days</h4>
              </div>
              <p className="text-xs text-[#6A625B] font-light leading-relaxed">
                {busiestDayName}s typically accumulate the highest density of tasks and focus events. Shifting minor or low-priority items to later in the week can help flatten this workload peak.
              </p>
            </div>

            <div className="border border-[#DCCFBE]/40 rounded-[10px] p-5.5 bg-[#F8F3EC]/50 space-y-2">
              <div className="flex items-center gap-2 text-[#75162D]">
                <Zap className="h-4.5 w-4.5" />
                <h4 className="text-xs font-bold uppercase tracking-wider font-sans">Focus Patterns</h4>
              </div>
              <p className="text-xs text-[#6A625B] font-light leading-relaxed">
                Your primary peak of completed focus events occurs during the {favoriteTimeSlot.toLowerCase()} hours. Starting major focus sessions early in this block lets you ride your natural peak biological rhythm.
              </p>
            </div>

            <div className="border border-[#DCCFBE]/40 rounded-[10px] p-5.5 bg-[#F8F3EC]/50 space-y-2">
              <div className="flex items-center gap-2 text-[#75162D]">
                <RefreshCw className="h-4.5 w-4.5" />
                <h4 className="text-xs font-bold uppercase tracking-wider font-sans">Completion Habits</h4>
              </div>
              <p className="text-xs text-[#6A625B] font-light leading-relaxed">
                {tasksWithChecklists.length > 0 && rateWithChecklists > rateWithoutChecklists ? (
                  `Decomposing large tasks into simple subtask checklists has increased your task success probability to ${rateWithChecklists}%, compared to ${rateWithoutChecklists}% for tasks without checklist items.`
                ) : (
                  `Your tasks currently have an overall completion rate of ${Math.round((completedTasks.length / Math.max(1, tasks.length)) * 100)}%. Dividing larger tasks into smaller, action-oriented checklists can help increase success rate and reduce starting friction.`
                )}
              </p>
            </div>

          </div>
        ) : (
          <div className="border border-dashed border-[#DCCFBE] rounded-[10px] bg-[#F8F3EC]/20 p-6.5 text-center space-y-6">
            <div className="max-w-md mx-auto space-y-2">
              <h4 className="text-base font-semibold text-[#2D2520] font-sans">
                Learning From Your Workflow
              </h4>
              <p className="text-xs text-[#6A625B] font-light leading-relaxed">
                We're still learning how you work. Complete tasks, finish focus sessions, and interact with DoNext to unlock personalized planning insights.
              </p>
            </div>

            {/* Progress indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto pt-2">
              <div className="bg-[#FFFDF9] border border-[#DCCFBE]/50 rounded-[10px] p-3.5 space-y-2 text-center shadow-xs">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#6A625B] block">Completed Tasks</span>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span className={`text-sm font-bold ${completedTasksCount >= 3 ? "text-[#5F7358]" : "text-[#75162D]"}`}>
                    {completedTasksCount}
                  </span>
                  <span className="text-xs text-[#6A625B]/60">/ 3</span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full bg-[#E8D9C1]/40 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#75162D] h-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (completedTasksCount / 3) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="bg-[#FFFDF9] border border-[#DCCFBE]/50 rounded-[10px] p-3.5 space-y-2 text-center shadow-xs">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#6A625B] block">Focus Sessions</span>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span className={`text-sm font-bold ${completedFocusSessions >= 5 ? "text-[#5F7358]" : "text-[#75162D]"}`}>
                    {completedFocusSessions}
                  </span>
                  <span className="text-xs text-[#6A625B]/60">/ 5</span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full bg-[#E8D9C1]/40 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#75162D] h-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (completedFocusSessions / 5) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="bg-[#FFFDF9] border border-[#DCCFBE]/50 rounded-[10px] p-3.5 space-y-2 text-center shadow-xs">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#6A625B] block">Activity Days</span>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span className={`text-sm font-bold ${activityDaysCount >= 7 ? "text-[#5F7358]" : "text-[#75162D]"}`}>
                    {activityDaysCount}
                  </span>
                  <span className="text-xs text-[#6A625B]/60">/ 7</span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full bg-[#E8D9C1]/40 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#75162D] h-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (activityDaysCount / 7) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
