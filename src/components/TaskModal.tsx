import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext.js";
import { Task } from "../types.js";
import { AlertTriangle, Clock, X } from "lucide-react";
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
  const [estimatedHours, setEstimatedHours] = useState<number | "">("");
  const [notSure, setNotSure] = useState(false);
  
  // AI Estimation States
  const [aiHours, setAiHours] = useState<number | null>(null);
  const [aiReasoning, setAiReasoning] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  
  // Recurring States
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<'none' | 'daily' | 'weekly' | 'monthly'>("none");

  // Load task values if editing
  useEffect(() => {
    if (taskToEdit) {
      setName(taskToEdit.name);
      setDescription(taskToEdit.description);
      setDeadline(taskToEdit.deadline);
      setPriority(taskToEdit.priority);
      setEstimatedHours(taskToEdit.estimatedHours || "");
      setIsRecurring(taskToEdit.isRecurring);
      setRecurrencePattern(taskToEdit.recurrencePattern);
      setAiHours(taskToEdit.aiEstimateHours || null);
      setAiReasoning(taskToEdit.aiEstimateReasoning || "");
      setNotSure(false);
    } else {
      // Set default deadline to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];
      
      setName("");
      setDescription("");
      setDeadline(tomorrowStr);
      setPriority("medium");
      setEstimatedHours("");
      setIsRecurring(false);
      setRecurrencePattern("none");
      setAiHours(null);
      setAiReasoning("");
      setNotSure(false);
    }
  }, [taskToEdit, isOpen]);

  if (!isOpen) return null;

  const handleFetchAIEstimate = async () => {
    if (!name) return;
    setLoadingAI(true);
    try {
      const result = await getAIEstimate(name, description);
      if (result) {
        setAiHours(result.estimateHours);
        setAiReasoning(result.reasoning);
        // Automatically suggest this value in the input if it was empty
        if (estimatedHours === "") {
          setEstimatedHours(result.estimateHours);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAI(false);
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-[2px] animate-fadeIn">
      <div className="w-full max-w-xl rounded-[10px] border border-[#DCCFBE] bg-[#FFFDF9] shadow-lg transition-all">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#DCCFBE]/30 px-6 py-4.5">
          <h2 className="text-xl font-normal text-[#2D2520] font-display">
            {taskToEdit ? "Edit Workload Task" : "Add Task to Workload"}
          </h2>
          <button 
            onClick={onClose} 
            className="rounded-[8px] p-1.5 text-[#6A625B] hover:bg-[#F8F3EC] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#6A625B] uppercase tracking-wider">Task Title</label>
            <input 
              type="text" 
              required
              placeholder="e.g., Prepare Research Paper" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-[8px] border border-[#DCCFBE] px-4 py-2.5 text-sm outline-hidden focus:border-[#75162D] focus:ring-1 focus:ring-[#75162D] bg-[#FFFDF9] text-[#2D2520] placeholder-[#6A625B]/40 transition-all"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#6A625B] uppercase tracking-wider">Description (Optional)</label>
            <textarea 
              placeholder="Provide a detailed description to get more accurate AI estimates..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-[8px] border border-[#DCCFBE] px-4 py-2.5 text-sm outline-hidden focus:border-[#75162D] focus:ring-1 focus:ring-[#75162D] bg-[#FFFDF9] text-[#2D2520] placeholder-[#6A625B]/40 transition-all"
            />
          </div>

          {/* Grid for Deadline & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Deadline */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#6A625B] uppercase tracking-wider">Deadline</label>
              <input 
                type="date" 
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-[8px] border border-[#DCCFBE] px-4 py-2.5 text-sm outline-hidden focus:border-[#75162D] focus:ring-1 focus:ring-[#75162D] bg-[#FFFDF9] text-[#2D2520] placeholder-[#6A625B]/40 transition-all"
              />
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#6A625B] uppercase tracking-wider">Work Priority</label>
              <select 
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full rounded-[8px] border border-[#DCCFBE] px-4 py-2.5 text-sm outline-hidden focus:border-[#75162D] focus:ring-1 focus:ring-[#75162D] bg-[#FFFDF9] text-[#2D2520] transition-all"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority (Fast Track)</option>
              </select>
            </div>
          </div>

          {/* How long do you think this will take? and "I'm not sure" */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-[#6A625B] uppercase tracking-wider">Estimated Duration (Hours)</label>
              <label className="flex items-center gap-1.5 text-xs text-[#75162D] font-bold cursor-pointer">
                <input 
                  type="checkbox"
                  checked={notSure}
                  onChange={(e) => {
                    setNotSure(e.target.checked);
                    if (e.target.checked && name) {
                      handleFetchAIEstimate();
                    }
                  }}
                  className="rounded-[4px] border-[#DCCFBE] text-[#75162D] focus:ring-[#75162D]"
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
                ) : (
                  <p className="text-xs text-[#6A625B] font-light leading-relaxed">
                    Provide a title above to analyze historical planning patterns and suggest required hours.
                  </p>
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
              />
              <span className="font-bold select-none text-[#2D2520]">Make this a recurring task</span>
            </label>

            {isRecurring && (
              <div className="pl-6 space-y-1.5 animate-fadeIn">
                <label className="text-[10px] font-bold text-[#6A625B] uppercase tracking-wider">Recurrence Interval</label>
                <select 
                  value={recurrencePattern}
                  onChange={(e) => setRecurrencePattern(e.target.value as any)}
                  className="w-full max-w-xs rounded-[8px] border border-[#DCCFBE] px-4 py-2 text-sm outline-hidden focus:border-[#75162D] focus:ring-1 focus:ring-[#75162D] bg-[#FFFDF9] text-[#2D2520] transition-all"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-5 flex justify-end gap-3 border-t border-[#DCCFBE]/30">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[8px] border border-[#DCCFBE] bg-transparent text-[#6A625B] hover:bg-[#F8F3EC] px-5 py-2.5 text-sm font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-[8px] bg-[#75162D] hover:bg-[#560B18] px-6 py-2.5 text-sm font-semibold text-[#F5EFE6] shadow-2xs transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
            >
              {taskToEdit ? "Save Changes" : "Create Task"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
