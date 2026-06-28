import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext.js";
import { TaskModal } from "./TaskModal.js";
import { NudgeIcon } from "./NudgeIcon";
import { 
  Plus, CheckSquare, Square, AlertTriangle, Calendar, Clock, 
  Check, ChevronDown, ChevronUp, Trash2, Edit2, 
  Play, Pause, Award, Star, HelpCircle, Info, ChevronRight
} from "lucide-react";
import { getDaysRemaining } from "../utils/forecastEngine.js";
import { SubTask, Task } from "../types.js";

export const DashboardView: React.FC = () => {
  const { 
    user, tasks, forecastSummary, recommendedAction, 
    updateTask, deleteTask, toggleSubtask, decomposeWithAI,
    focusEvents = [], addFocusEvent
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<any>(undefined);
  const [taskFilter, setTaskFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [decomposingTasks, setDecomposingTasks] = useState<Record<string, boolean>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Learning From You card expansion
  const [learningExpanded, setLearningExpanded] = useState(false);

  // New Step Inline Insertion States
  const [insertingAfterIndex, setInsertingAfterIndex] = useState<number | null>(null);
  const [newStepName, setNewStepName] = useState("");

  // Focus Timer States
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(0); 
  const [timerTaskId, setTimerTaskId] = useState("");
  const [timerTaskName, setTimerTaskName] = useState("");
  const [timerSteps, setTimerSteps] = useState<SubTask[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [focusFinished, setFocusFinished] = useState(false);
  const [completedStepsCount, setCompletedStepsCount] = useState(0);
  const [stepCompletedFeedback, setStepCompletedFeedback] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState<string | null>(null);

  // Synchronize timer countdown
  useEffect(() => {
    let interval: any = null;
    if (isTimerActive && !isTimerPaused && timerSecondsLeft > 0) {
      interval = setInterval(() => {
        setTimerSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (timerSecondsLeft === 0 && isTimerActive) {
      // Current step timer completed
      handleStepTimerFinished();
    }
    return () => clearInterval(interval);
  }, [isTimerActive, isTimerPaused, timerSecondsLeft]);

  // Advance timer or complete session when a step finishes
  const handleStepTimerFinished = () => {
    completeCurrentStep();
  };

  const restartStep = () => {
    const currentStep = timerSteps[activeStepIndex];
    if (currentStep) {
      setTimerSecondsLeft((currentStep.duration || 15) * 60);
      addFocusEvent({
        taskId: timerTaskId,
        taskName: timerTaskName,
        subtaskId: currentStep.id,
        subtaskName: currentStep.name,
        eventType: 'restart_step',
        durationMinutes: currentStep.duration || 15
      });
    }
  };

  const skipStepEarly = () => {
    completeCurrentStep();
  };

  const completeCurrentStep = async () => {
    const currentTask = tasks.find(t => t.id === timerTaskId);
    if (!currentTask) return;

    const currentStep = timerSteps[activeStepIndex];
    if (!currentStep) return;

    // Record complete_step event (Requirement 10)
    addFocusEvent({
      taskId: timerTaskId,
      taskName: timerTaskName,
      subtaskId: currentStep.id,
      subtaskName: currentStep.name,
      eventType: 'complete_step',
      durationMinutes: currentStep.duration || 15
    });

    // Mark current subtask completed
    await toggleSubtask(timerTaskId, currentStep.id);
    setCompletedStepsCount(prev => prev + 1);

    // Show step completed feedback (Requirement 2)
    setStepCompletedFeedback(true);
    setTimeout(() => {
      setStepCompletedFeedback(false);
    }, 2000);

    // Pause the timer: "Do not automatically start the timer countdown. Load the next focus session and keep it ready." (Requirement 5)
    setIsTimerPaused(true);

    // Find the next incomplete subtask within the CURRENT task (Requirement 1)
    const updatedSubtasks = currentTask.subtasks.map(s => 
      s.id === currentStep.id ? { ...s, completed: true } : s
    );
    const nextIncompleteSubtask = updatedSubtasks.find(s => !s.completed);

    if (nextIncompleteSubtask) {
      // Load next subtask (Requirement 1 & 5)
      const nextStep: SubTask = {
        ...nextIncompleteSubtask,
        duration: nextIncompleteSubtask.duration || 15
      };

      const updatedSteps = [...timerSteps];
      updatedSteps[activeStepIndex + 1] = nextStep;
      setTimerSteps(updatedSteps);
      setActiveStepIndex(activeStepIndex + 1);
      setTimerSecondsLeft(nextStep.duration * 60);
    } else {
      // The current task is completed!
      // Do NOT end the system unless no active tasks remain.
      // Record complete_task event
      addFocusEvent({
        taskId: timerTaskId,
        taskName: timerTaskName,
        eventType: 'complete_task',
        durationMinutes: 0
      });

      // Mark the task complete in AppContext
      await updateTask(timerTaskId, { completed: true, completedAt: new Date().toISOString() });

      // Find other active tasks
      const remainingTasks = tasks.map(t => t.id === timerTaskId ? { ...t, completed: true } : t)
                                  .filter(t => !t.completed);

      if (remainingTasks.length === 0) {
        // "6. Only display a global completion state when: No active tasks remain. All subtasks across all tasks are completed."
        setIsTimerActive(false);
        setFocusFinished(true);
      } else {
        // "4. When a task is fully completed:
        //    * Automatically identify the next highest-priority pending task.
        //    * Load its first incomplete subtask into the Active Focus Session.
        //    * Prepare the next focus block using that subtask's estimated duration.
        //    * Present a smooth transition message such as: 'ML Assignment completed. Next: Buy Groceries – Preparation (30 min).'"
        
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        const sortedPending = [...remainingTasks].sort((a, b) => {
          const weightA = priorityWeight[a.priority] || 0;
          const weightB = priorityWeight[b.priority] || 0;
          if (weightB !== weightA) return weightB - weightA;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        });

        const nextTask = sortedPending[0];
        if (nextTask) {
          const nextTaskSubtask = nextTask.subtasks.find(s => !s.completed) || {
            id: `sub_fallback_${Date.now()}`,
            name: `General Focus`,
            completed: false,
            duration: 30,
            group: "Focus"
          };

          const nextStep: SubTask = {
            ...nextTaskSubtask,
            duration: nextTaskSubtask.duration || 30
          };

          // Transition message (Requirement 4)
          const msg = `"${currentTask.name}" completed. Next: ${nextTask.name} – ${nextStep.name} (${nextStep.duration} min).`;
          setTransitionMessage(msg);

          // Load it into Active Focus Session (Requirement 4 & 5)
          setTimerTaskId(nextTask.id);
          setTimerTaskName(nextTask.name);
          setTimerSteps([nextStep]);
          setActiveStepIndex(0);
          setTimerSecondsLeft(nextStep.duration * 60);
        } else {
          setIsTimerActive(false);
          setFocusFinished(true);
        }
      }
    }
  };

  // Find target task for recommended Do Next action
  const recommendedTask = recommendedAction 
    ? tasks.find(t => t.id === recommendedAction.taskId) 
    : null;

  // Generate today's focus session plan
  const getSessionPlan = (task: Task) => {
    // Get up to 3-4 incomplete subtasks
    const incomplete = task.subtasks.filter(s => !s.completed);
    
    if (incomplete.length === 0) {
      // Fallback if no subtasks
      return [{
        id: "fallback_focus",
        name: `General deep focus on ${task.name}`,
        completed: false,
        duration: 45,
        group: "Focus Core"
      }];
    }

    // Map and assign standard durations if missing
    return incomplete.slice(0, 4).map((s, idx) => ({
      ...s,
      duration: s.duration || (idx === 0 ? 20 : idx === 1 ? 15 : 10)
    }));
  };

  const sessionSteps = recommendedTask ? getSessionPlan(recommendedTask) : [];
  const totalSessionTime = sessionSteps.reduce((acc, s) => acc + (s.duration || 15), 0);

  // Handle inline step insertion inside the Do Next plan card
  const handleInsertSubtask = (e: React.FormEvent, taskId: string, afterIndex: number) => {
    e.preventDefault();
    if (!newStepName.trim() || !recommendedTask) return;

    const updatedSubtasks = [...recommendedTask.subtasks];
    const newSub: SubTask = {
      id: `sub_custom_${Date.now()}`,
      name: newStepName.trim(),
      completed: false,
      duration: 15, // Default 15 minutes
      group: sessionSteps[afterIndex]?.group || "UI Foundation"
    };

    // Find actual index inside full subtask list
    const actualIndex = recommendedTask.subtasks.findIndex(s => s.id === sessionSteps[afterIndex].id);
    if (actualIndex !== -1) {
      updatedSubtasks.splice(actualIndex + 1, 0, newSub);
    } else {
      updatedSubtasks.push(newSub);
    }

    updateTask(taskId, { subtasks: updatedSubtasks });
    setNewStepName("");
    setInsertingAfterIndex(null);
  };

  const handleAppendSubtask = (e: React.FormEvent, taskId: string) => {
    e.preventDefault();
    if (!newStepName.trim() || !recommendedTask) return;

    const updatedSubtasks = [...recommendedTask.subtasks];
    const newSub: SubTask = {
      id: `sub_custom_${Date.now()}`,
      name: newStepName.trim(),
      completed: false,
      duration: 15,
      group: sessionSteps[sessionSteps.length - 1]?.group || "General"
    };

    updatedSubtasks.push(newSub);
    updateTask(taskId, { subtasks: updatedSubtasks });
    setNewStepName("");
    setInsertingAfterIndex(null);
  };

  // Start Focus Session with specific steps
  const startFocusSession = (task: Task, steps: SubTask[]) => {
    setTimerTaskId(task.id);
    setTimerTaskName(task.name);
    setTimerSteps(steps);
    setActiveStepIndex(0);
    setTimerSecondsLeft((steps[0]?.duration || 15) * 60);
    setCompletedStepsCount(0);
    setIsTimerActive(true);
    setIsTimerPaused(false);
    setFocusFinished(false);
    setTransitionMessage(null);

    addFocusEvent({
      taskId: task.id,
      taskName: task.name,
      subtaskId: steps[0]?.id,
      subtaskName: steps[0]?.name,
      eventType: 'start_session',
      durationMinutes: steps[0]?.duration || 15
    });
  };

  // Helper formatting countdown
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Calculate total session time remaining in active timer
  const getTotalSessionSecondsLeft = () => {
    const activeStepSeconds = timerSecondsLeft;
    const futureStepsSeconds = timerSteps.slice(activeStepIndex + 1).reduce((acc, s) => acc + (s.duration || 15) * 60, 0);
    return activeStepSeconds + futureStepsSeconds;
  };

  // Filtering tasks
  const filteredTasks = tasks.filter(t => {
    if (taskFilter === "completed") return t.completed;
    if (taskFilter === "active") return !t.completed;
    return true;
  });

  const activeTasksCount = tasks.filter(t => !t.completed).length;

  // Tasks due this week
  const tasksDueThisWeek = tasks.filter(t => {
    if (t.completed) return false;
    const days = getDaysRemaining(t.deadline, "2026-06-27");
    return days >= 0 && days <= 7;
  }).length;

  const toggleExpand = (taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleEditClick = (task: any) => {
    setTaskToEdit(task);
    setIsModalOpen(true);
  };

  const handleAddNewClick = () => {
    setTaskToEdit(undefined);
    setIsModalOpen(true);
  };

  const handleDecomposeAI = async (taskId: string) => {
    setDecomposingTasks(prev => ({ ...prev, [taskId]: true }));
    try {
      await decomposeWithAI(taskId);
    } catch (err) {
      console.error(err);
    } finally {
      setDecomposingTasks(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  // Group subtasks hierarchically
  const getGroupedSubtasks = (subtasks: SubTask[]) => {
    const groups: Record<string, SubTask[]> = {};
    subtasks.forEach(s => {
      const g = s.group || "General Execution";
      if (!groups[g]) groups[g] = [];
      groups[g].push(s);
    });
    return groups;
  };

  // Dynamic actionable guidance inside the Do Next card
  let guidanceStatus = "✓ Schedule balanced";
  let guidanceRecommendation = "Continue with planned milestones.";

  if (recommendedTask) {
    if (recommendedTask.riskLevel === "High") {
      guidanceStatus = "⚠ High deadline risk detected";
      const subtaskCount = recommendedTask.subtasks ? recommendedTask.subtasks.filter(s => !s.completed).length : 0;
      guidanceRecommendation = subtaskCount > 0 
        ? `Recommended: Break ${recommendedTask.name} into smaller milestones.`
        : `Recommended: Decompose ${recommendedTask.name} today.`;
    } else if (forecastSummary?.upcomingPeak && forecastSummary.upcomingPeak !== "None" && forecastSummary.upcomingPeak !== "Stable" && forecastSummary.upcomingPeak !== "Low") {
      guidanceStatus = `⚠ Heavy workload expected on ${forecastSummary.upcomingPeak}`;
      guidanceRecommendation = `Recommended: Move ${recommendedTask.name} earlier.`;
    } else {
      guidanceStatus = "✓ Schedule balanced";
      guidanceRecommendation = "Continue with planned milestones.";
    }
  } else {
    guidanceStatus = "✓ Schedule balanced";
    guidanceRecommendation = "No workload peaks detected this week.";
  }

  return (
    <div className="flex-1 bg-transparent pb-16 space-y-8 px-4 sm:px-6 lg:px-8 pt-8 max-w-5xl mx-auto w-full animate-fadeIn transition-colors duration-300">
      
      {/* 1. Welcome Summary Block */}
      <div className="rounded-[10px] border border-[#DCCFBE] bg-[#FFFDF9] p-6.5 shadow-xs flex flex-wrap md:flex-nowrap items-center justify-between gap-6 transition-colors">
        <div className="space-y-1">
          <h2 className="text-3xl font-normal text-[#2D2520] font-display">
            Welcome back, {user?.displayName ? user.displayName.split(" ")[0] : "Planner"}!
          </h2>
          <p className="text-xs text-[#6A625B] mt-0.5 font-light leading-relaxed">
            Your workload is balanced and on track.
          </p>
        </div>

        {/* Compact Metrics Strip */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-8 grow justify-start md:justify-end">
          <div className="text-left sm:text-right border-l sm:border-l-0 sm:border-r border-[#DCCFBE]/30 pl-3 sm:pl-0 sm:pr-6 min-w-[75px]">
            <span className="text-[10px] font-bold text-[#6A625B] uppercase tracking-wider block">Active Tasks</span>
            <span className="text-xl font-bold text-[#2D2520] font-sans block mt-1">
              {activeTasksCount}
            </span>
          </div>

          <div className="text-left sm:text-right border-l sm:border-l-0 sm:border-r border-[#DCCFBE]/30 pl-3 sm:pl-0 sm:pr-6 min-w-[75px]">
            <span className="text-[10px] font-bold text-[#6A625B] uppercase tracking-wider block">Due This Week</span>
            <span className={`text-xl font-bold font-sans block mt-1 ${tasksDueThisWeek > 2 ? 'text-[#75162D]' : 'text-[#2D2520]'}`}>
              {tasksDueThisWeek}
            </span>
          </div>

          <div className="text-left sm:text-right border-l border-[#DCCFBE]/30 pl-3 min-w-[75px]">
            <span className="text-[10px] font-bold text-[#6A625B] uppercase tracking-wider block">Success Chance</span>
            <span className="text-xl font-bold text-[#5F7358] font-sans block mt-1">
              {forecastSummary.completionProbability}%
            </span>
          </div>
        </div>
      </div>

      {/* Focus Timer View Overlay */}
      {isTimerActive && (
        <div className="rounded-[10px] bg-[#3B010B] text-[#F5EFE6] p-6 shadow-md border border-[#75162D] relative overflow-hidden space-y-5 animate-slideUp">
          <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-[#75162D] opacity-10 rounded-full pointer-events-none animate-pulse" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#5F7358] animate-ping" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#E8D9C1]">Active Focus Session</span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={restartStep}
                className="text-xs text-[#E8D9C1] hover:text-white underline cursor-pointer flex items-center gap-1"
              >
                ↻ Restart Step
              </button>
              <span className="text-[#E8D9C1]/30 text-xs">|</span>
              <button 
                onClick={() => setIsTimerActive(false)}
                className="text-xs text-[#E8D9C1] hover:text-white underline cursor-pointer"
              >
                Minimize
              </button>
            </div>
          </div>

          {/* Smooth transition message banner */}
          {transitionMessage && (
            <div className="bg-[#E8D9C1]/10 text-[#E8D9C1] border border-[#E8D9C1]/20 rounded-[8px] p-3 text-xs flex items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2">
                <Star className="h-3.5 w-3.5 text-[#E8D9C1] shrink-0" />
                <span className="font-light">{transitionMessage}</span>
              </div>
              <button 
                onClick={() => setTransitionMessage(null)}
                className="text-[#E8D9C1] hover:text-white font-bold cursor-pointer transition-colors text-[10px] shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            {/* Left Column: Subtask Checklist Progress */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <span className="text-[9px] font-semibold text-[#E8D9C1] uppercase tracking-wider block">Project</span>
                <h3 className="text-lg font-bold text-white font-sans truncate">{timerTaskName}</h3>
              </div>

              {/* Subtask Queue */}
              <div className="space-y-2 border-l border-[#DCCFBE]/20 pl-4">
                {timerSteps.map((step, idx) => {
                  const isActive = idx === activeStepIndex;
                  const isDone = idx < activeStepIndex;
                  
                  return (
                    <div 
                      key={step.id} 
                      className={`flex items-center justify-between p-2 rounded-[8px] transition-all duration-200 ${
                        isActive 
                          ? "bg-[#75162D] border border-[#DCCFBE]/30 text-white font-semibold" 
                          : isDone 
                          ? "text-[#F5EFE6]/40 line-through" 
                          : "text-[#F5EFE6]/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded-[4px] flex items-center justify-center border transition-all ${
                          isDone 
                            ? "bg-[#5F7358] border-transparent text-[#F5EFE6]" 
                            : isActive 
                            ? "border-[#E8D9C1] text-transparent animate-pulse" 
                            : "border-[#F5EFE6]/30 text-transparent"
                        }`}>
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs">{step.name}</span>
                      </div>
                      <span className="text-[10px] font-mono opacity-85">{step.duration || 15}m</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Timer Display and controls */}
            <div className="md:col-span-5 text-center py-4 border-t md:border-t-0 md:border-l border-[#DCCFBE]/20 space-y-4">
              {stepCompletedFeedback ? (
                <div className="flex flex-col items-center justify-center py-4 space-y-1.5 animate-scaleUp">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#5F7358]/30 border border-[#5F7358]/40 text-[#5F7358] font-bold text-xs">
                    <Check className="h-4 w-4" />
                    ✓ Step Completed
                  </span>
                  <p className="text-[10px] text-[#E8D9C1]">Preparing next recommended subtask...</p>
                </div>
              ) : (
                <div>
                  <p className="text-[10px] font-semibold text-[#E8D9C1] uppercase tracking-widest truncate max-w-[250px] mx-auto" title={timerSteps[activeStepIndex]?.name || "Active Step Time"}>
                    {timerSteps[activeStepIndex]?.name || "Active Step Time"} ({timerSteps[activeStepIndex]?.duration || 15}m)
                  </p>
                  <div className="text-5xl font-mono font-bold text-white tracking-tight py-2">
                    {formatTime(timerSecondsLeft)}
                  </div>
                  <p className="text-[10px] text-[#F5EFE6]/60">
                    Total Session Left: {formatTime(getTotalSessionSecondsLeft())}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setIsTimerPaused(!isTimerPaused)}
                  className="flex items-center gap-1.5 bg-[#75162D] hover:bg-[#560B18] text-white border border-[#DCCFBE]/30 rounded-[8px] px-4 py-2 text-xs font-semibold cursor-pointer transition-colors"
                >
                  {isTimerPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  <span>{isTimerPaused ? "Resume" : "Pause"}</span>
                </button>

                <button
                  onClick={skipStepEarly}
                  className="flex items-center gap-1.5 bg-[#5F7358] hover:bg-[#4E5F48] text-white rounded-[8px] px-4 py-2 text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Check &amp; Next</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Focus Finished Congratulatory Screen (Global Completion State) */}
      {focusFinished && (
        <div className="rounded-[12px] border border-[#DCCFBE] bg-[#FFFDF9] p-8 md:p-10 shadow-sm text-center space-y-8 animate-scaleUp transition-all duration-300">
          <div className="mx-auto w-16 h-16 rounded-full bg-[#5F7358]/10 border border-[#5F7358]/20 flex items-center justify-center">
            <Award className="h-8 w-8 text-[#5F7358]" />
          </div>
          
          <div className="space-y-2.5 max-w-xl mx-auto">
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#75162D] uppercase block">Workload Cleared</span>
            <h3 className="text-2xl font-normal text-[#2D2520] font-display leading-tight">Every Milestone Achieved</h3>
            <p className="text-xs text-[#6A625B] leading-relaxed font-light">
              {(() => {
                const totalMinutesFocused = focusEvents.filter((e: any) => e.eventType === 'complete_step').reduce((acc: number, e: any) => acc + e.durationMinutes, 0);
                const totalSessionsCompleted = focusEvents.filter((e: any) => e.eventType === 'complete_step').length;
                if (totalMinutesFocused === 0) {
                  return "You've successfully organized your entire workload! Every task is neatly aligned, and all checkpoints are completed. Your mental calendar is clear and ready.";
                }
                if (totalMinutesFocused < 60) {
                  return `An outstanding achievement! You maintained deep focus across ${totalSessionsCompleted} session${totalSessionsCompleted !== 1 ? 's' : ''} to complete all scheduled subtasks. By pacing your efforts sequentially, you protected your focus and cleared your workload without friction.`;
                }
                const hours = (totalMinutesFocused / 60).toFixed(1);
                return `An exceptional pacing milestone! You accumulated ${hours} hours of high-quality, continuous deep focus to finish every single task. This methodical approach ensures your projects were completed on time while completely eliminating last-minute scheduling pressure.`;
              })()}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto pt-2">
            <div className="border border-[#DCCFBE]/60 bg-[#F8F3EC]/50 rounded-[10px] p-4 text-center">
              <span className="text-[10px] font-mono font-semibold text-[#6A625B] uppercase tracking-wider block">Tasks Cleared</span>
              <span className="text-2xl font-bold text-[#75162D] font-sans mt-1.5 block font-display">
                {tasks.filter(t => t.completed).length}
              </span>
            </div>
            
            <div className="border border-[#DCCFBE]/60 bg-[#F8F3EC]/50 rounded-[10px] p-4 text-center">
              <span className="text-[10px] font-mono font-semibold text-[#6A625B] uppercase tracking-wider block">Focus Sessions</span>
              <span className="text-2xl font-bold text-[#75162D] font-sans mt-1.5 block font-display">
                {focusEvents.filter((e: any) => e.eventType === 'complete_step').length}
              </span>
            </div>

            <div className="border border-[#DCCFBE]/60 bg-[#F8F3EC]/50 rounded-[10px] p-4 text-center">
              <span className="text-[10px] font-mono font-semibold text-[#6A625B] uppercase tracking-wider block">Minutes Focused</span>
              <span className="text-2xl font-bold text-[#75162D] font-sans mt-1.5 block font-display">
                {focusEvents.filter((e: any) => e.eventType === 'complete_step').reduce((acc: number, e: any) => acc + e.durationMinutes, 0)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center pt-2">
            <button
              onClick={() => {
                setFocusFinished(false);
                setTimerTaskId("");
                setTimerTaskName("");
              }}
              className="bg-[#75162D] hover:bg-[#560B18] text-[#F5EFE6] rounded-[8px] px-8 py-3 text-xs font-semibold cursor-pointer transition-all shadow-xs"
            >
              Back to Planner
            </button>
          </div>
        </div>
      )}

      {/* 2. Redesigned "Do Next" Card: SMART Focus Session Plan */}
      {!isTimerActive && !focusFinished && (
        <div className="rounded-[10px] bg-[#75162D] text-[#F5EFE6] shadow-md border border-[#3B010B]/30 relative overflow-hidden flex flex-col p-6 sm:p-8 space-y-6 animate-slideUp transition-all duration-300">
          
          {/* Subtle background decoration with deep wine overlay */}
          <div className="absolute inset-0 bg-[#3B010B] opacity-15 pointer-events-none" />
          <div className="absolute top-[-60px] right-[-60px] w-56 h-56 bg-white opacity-[0.04] rounded-full pointer-events-none" />
          
          <div className="flex items-start justify-between relative z-10 w-full">
            <div className="space-y-1.5">
              <h2 className="text-3xl font-semibold tracking-[0.04em] text-[#F5EFE6] font-display uppercase leading-tight">
                DO NEXT
              </h2>
              <p className="text-xs text-[#E8D9C1] tracking-wide uppercase font-sans font-light">Today's Focus Session</p>
            </div>
            
            <span className="text-[10px] bg-[#3B010B]/40 text-[#F5EFE6] px-3 py-1.5 rounded-[6px] font-mono tracking-wider font-semibold uppercase border border-[#E8D9C1]/20">
              {recommendedTask ? `${recommendedAction?.expectedRiskReduction || 35}% Risk Reduction` : 'No Risk'}
            </span>
          </div>

          <div className="space-y-5 relative z-10">
            {recommendedTask && (
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
                {recommendedTask.name}
              </h3>
            )}

            {/* Clean Inline Guidance (No alert cards, boxes, stacked banners, or dismiss buttons) */}
            <div className="space-y-1.5 border-l-2 border-[#E8D9C1]/30 pl-4">
              <p className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                {guidanceStatus}
              </p>
              <p className="text-xs sm:text-sm text-[#E8D9C1] font-light leading-relaxed">
                {guidanceRecommendation}
              </p>
            </div>

            {/* Focus Session button at the bottom */}
            {recommendedTask && (
              <div className="flex justify-end pt-3">
                <button
                  onClick={() => startFocusSession(recommendedTask, sessionSteps)}
                  className="rounded-[8px] bg-[#F5EFE6] hover:bg-white px-6 py-3 text-xs font-bold text-[#75162D] shadow-sm transition-all hover:scale-101 active:scale-99 cursor-pointer"
                >
                  Start Focus Session
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Tasks Due Soon Redesign */}
      <div className="rounded-[10px] border border-[#DCCFBE] bg-[#FFFDF9] p-6.5 shadow-xs space-y-6 transition-colors">
        
        {/* Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#DCCFBE]/30 pb-4">
          <div>
            <h3 className="text-xl font-normal text-[#2D2520] font-display tracking-wide">Tasks Due Soon</h3>
            <p className="text-xs text-[#6A625B] mt-1 font-light">
              Organize complex workloads and structure your project subtasks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* Simple Tab-Style Filter */}
            <div className="flex rounded-[8px] bg-[#F8F3EC] p-1 border border-[#DCCFBE]/45">
              {(['active', 'completed', 'all'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setTaskFilter(f)}
                  className={`rounded-[6px] px-3 py-1.5 text-xs font-semibold tracking-wide transition-all cursor-pointer capitalize ${
                    taskFilter === f 
                      ? "bg-[#75162D] text-[#F5EFE6] shadow-2xs" 
                      : "text-[#6A625B] hover:text-[#2D2520]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Create Task Button */}
            <button
              onClick={handleAddNewClick}
              className="rounded-[8px] bg-[#75162D] hover:bg-[#560B18] px-4.5 py-2.5 text-xs font-semibold text-[#F5EFE6] shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* Compact Task List */}
        <div className="divide-y divide-[#DCCFBE]/30 space-y-3.5">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <HelpCircle className="mx-auto h-12 w-12 text-[#DCCFBE]/70 mb-3" />
              <h4 className="text-sm font-semibold text-[#2D2520] font-sans">No tasks in view</h4>
              <p className="text-xs text-[#6A625B] max-w-sm mx-auto mt-1 font-light">
                Create a task to forecast workload bottlenecks and design a milestone plan.
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isExpanded = expandedTasks[task.id] || false;
              const totalSub = task.subtasks.length;
              const completedSub = task.subtasks.filter(s => s.completed).length;
              const isDecomposing = decomposingTasks[task.id] || false;

              return (
                <div key={task.id} className="pt-4 first:pt-0 space-y-3">
                  
                  {/* COMPACT CARD ROW (DESKTOP) */}
                  <div className="hidden md:flex items-center justify-between gap-4">
                    
                    {/* Checkbox and main compact info */}
                    <div className="flex items-center gap-3.5 flex-1 min-w-[240px]">
                      <button
                        onClick={() => updateTask(task.id, { completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : undefined })}
                        className="text-[#DCCFBE] hover:text-[#75162D] transition-colors cursor-pointer shrink-0"
                      >
                        {task.completed ? (
                          <CheckSquare className="h-5 w-5 text-[#75162D]" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>

                      <div className="space-y-1">
                        <h4 className={`text-sm font-semibold ${task.completed ? "line-through text-[#6A625B]/60 font-normal" : "text-[#2D2520]"}`}>
                          {task.name}
                        </h4>
                        
                        {/* Inline details with tooltip on hover */}
                        <div className="flex items-center gap-3 text-[10px] font-mono tracking-wide text-[#6A625B]">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-[#75162D]" />
                            {task.deadline}
                          </span>
                          
                          {/* ESTIMATE HOURS TOOLTIP */}
                          {task.estimatedHours && (
                            <div className="group relative inline-block">
                              <span className="flex items-center gap-1 cursor-help hover:text-[#2D2520]">
                                <Clock className="h-3 w-3 text-[#75162D]" />
                                {task.estimatedHours} hrs
                              </span>
                              
                              {/* Elegantly styled absolute tooltip container */}
                              <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-[#FFFDF9] text-[#2D2520] text-[10px] rounded-[10px] shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none border border-[#DCCFBE]">
                                <p className="font-semibold border-b border-[#DCCFBE] pb-1.5 mb-1.5 text-[#75162D]">Estimation Insights</p>
                                <p className="leading-relaxed text-[#6A625B]">Original target: {task.estimatedHours} hours. Recommended adjustments included to prevent scheduling friction.</p>
                                {task.aiEstimateReasoning && (
                                  <p className="mt-1.5 text-[#75162D] leading-normal italic">&ldquo;{task.aiEstimateReasoning}&rdquo;</p>
                                )}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#DCCFBE]" />
                              </div>
                            </div>
                          )}

                          <span className="uppercase text-[9px] tracking-wider px-1.5 py-0.5 rounded-[4px] bg-[#F8F3EC] border border-[#DCCFBE]/30">
                            {task.priority} Priority
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Operational controls */}
                    <div className="flex items-center gap-3">
                      
                      {/* RISK BADGE WITH HOVER TOOLTIP */}
                      <div className="group relative shrink-0 min-w-[85px] text-center">
                        <span className={`inline-block px-2 py-1 rounded-[6px] text-[9px] font-bold tracking-wider uppercase cursor-help transition-all ${
                          task.riskLevel === "High" 
                            ? "bg-[#75162D]/10 text-[#75162D] border border-[#75162D]/20" 
                            : task.riskLevel === "Medium" 
                            ? "bg-[#A06A3C]/10 text-[#A06A3C] border border-[#A06A3C]/20" 
                            : "bg-[#5F7358]/10 text-[#5F7358] border border-[#5F7358]/20"
                        }`}>
                          {task.riskLevel} Risk
                        </span>

                        {/* Elegantly styled tooltip container for risk details */}
                        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-3 bg-[#FFFDF9] text-[#2D2520] text-[10px] rounded-[10px] shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none border border-[#DCCFBE]">
                          <p className="font-semibold border-b border-[#DCCFBE] pb-1.5 mb-1.5 flex items-center gap-1 text-[#75162D]">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Risk Breakdown</span>
                          </p>
                          <p className="leading-relaxed text-[#6A625B] font-light">{task.riskReason}</p>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#DCCFBE]" />
                        </div>
                      </div>

                      {/* SMART DECOMPOSITION BUTTON / STATUS */}
                      {!task.completed && (
                        totalSub > 0 ? (
                          <span className="text-[10px] font-bold text-[#5F7358] bg-[#5F7358]/10 px-2.5 py-1.5 rounded-[6px] border border-[#5F7358]/20 flex items-center gap-1 shrink-0">
                            ✓ Plan Ready
                          </span>
                        ) : (
                          <button
                            disabled={isDecomposing}
                            onClick={() => handleDecomposeAI(task.id)}
                            className="rounded-[8px] border border-[#75162D] bg-transparent hover:bg-[#75162D]/5 text-[#75162D] px-3 py-1.5 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50 shrink-0"
                          >
                            {isDecomposing ? (
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#75162D] border-t-transparent" />
                            ) : (
                              <NudgeIcon className="h-3.5 w-3.5 text-[#75162D]" />
                            )}
                            <span>{isDecomposing ? "Structuring..." : "Break Into Steps"}</span>
                          </button>
                        )
                      )}

                      {/* Editing and deletion */}
                      <button
                        onClick={() => handleEditClick(task)}
                        title="Edit Task"
                        className="rounded-[8px] border border-[#DCCFBE] hover:bg-[#F8F3EC] text-[#6A625B] hover:text-[#2D2520] p-2 transition-colors cursor-pointer shrink-0"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      
                      <button
                        onClick={() => deleteTask(task.id)}
                        title="Delete Task"
                        className="rounded-[8px] border border-[#DCCFBE] hover:bg-[#75162D]/10 text-[#6A625B] hover:text-[#75162D] p-2 transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>

                      {/* View Plan toggle */}
                      {(totalSub > 0) && (
                        <button
                           onClick={() => toggleExpand(task.id)}
                           className="rounded-[8px] border border-[#DCCFBE] bg-[#F8F3EC] hover:bg-[#E8D9C1]/50 text-[#2D2520] px-3 py-1.5 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <span>{isExpanded ? "Hide Plan" : "View Plan"}</span>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      )}

                    </div>

                  </div>

                  {/* COMPACT CARD ROW (MOBILE RESPONSIVE LAYOUT) */}
                  <div className="flex md:hidden flex-col gap-3 border border-[#DCCFBE]/60 rounded-[10px] p-4 bg-[#FFFDF9]/60">
                    
                    {/* Row 1: Checkbox + Task Title */}
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => updateTask(task.id, { completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : undefined })}
                        className="text-[#DCCFBE] hover:text-[#75162D] transition-colors cursor-pointer shrink-0 mt-0.5"
                      >
                        {task.completed ? (
                          <CheckSquare className="h-5 w-5 text-[#75162D]" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>
                      <h4 className={`text-sm font-semibold leading-tight ${task.completed ? "line-through text-[#6A625B]/60 font-normal" : "text-[#2D2520]"}`}>
                        {task.name}
                      </h4>
                    </div>

                    {/* Row 2: Due Date, Estimated Duration, Priority */}
                    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[10px] font-mono tracking-wide text-[#6A625B]">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-[#75162D]" />
                        {task.deadline}
                      </span>
                      {task.estimatedHours && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-[#75162D]" />
                          {task.estimatedHours} hrs
                        </span>
                      )}
                      <span className="uppercase text-[9px] tracking-wider px-1.5 py-0.5 rounded-[4px] bg-[#F8F3EC] border border-[#DCCFBE]/30">
                        {task.priority} Priority
                      </span>
                    </div>

                    {/* Row 3: Risk Badge, Plan Status Badge */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* RISK BADGE */}
                      <span className={`inline-block px-2 py-1 rounded-[6px] text-[9px] font-bold tracking-wider uppercase transition-all ${
                        task.riskLevel === "High" 
                          ? "bg-[#75162D]/10 text-[#75162D] border border-[#75162D]/20" 
                          : task.riskLevel === "Medium" 
                          ? "bg-[#A06A3C]/10 text-[#A06A3C] border border-[#A06A3C]/20" 
                          : "bg-[#5F7358]/10 text-[#5F7358] border border-[#5F7358]/20"
                      }`}>
                        {task.riskLevel} Risk
                      </span>

                      {/* PLAN STATUS BADGE */}
                      {task.completed ? (
                        <span className="text-[10px] font-bold text-[#6A625B] bg-[#F8F3EC] px-2 py-1 rounded-[6px] border border-[#DCCFBE]/20 flex items-center gap-1 shrink-0">
                          Completed
                        </span>
                      ) : totalSub > 0 ? (
                        <span className="text-[10px] font-bold text-[#5F7358] bg-[#5F7358]/10 px-2 py-1 rounded-[6px] border border-[#5F7358]/20 flex items-center gap-1 shrink-0">
                          ✓ Plan Ready
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-[#A06A3C] bg-[#A06A3C]/10 px-2 py-1 rounded-[6px] border border-[#A06A3C]/20 flex items-center gap-1 shrink-0">
                          No Steps Planned
                        </span>
                      )}
                    </div>

                    {/* Row 4: Primary Action Button */}
                    {!task.completed && (
                      <div className="pt-0.5">
                        {totalSub > 0 ? (
                          <button
                            onClick={() => toggleExpand(task.id)}
                            className="w-full rounded-[8px] border border-[#DCCFBE] bg-[#F8F3EC] hover:bg-[#E8D9C1]/50 text-[#2D2520] px-3.5 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                          >
                            <span>{isExpanded ? "Hide Plan" : "View Plan"}</span>
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                        ) : (
                          <button
                            disabled={isDecomposing}
                            onClick={() => handleDecomposeAI(task.id)}
                            className="w-full rounded-[8px] border border-[#75162D] bg-[#75162D] text-[#F5EFE6] hover:bg-[#560B18] px-3.5 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                          >
                            {isDecomposing ? (
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#F5EFE6] border-t-transparent" />
                            ) : (
                              <NudgeIcon className="h-3.5 w-3.5 text-[#E8D9C1]" />
                            )}
                            <span>{isDecomposing ? "Structuring..." : "Create Subtasks"}</span>
                          </button>
                        )}
                      </div>
                    )}

                    {task.completed && totalSub > 0 && (
                      <div className="pt-0.5">
                        <button
                          onClick={() => toggleExpand(task.id)}
                          className="w-full rounded-[8px] border border-[#DCCFBE] bg-[#F8F3EC] hover:bg-[#E8D9C1]/50 text-[#2D2520] px-3.5 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                        >
                          <span>{isExpanded ? "Hide Plan" : "View Plan"}</span>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    )}

                    {/* Row 5: Secondary Actions (Edit/Delete) */}
                    <div className="flex gap-2.5 pt-0.5">
                      <button
                        onClick={() => handleEditClick(task)}
                        className="flex-1 flex items-center justify-center gap-2 rounded-[8px] border border-[#DCCFBE] bg-[#FFFDF9] hover:bg-[#F8F3EC] text-[#6A625B] hover:text-[#2D2520] py-2.5 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                      
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="flex-1 flex items-center justify-center gap-2 rounded-[8px] border border-[#DCCFBE] hover:border-[#75162D]/40 bg-[#FFFDF9] hover:bg-[#75162D]/5 text-[#6A625B] hover:text-[#75162D] py-2.5 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>

                  </div>

                  {/* HIERARCHICAL COLLAPSIBLE SUBTASK PLAN */}
                  {(isExpanded && totalSub > 0) && (
                    <div className="ml-8 border-l border-[#DCCFBE] pl-5 py-2 space-y-4 animate-slideUp">
                      <div className="flex items-center justify-between border-b border-[#DCCFBE]/30 pb-1.5">
                        <span className="text-[10px] font-bold text-[#6A625B] uppercase tracking-wider">
                          Plan Milestones ({completedSub}/{totalSub})
                        </span>
                        <span className="text-[10px] text-[#6A625B]/75 font-mono">
                          Active Focus Loops
                        </span>
                      </div>

                      {/* Group and display Hierarchical Structure */}
                      {Object.entries(getGroupedSubtasks(task.subtasks)).map(([groupName, groupItems]) => {
                        const groupKey = `${task.id}_${groupName}`;
                        const isCollapsed = collapsedGroups[groupKey] || false;
                        const completedInGroup = groupItems.filter(g => g.completed).length;

                        return (
                          <div key={groupName} className="space-y-2">
                            {/* Group Header collapsible toggle */}
                            <button
                              onClick={() => toggleGroupCollapse(groupKey)}
                              className="flex items-center justify-between w-full text-left font-semibold text-xs text-[#2D2520] hover:text-[#75162D] cursor-pointer transition-colors py-1"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="text-[#6A625B]">
                                  {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                </span>
                                <span>{groupName}</span>
                                <span className="text-[10px] font-mono text-[#6A625B]/85 ml-1">
                                  ({completedInGroup}/{groupItems.length})
                                </span>
                              </div>
                            </button>

                            {/* Subtask items in group */}
                            {!isCollapsed && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-5 animate-slideDown">
                                {groupItems.map((sub) => (
                                  <label 
                                    key={sub.id} 
                                    className="flex items-start justify-between gap-3 p-2.5 rounded-[8px] border border-[#DCCFBE]/40 hover:bg-[#F8F3EC]/50 text-xs text-[#2D2520] cursor-pointer select-none transition-all"
                                  >
                                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                      <input 
                                        type="checkbox" 
                                        checked={sub.completed}
                                        onChange={() => toggleSubtask(task.id, sub.id)}
                                        className="rounded-[4px] border-[#DCCFBE] text-[#75162D] focus:ring-[#75162D] mt-0.5 shrink-0"
                                      />
                                      <span className={`break-words text-xs leading-tight ${sub.completed ? "line-through text-[#6A625B]/60" : "text-[#2D2520] font-medium"}`}>
                                        {sub.name}
                                      </span>
                                    </div>
                                    <span className="text-[9px] font-mono text-[#6A625B] px-1.5 py-0.5 rounded-[4px] bg-[#F8F3EC] shrink-0 mt-0.5">
                                      {sub.duration || 15}m
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}

                          </div>
                        );
                      })}

                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

      </div>

      {/* 4. Learning From You Card (Compact expandable) */}
      <div className="rounded-[10px] border border-[#DCCFBE] bg-[#F8F3EC] p-7 shadow-xs space-y-4.5 transition-colors">
        
        {/* Header Block with toggles */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Star className="h-4.5 w-4.5 text-[#75162D]" />
            <h3 className="text-lg font-normal text-[#2D2520] font-display">Learning From You</h3>
          </div>
          
          <button
            onClick={() => setLearningExpanded(!learningExpanded)}
            className="text-xs font-semibold text-[#75162D] hover:text-[#560B18] hover:underline cursor-pointer flex items-center gap-1 transition-colors"
          >
            <span>{learningExpanded ? "Collapse Note" : "Read Full Note"}</span>
            {learningExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Collapsed State */}
        {!learningExpanded ? (
          <p className="text-xs text-[#6A625B] font-light pl-7 leading-relaxed italic">
            "We quietly schedule milestones, pace daily tasks, and help format focused work sessions to ensure your calendar retains enough room to think."
          </p>
        ) : (
          /* Expanded State */
          <div className="pl-7 space-y-4 pt-1 animate-fadeIn">
            <p className="text-xs text-[#2D2520] font-light leading-relaxed italic border-b border-[#DCCFBE]/40 pb-3">
              Observations gathered over the past month to aid your rhythm:
            </p>
            
            <ul className="space-y-3 text-xs text-[#2D2520] font-light leading-relaxed">
              {(() => {
                const totalSessionsCompleted = focusEvents.filter((e: any) => e.eventType === 'complete_step').length;
                const totalMinutesFocused = focusEvents.filter((e: any) => e.eventType === 'complete_step').reduce((acc: number, e: any) => acc + e.durationMinutes, 0);
                if (totalSessionsCompleted > 0) {
                  return (
                    <li className="flex items-start gap-2.5 font-medium text-[#75162D]">
                      <span className="text-[#5F7358] select-none font-semibold mt-0.5">★</span>
                      <span>Your focus logs are active: You completed {totalSessionsCompleted} interval{totalSessionsCompleted !== 1 ? 's' : ''} for a total of {totalMinutesFocused} focused minutes! We are adjusting our forecast models.</span>
                    </li>
                  );
                }
                return null;
              })()}
              <li className="flex items-start gap-2.5">
                <span className="text-[#75162D] select-none font-semibold mt-0.5">&bull;</span>
                <span>We notice your projects often unfold about 20% longer than early thoughts. We've paced tasks to keep your deadlines balanced.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#75162D] select-none font-semibold mt-0.5">&bull;</span>
                <span>Tuesday usually carries your heaviest workload. Gently drifting minor milestones to early Monday keeps your week flowing evenly.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#75162D] select-none font-semibold mt-0.5">&bull;</span>
                <span>Morning focus blocks appear to be your most creative times. Beginning recommended DoNext sessions early helps protect your energy.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#75162D] select-none font-semibold mt-0.5">&bull;</span>
                <span>Subdividing ambitious tasks keeps momentum solid. Crafting custom step plans has consistently lowered overall scheduling stress.</span>
              </li>
            </ul>
          </div>
        )}

      </div>

      {/* Task adding/editing modal */}
      <TaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        taskToEdit={taskToEdit} 
      />

    </div>
  );
};
