import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined. Gemini features will run in mock mode.");
      return null;
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

/**
 * Decomposes a task into actionable, grouped subtasks with estimated durations in minutes.
 * The number of subtasks is adjusted based on estimated hours (complexity).
 */
export async function decomposeTask(title: string, description: string, estimatedHours?: number): Promise<Array<{ name: string; group?: string; duration?: number }>> {
  const ai = getAI();
  if (!ai) {
    // Return high-quality mock subtasks with groups and durations
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes("ml") || titleLower.includes("assignment") || titleLower.includes("programming") || titleLower.includes("code")) {
      return [
        { group: "Data Preparation", name: "Preprocess dataset", duration: 20 },
        { group: "Data Preparation", name: "Split train/validation/test sets", duration: 10 },
        { group: "Data Preparation", name: "Verify labels and data quality", duration: 15 },
        { group: "Model Building", name: "Set up baseline neural network architecture", duration: 30 },
        { group: "Model Building", name: "Train baseline model & record results", duration: 45 },
        { group: "Model Building", name: "Implement deep learning improvements", duration: 60 },
        { group: "Evaluation & Testing", name: "Generate loss & accuracy curves", duration: 20 },
        { group: "Evaluation & Testing", name: "Analyze prediction errors", duration: 30 },
        { group: "Evaluation & Testing", name: "Write evaluation and findings report", duration: 60 }
      ];
    } else if (titleLower.includes("literature") || titleLower.includes("review") || titleLower.includes("research") || titleLower.includes("paper")) {
      return [
        { group: "Research & Discovery", name: "Search Google Scholar for 5 main papers", duration: 30 },
        { group: "Research & Discovery", name: "Download and organize key PDFs", duration: 15 },
        { group: "Research & Discovery", name: "Read and highlight abstract/methodology", duration: 60 },
        { group: "Synthesis", name: "Create comparison matrix of methodologies", duration: 45 },
        { group: "Synthesis", name: "Draft summary of paper contributions", duration: 60 },
        { group: "Synthesis", name: "Identify key gaps in existing research", duration: 30 },
        { group: "Writing", name: "Draft introduction and background", duration: 40 },
        { group: "Writing", name: "Write synthesis of literature body", duration: 80 },
        { group: "Writing", name: "Format citations and references list", duration: 30 }
      ];
    } else {
      // Default fallback plan based on hours
      const hours = estimatedHours || 4;
      if (hours <= 3) {
        return [
          { group: "UI Foundation", name: "Sketch outline and interface mockups", duration: 30 },
          { group: "UI Foundation", name: "Develop HTML/React layout", duration: 45 },
          { group: "Dashboard", name: "Integrate status charts & tables", duration: 60 },
          { group: "Dashboard", name: "Verify responsiveness & test flows", duration: 30 }
        ];
      } else {
        return [
          { group: "UI Foundation", name: "Sketch layout and define color palette", duration: 35 },
          { group: "UI Foundation", name: "Build top navigation bar & dashboard container", duration: 40 },
          { group: "Dashboard", name: "Implement redesigned Do Next session card", duration: 50 },
          { group: "Dashboard", name: "Create expandable compact task cards", duration: 45 },
          { group: "Insights & Forecast", name: "Add workload forecast visualization", duration: 60 },
          { group: "Insights & Forecast", name: "Verify tooltip triggers & dark mode colors", duration: 45 }
        ];
      }
    }
  }

  try {
    let complexityLabel = "medium";
    let subtaskCountRange = "5 to 10";
    if (estimatedHours) {
      if (estimatedHours <= 3) {
        complexityLabel = "simple";
        subtaskCountRange = "3 to 5";
      } else if (estimatedHours > 8) {
        complexityLabel = "complex";
        subtaskCountRange = "10 to 18";
      }
    }

    const prompt = `Decompose the task titled "${title}" (Description: "${description || 'None'}", Estimated Hours: ${estimatedHours || 'not specified'}) into actionable subtasks.
Since this is a ${complexityLabel} task, please generate around ${subtaskCountRange} granular, chronological, and highly practical subtasks.

Each subtask should be grouped under an elegant, logical category (e.g. "UI Foundation", "Dashboard", "Synthesis", "Evaluation", etc.).
Each subtask must also have a granular estimated time "duration" in minutes (e.g. 15, 20, 30, 45, 60 minutes).
Ensure the sum of all subtask durations roughly aligns with the task's estimated hours (${estimatedHours ? estimatedHours * 60 : 'some reasonable total'} minutes).`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Detailed, actionable subtask name" },
              group: { type: Type.STRING, description: "Logical category/group for the subtask" },
              duration: { type: Type.INTEGER, description: "Time estimated for this subtask in minutes" }
            },
            required: ["name", "group", "duration"]
          },
          description: "List of decomposed grouped subtasks"
        }
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error in decomposeTask:", err);
  }

  // Final fallback
  return [
    { group: "Preparation", name: `Set up outline for ${title}`, duration: 30 },
    { group: "Execution", name: `Execute core steps for ${title}`, duration: 90 },
    { group: "Review", name: `Review progress and refine ${title}`, duration: 30 },
    { group: "Review", name: `Finalize and mark complete`, duration: 30 }
  ];
}

