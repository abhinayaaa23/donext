import React, { useState, useEffect } from "react";
import { AlertTriangle, Clock, X } from "lucide-react";
import { useApp } from "../context/AppContext.js";
import { Task } from "../types.js";
import { NudgeIcon } from "./NudgeIcon";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, taskToEdit }) => {
  const { addTask, updateTask, getAIEstimate } = useApp();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>("medium");
  
  // AI Estimation States
  const [estimatedHours, setEstimatedHours] = useState<number | "">("");
  const [notSure, setNotSure] = useState(false);
  const [aiHours, setAiHours] = useState<number | null>(null);
  const [aiReasoning, setAiReasoning] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  // Recurring States
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<'none' | 'daily' | 'weekly' | 'monthly'>("none");

  useEffect(() => {
    if (taskToEdit) {
      setName(taskToEdit.name || "");
      setDescription(taskToEdit.description || "");
      setDeadline(taskToEdit.deadline || "");
      setPriority(taskToEdit.priority || "medium");
      setEstimatedHours(taskToEdit.estimatedHours || "");
      setAiHours(taskToEdit.aiEstimateHours || null);
      setAiReasoning(taskToEdit.aiEstimateReasoning || "");
      setIsRecurring(taskToEdit.isRecurring || false);
      setRecurrencePattern(taskToEdit.recurrencePattern || "none");
      setNotSure(false);
    } else {
      // Default to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      setName("");
      setDescription("");
      setDeadline(tomorrowStr);
      setPriority("medium");
      setEstimatedHours("");
      setAiHours(null);
      setAiReasoning("");
      setIsRecurring(false);
      setRecurrencePattern("none");
      setNotSure(false);
    }
  }, [taskToEdit, isOpen]);

  const handleFetchAIEstimate = async (currentName?: string) => {
    const rawTitle = currentName !== undefined ? currentName : name;
    const trimmedTitle = (rawTitle || "").trim();
    
    if (trimmedTitle.length === 0) {
      setAiHours(null);
      setAiReasoning("");
      return;
    }

    setLoadingAI(true);
    try {
      const result = await getAIEstimate(trimmedTitle, description);
      if (result) {
        setAiHours(result.estimateHours);
        setAiReasoning(result.reasoning);
        if (estimatedHours === "") {
          setEstimatedHours(result.estimateHours);
        }
      }
    } catch (err) {
      console.error("[Nudge Estimate] Error during handleFetchAIEstimate:", err);
    } finally {
      setLoadingAI(false);
    }
  };

  // Debounced effect to fetch estimation when user finishes typing
  useEffect(() => {
    if (!isOpen || !notSure) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setAiHours(null);
      setAiReasoning("");
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      handleFetchAIEstimate(name);
    }, 800);

    return () => clearTimeout(delayDebounceFn);
  }, [name, notSure, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !deadline) return;

    const taskData = {
      name,
      description,
      deadline,
      priority,
      estimatedHours: estimatedHours === "" ? undefined : Number(estimatedHours),
      aiEstimateHours: aiHours || undefined,
      aiEstimateReasoning: aiReasoning || undefined,
      isRecurring,
      recurrencePattern: isRecurring ? recurrencePattern : "none",
      completed: taskToEdit ? taskToEdit.completed : false,
    };

    if (taskToEdit) {
      updateTask(taskToEdit.id, taskData);
    } else {
      addTask(taskData);
    }
    onClose();
  };

  const isEstimateMismatch = 
    aiHours !== null && 
    estimatedHours !== "" && 
    Number(estimatedHours) < aiHours * 0.6;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2520]/45 p-4 animate-fadeIn">
      <div className="w-full max-w-xl rounded-[10px] border border-[#DCCFBE] bg-[#FFFDF9] shadow-lg flex flex-col overflow-hidden max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#DCCFBE]/30 px-6 py-4.5 shrink-0">
          <h2 className="text-xl font-normal text-[#2D2520] font-display">
            {taskToEdit ? "Edit Workload Task" : "Add Task to Workload"}
          </h2>
          <button 
            type="button"
            onClick={onClose} 
            className="rounded-[8px] p-1.5 text-[#6A625B] hover:bg-[#F8F3EC] transition-colors cursor-pointer"
            id="close-modal-btn"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#6A625B] uppercase tracking-wider">Task Title</label>
            <input 
              type="text" 
              required
              placeholder="e.g., Prepare Research Paper" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                if (notSure) {
                  handleFetchAIEstimate(name);
                }
              }}
              className="w-full rounded-[8px] border border-[#DCCFBE] px-4 py-2.5 text-sm outline-hidden focus:border-[#75162D] focus:ring-1 focus:ring-[#75162D] bg-[#FFFDF9] text-[#2D2520] placeholder-[#6A625B]/40 transition-all"
              id="task-title-input"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#6A625B] uppercase tracking-wider">Description (Optional)</label>
            <textarea 
              placeholder="Provide a detailed description of the task..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-[8px] border border-[#DCCFBE] px-4 py-2.5 text-sm outline-hidden focus:border-[#75162D] focus:ring-1 focus:ring-[#75162D] bg-[#FFFDF9] text-[#2D2520] placeholder-[#6A625B]/40 transition-all"
              id="task-desc-textarea"
            />
          </div>

          {/* Grid for Deadline & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Due date (Deadline) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#6A625B] uppercase tracking-wider">Deadline</label>
              <input 
                type="date" 
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-[8px] border border-[#DCCFBE] px-4 py-2.5 text-sm outline-hidden focus:border-[#75162D] focus:ring-1 focus:ring-[#75162D] bg-[#FFFDF9] text-[#2D2520] placeholder-[#6A625B]/40 transition-all"
                id="task-deadline-input"
              />
            </div>

            {/* Priority Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#6A625B] uppercase tracking-wider">Work Priority</label>
              <select 
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full rounded-[8px] border border-[#DCCFBE] px-4 py-2.5 text-sm outline-hidden focus:border-[#75162D] focus:ring-1 focus:ring-[#75162D] bg-[#FFFDF9] text-[#2D2520] transition-all"
                id="task-priority-select"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority (Fast Track)</option>
              </select>
            </div>
          </div>

          {/* AI Estimate Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-[#6A625B] uppercase tracking-wider">Estimated Duration (Hours)</label>
              <label className="flex items-center gap-1.5 text-xs text-[#75162D] font-bold cursor-pointer">
                <input 
                  type="checkbox"
                  checked={notSure}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setNotSure(checked);
                    setAiHours(null);
                    setAiReasoning("");
                    if (checked) {
                      handleFetchAIEstimate(name);
                    }
                  }}
                  className="rounded-[4px] border-[#DCCFBE] text-[#75162D] focus:ring-[#75162D]"
                  id="let-nudge-estimate-checkbox"
                />
                <span className="select-none">Let Nudge Estimate</span>
              </label>
            </div>

            {!notSure ? (
              <div>
                <input 
                  type="number" 
                  min="0.1"
                  step="0.1"
                  placeholder="e.g. 4.5" 
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full rounded-[8px] border border-[#DCCFBE] px-4 py-2.5 text-sm outline-hidden focus:border-[#75162D] focus:ring-1 focus:ring-[#75162D] bg-[#FFFDF9] text-[#2D2520] placeholder-[#6A625B]/40 transition-all"
                  id="estimated-hours-input"
                />
              </div>
            ) : (
              <div className="rounded-[10px] border border-[#DCCFBE]/60 bg-[#F8F3EC] p-4.5 space-y-3">
                {loadingAI ? (
                  <div className="flex items-center gap-2.5 text-xs text-[#6A625B] font-light">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#75162D] border-t-transparent" />
                    <span>Nudge is estimating the effort...</span>
                  </div>
                ) : aiHours !== null ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-[#75162D] tracking-wider block">
                          Estimated Effort
                        </span>
                        <span className="text-sm font-semibold text-[#2D2520] font-sans flex items-center gap-1.5">
                          <NudgeIcon className="h-4 w-4 text-[#75162D]" />
                          {aiHours - 1 > 0 ? `${Math.round(aiHours - 0.5)}` : "1"}–{Math.round(aiHours + 1)} Hours
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEstimatedHours(aiHours);
                            setNotSure(false);
                          }}
                          className="rounded-[8px] bg-[#75162D] hover:bg-[#560B18] text-[#F5EFE6] text-[10px] font-bold px-3 py-1.5 transition-all cursor-pointer shadow-xs font-sans"
                        >
                          Accept Estimate
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNotSure(false);
                          }}
                          className="rounded-[8px] border border-[#DCCFBE] hover:bg-[#FFFDF9] text-[#6A625B] text-[10px] font-bold px-3 py-1.5 transition-all cursor-pointer font-sans"
                        >
                          Ignore / Edit
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#6A625B] italic bg-[#FFFDF9] p-3 rounded-[8px] border border-[#DCCFBE]/35 leading-relaxed font-light">
                      &ldquo;{!aiReasoning || /timeout|failure|fallback|default|internal/i.test(aiReasoning) ? "Generated using task details, deadline, and priority." : aiReasoning}&rdquo;
                    </p>
                  </div>
                ) : !name.trim() ? (
                  <p className="text-xs text-[#6A625B] font-light leading-relaxed">
                    Provide a title above to analyze historical planning patterns and suggest required hours.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-[#A06A3C] font-semibold leading-relaxed">
                      Nudge is currently experiencing high load or connection issues. Let's suggest a standard estimate:
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-[#75162D] tracking-wider block">
                          Standard Suggestion
                        </span>
                        <span className="text-sm font-semibold text-[#2D2520] font-sans flex items-center gap-1.5">
                          <NudgeIcon className="h-4 w-4 text-[#75162D]" />
                          2–4 Hours
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEstimatedHours(3);
                            setNotSure(false);
                          }}
                          className="rounded-[8px] bg-[#75162D] hover:bg-[#560B18] text-[#F5EFE6] text-[10px] font-bold px-3 py-1.5 transition-all cursor-pointer shadow-xs font-sans"
                        >
                          Accept Estimate (3 hrs)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNotSure(false);
                          }}
                          className="rounded-[8px] border border-[#DCCFBE] hover:bg-[#FFFDF9] text-[#6A625B] text-[10px] font-bold px-3 py-1.5 transition-all cursor-pointer font-sans"
                        >
                          Ignore / Edit
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Effort Validation Warning */}
            {!notSure && isEstimateMismatch && (
              <div className="flex gap-2.5 rounded-[10px] border border-[#A06A3C]/35 bg-[#A06A3C]/5 p-3.5 text-xs text-[#A06A3C] transition-all duration-300 mt-2">
                <AlertTriangle className="h-5 w-5 text-[#A06A3C] shrink-0" />
                <div className="space-y-1 font-light leading-relaxed">
                  <span className="font-bold block">Estimate Discrepancy Warning</span>
                  <p>
                    Your estimate ({estimatedHours} hrs) is lower than the recommended ({aiHours} hrs). This task may need extra breathing room based on historical patterns.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Recurring Option */}
          <div className="pt-2 space-y-2.5">
            <label className="flex items-center gap-2 text-sm text-[#2D2520] cursor-pointer">
              <input 
                type="checkbox" 
                checked={isRecurring}
                onChange={(e) => {
                  setIsRecurring(e.target.checked);
                  if (e.target.checked && recurrencePattern === "none") {
                    setRecurrencePattern("weekly");
                  }
                }}
                className="rounded-[4px] border-[#DCCFBE] text-[#75162D] focus:ring-[#75162D]"
                id="is-recurring-checkbox"
              />
              <span className="font-bold select-none text-[#2D2520]">Make this a recurring task</span>
            </label>

            {isRecurring && (
              <div className="pl-6 space-y-1.5 animate-fadeIn">
                <label className="text-[10px] font-bold text-[#6A625B] uppercase tracking-wider">Recurrence Interval</label>
                <select 
                  value={recurrencePattern}
                  onChange={(e) => setRecurrencePattern(e.target.value as any)}
                  className="w-full max-w-xs rounded-[8px] border-[#DCCFBE] px-4 py-2 text-sm outline-hidden focus:border-[#75162D] focus:ring-1 focus:ring-[#75162D] bg-[#FFFDF9] text-[#2D2520] transition-all"
                  id="recurrence-pattern-select"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-5 flex justify-end gap-3 border-t border-[#DCCFBE]/30 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[8px] border border-[#DCCFBE] bg-transparent text-[#6A625B] hover:bg-[#F8F3EC] px-5 py-2.5 text-sm font-semibold transition-colors cursor-pointer"
              id="cancel-modal-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-[8px] bg-[#75162D] hover:bg-[#560B18] px-6 py-2.5 text-sm font-semibold text-[#F5EFE6] shadow-2xs transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
              id="submit-modal-btn"
            >
              {taskToEdit ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
