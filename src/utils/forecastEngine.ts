import { Task, WorkloadDay, ForecastSummary, RecommendedAction, NotificationItem } from "../types.js";

/**
 * Calculates remaining days between two dates
 */
export function getDaysRemaining(deadlineStr: string, todayStr: string): number {
  const deadline = new Date(deadlineStr);
  const today = new Date(todayStr);
  
  // Set times to midnight to calculate pure day difference
  deadline.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const diffTime = deadline.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculates deadline risk for a single task based on remaining effort, priority, and days left
 */
export function calculateTaskRisk(task: Task, todayStr: string): { riskLevel: 'Low' | 'Medium' | 'High'; riskReason: string } {
  if (task.completed) {
    return { riskLevel: "Low", riskReason: "Task is completed." };
  }

  const daysLeft = getDaysRemaining(task.deadline, todayStr);
  const totalSubtasks = task.subtasks.length;
  const completedSubtasks = task.subtasks.filter(s => s.completed).length;
  
  // Estimate remaining hours based on incomplete subtasks or overall estimate
  let remainingHours = task.estimatedHours || 3;
  if (totalSubtasks > 0) {
    const incompleteRatio = (totalSubtasks - completedSubtasks) / totalSubtasks;
    remainingHours = remainingHours * incompleteRatio;
  }

  if (daysLeft < 0) {
    return { 
      riskLevel: "High", 
      riskReason: `Overdue by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''}.` 
    };
  }

  if (daysLeft === 0) {
    return {
      riskLevel: "High",
      riskReason: "Due today! High focus required immediately."
    };
  }

  // Calculate required work speed: hours of work needed per remaining day
  const hoursPerDayNeeded = remainingHours / daysLeft;

  // Adjust threshold based on task priority
  let priorityMultiplier = 1.0;
  if (task.priority === "high") priorityMultiplier = 1.5;
  if (task.priority === "low") priorityMultiplier = 0.6;

  const riskScore = hoursPerDayNeeded * priorityMultiplier;

  if (riskScore > 2.5 || daysLeft <= 1 && task.priority === 'high') {
    return {
      riskLevel: "High",
      riskReason: `Large remaining effort (${remainingHours.toFixed(1)} hrs) with only ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left.`
    };
  } else if (riskScore > 1.0 || daysLeft <= 2) {
    return {
      riskLevel: "Medium",
      riskReason: `Moderate effort (${remainingHours.toFixed(1)} hrs) spread over ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`
    };
  } else {
    return {
      riskLevel: "Low",
      riskReason: "On track. Ample time remains to complete this task."
    };
  }
}

/**
 * Generates a 5-day workload forecast starting from today
 */
export function generateWorkloadForecast(tasks: Task[], todayStr: string): { days: WorkloadDay[]; summary: ForecastSummary } {
  const days: WorkloadDay[] = [];
  const activeTasks = tasks.filter(t => !t.completed);
  const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Populate 5 upcoming days starting from today
  const todayDate = new Date(todayStr);
  for (let i = 0; i < 5; i++) {
    const currentDate = new Date(todayDate);
    currentDate.setDate(todayDate.getDate() + i);
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayName = weekdayNames[currentDate.getDay()];

    days.push({
      dayName: i === 0 ? "Today" : dayName,
      date: dateStr,
      status: "Low",
      estimatedHours: 0,
      taskCount: 0
    });
  }

  // Distribute estimated remaining effort of active tasks linearly across the days leading up to their deadlines
  activeTasks.forEach(task => {
    const daysLeft = getDaysRemaining(task.deadline, todayStr);
    const totalSubtasks = task.subtasks.length;
    const completedSubtasks = task.subtasks.filter(s => s.completed).length;
    
    let remainingHours = task.estimatedHours || 3;
    if (totalSubtasks > 0) {
      remainingHours = remainingHours * ((totalSubtasks - completedSubtasks) / totalSubtasks);
    }

    if (daysLeft <= 0) {
      // If overdue or due today, place all effort on "Today"
      days[0].estimatedHours += remainingHours;
      days[0].taskCount += 1;
    } else {
      // Distribute work over the days between today (index 0) and the deadline
      const span = Math.min(daysLeft + 1, 5); // caps window at 5 days forecast
      const dailyContribution = remainingHours / span;

      for (let j = 0; j < span; j++) {
        days[j].estimatedHours += dailyContribution;
        days[j].taskCount += 1;
      }
    }
  });

  // Determine workload status for each day
  days.forEach(day => {
    if (day.estimatedHours > 5.0) {
      day.status = "High";
    } else if (day.estimatedHours > 2.0) {
      day.status = "Moderate";
    } else {
      day.status = "Low";
    }
  });

  // Calculate completion probability
  // Based on the proportion of High Risk active tasks, overdue status, and total workload
  let highRiskCount = 0;
  let totalActive = activeTasks.length;

  activeTasks.forEach(t => {
    const risk = calculateTaskRisk(t, todayStr);
    if (risk.riskLevel === "High") highRiskCount++;
  });

  let probability = 100;
  if (totalActive > 0) {
    const riskPenalty = (highRiskCount / totalActive) * 40; // up to 40% penalty
    const workloadPenalty = Math.min(days[0].estimatedHours / 8.0, 1.0) * 20; // up to 20% penalty
    probability = Math.max(20, Math.round(100 - riskPenalty - workloadPenalty));
  }

  // Find Peak Workload Day
  let peakDay = "None";
  let maxHours = -1;
  days.forEach(d => {
    if (d.estimatedHours > maxHours && d.estimatedHours > 1) {
      maxHours = d.estimatedHours;
      peakDay = d.dayName;
    }
  });

  // Determine Overall Risk level
  let overallRisk: 'Low' | 'Medium' | 'High' = "Low";
  if (highRiskCount > 0 || days[0].status === "High") {
    overallRisk = "High";
  } else if (activeTasks.some(t => calculateTaskRisk(t, todayStr).riskLevel === "Medium") || days[0].status === "Moderate") {
    overallRisk = "Medium";
  }

  const summary: ForecastSummary = {
    todayStatus: days[0].status,
    upcomingPeak: peakDay === "Today" ? "Today" : peakDay,
    completionProbability: probability,
    riskLevel: overallRisk
  };

  return { days, summary };
}

/**
 * Recommends the single most impactful action based on deadlines and risk reductions
 */
export function getRecommendedNextAction(tasks: Task[], todayStr: string): RecommendedAction | null {
  const activeTasks = tasks.filter(t => !t.completed);
  if (activeTasks.length === 0) return null;

  // Sort tasks by risk first (High > Medium > Low) and then priority and days remaining
  const scoredTasks = activeTasks.map(task => {
    const risk = calculateTaskRisk(task, todayStr);
    const daysLeft = getDaysRemaining(task.deadline, todayStr);
    
    let priorityScore = 1;
    if (task.priority === "high") priorityScore = 3;
    if (task.priority === "medium") priorityScore = 2;

    let riskScore = 1;
    if (risk.riskLevel === "High") riskScore = 3;
    if (risk.riskLevel === "Medium") riskScore = 2;

    // Highest score means highest priority for next action
    const urgencyScore = (riskScore * 5) + (priorityScore * 2) - (daysLeft * 0.5);

    return { task, risk, daysLeft, urgencyScore };
  });

  scoredTasks.sort((a, b) => b.urgencyScore - a.urgencyScore);
  const bestTarget = scoredTasks[0];
  const targetTask = bestTarget.task;

  // Suggest working on the first incomplete subtask, or the main task itself
  const incompleteSubtask = targetTask.subtasks.find(s => !s.completed);
  let actionText = "";
  if (incompleteSubtask) {
    actionText = `Spend 45 minutes working on "${incompleteSubtask.name}" inside "${targetTask.name}".`;
  } else {
    actionText = `Dedicate 1 hour to focus on completing "${targetTask.name}".`;
  }

  // Expected risk reduction is higher if it's a high risk task
  let riskReduction = 20;
  if (bestTarget.risk.riskLevel === "High") {
    riskReduction = 35;
  } else if (bestTarget.risk.riskLevel === "Medium") {
    riskReduction = 15;
  }

  return {
    taskId: targetTask.id,
    taskName: targetTask.name,
    actionText: actionText,
    estimatedHours: targetTask.estimatedHours || 3,
    expectedRiskReduction: riskReduction
  };
}

/**
 * Generates actionable in-app notification alerts
 */
export function generateSmartNotifications(tasks: Task[], forecastSummary: ForecastSummary, todayStr: string): NotificationItem[] {
  const notifications: NotificationItem[] = [];
  const activeTasks = tasks.filter(t => !t.completed);

  if (activeTasks.length === 0) {
    notifications.push({
      id: "all_clear",
      text: "You have no active tasks. Perfect time to plan ahead and stay stress-free!",
      timestamp: new Date().toISOString(),
      type: "success",
      read: false
    });
    return notifications;
  }

  // 1. Completion probability alert
  if (forecastSummary.completionProbability < 70) {
    notifications.push({
      id: "prob_risk",
      text: `Completing 45 minutes of focused work today reduces your deadline risk by ${Math.round(100 - forecastSummary.completionProbability)}%.`,
      timestamp: new Date().toISOString(),
      type: "warning",
      read: false
    });
  }

  // 2. High risk task specific warning
  const highRiskTasks = activeTasks.filter(t => calculateTaskRisk(t, todayStr).riskLevel === "High");
  if (highRiskTasks.length > 0) {
    notifications.push({
      id: "high_risk_tasks_alert",
      text: `Alert: "${highRiskTasks[0].name}" has a High deadline risk due to upcoming peak workload. Consider decomposing or rescheduling other tasks.`,
      timestamp: new Date().toISOString(),
      type: "warning",
      read: false
    });
  }

  // 3. Peak workload nudge
  if (forecastSummary.upcomingPeak !== "None") {
    notifications.push({
      id: "peak_workload",
      text: `Your upcoming peak workload is predicted on ${forecastSummary.upcomingPeak}. Complete a task today to flatten the curve!`,
      timestamp: new Date().toISOString(),
      type: "info",
      read: false
    });
  }

  return notifications;
}