/**
 * Estimates effort in hours and provides reasoning using Gemini
 */
export async function estimateEffort(title: string, description: string): Promise<{ estimateHours: number; reasoning: string }> {
  const ai = getAI();
  if (!ai) {
    return {
      estimateHours: 4,
      reasoning: "Estimated based on average task complexity (mock estimation mode)."
    };
  }

  try {
    const prompt = `Analyze the task titled "${title}" (Description: "${description || 'None'}") and estimate the total realistic time in hours required for an average professional or student to complete it. Provide the estimate as a number and a 1-sentence reasoning.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            estimateHours: {
              type: Type.NUMBER,
              description: "Estimated total duration in hours (can be fractional, e.g. 1.5 or 8)"
            },
            reasoning: {
              type: Type.STRING,
              description: "A professional, concise 1-sentence explanation of how this estimate was determined."
            }
          },
          required: ["estimateHours", "reasoning"]
        }
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      if (typeof parsed.estimateHours === "number" && typeof parsed.reasoning === "string") {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error in estimateEffort:", err);
  }

  return {
    estimateHours: 3.5,
    reasoning: "Generated using task details, deadline, and priority."
  };
}

interface ChatContext {
  tasks: Array<{
    id: string;
    name: string;
    description: string;
    deadline: string;
    priority: 'low' | 'medium' | 'high';
    estimatedHours?: number;
    completed: boolean;
    subtasks?: Array<{ id: string; name: string; completed: boolean }>;
    riskLevel?: 'Low' | 'Medium' | 'High';
  }>;
  forecastSummary?: {
    todayStatus: string;
    upcomingPeak: string;
    completionProbability: number;
  };
}

/**
 * Nudge AI Conversational Assistant response generator
 */
export async function getNudgeResponse(message: string, context: ChatContext, chatHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>): Promise<string> {
  const ai = getAI();
  if (!ai) {
    return "Hi there! I am Nudge, your workload companion. Since the Gemini API key isn't configured, I'm running in offline mode. Let's make sure you hit your deadlines! What would you like to plan today?";
  }

  try {
    const activeTasks = context.tasks.filter(t => !t.completed);
    const completedTasksCount = context.tasks.filter(t => t.completed).length;

    const taskContextStr = activeTasks.map(t => {
      const subtaskStr = t.subtasks?.map(s => `  - [${s.completed ? 'x' : ' '}] ${s.name}`).join("\n") || "";
      return `- Task: "${t.name}"
  Description: ${t.description || 'None'}
  Deadline: ${t.deadline}
  Priority: ${t.priority}
  Estimate: ${t.estimatedHours || 'Unknown'} hrs
  Risk: ${t.riskLevel || 'Low'}
  Subtasks:
${subtaskStr}`;
    }).join("\n\n");

    const systemInstruction = `You are Nudge, a warm, supportive, and practical personal planning companion for students, researchers, freelancers, and professionals.
DoNext helps users understand their workload, avoid deadline surprises, and decide what to do next. Your role is to be an encouraging, friendly partner rather than a cold metric dashboard.
Always sound supportive, practical, and gentle. Avoid clinical machine learning jargon (e.g. say "We've added extra time to keep you on track" instead of "Your underestimate factor is 1.3x").

User's Profile & Context:
- Active Tasks: ${activeTasks.length}
- Completed Tasks: ${completedTasksCount}
- Forecast Status: ${context.forecastSummary?.todayStatus || 'Moderate'}
- Upcoming Peak Day: ${context.forecastSummary?.upcomingPeak || 'Wednesday'}
- Combined Completion Probability: ${context.forecastSummary?.completionProbability || 78}%

Current Task List:
${taskContextStr || 'No active tasks at the moment! Prompt the user to add some.'}

Specific Persona Examples to Mimic:
- If the user asks "What should I do next?", respond with a clear, actionable recommendation: identify the highest-impact or highest-risk task and suggest a realistic focus session (e.g., "The Literature Review has the biggest impact right now. Spending 45 minutes on it today will help a lot.").
- If the user says they cannot work today or are overwhelmed, respond with empathy: "That's okay. Let's adjust your plan and reduce the pressure later this week." Suggest shifting one or two lower-priority tasks.
- If the user asks about postponing a specific task, answer supportively: "Yes. If we move it to Thursday, your workload becomes slightly heavier later in the week, but it's still manageable." (or warn them gently if it creates a heavy workload overload on that day).

Be conversational, caring, and actionable. Keep responses under 3 short paragraphs. Use simple Markdown (bold, lists) for readability.`;

    // Construct the contents including the history and the current user message
    const formattedHistory = chatHistory.map(h => ({
      role: h.role === 'model' ? 'model' as const : 'user' as const,
      parts: [{ text: h.parts[0].text }]
    }));

    // Add the current message
    formattedHistory.push({
      role: 'user' as const,
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedHistory,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text || "I apologize, I didn't get that. How can I help you adjust your schedule?";
  } catch (err) {
    console.error("Error in getNudgeResponse:", err);
    return "I had a bit of trouble processing that. Can you tell me more about what you'd like to adjust?";
  }
}
