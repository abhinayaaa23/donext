import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { 
  User, 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "../firebase.js";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  onSnapshot, 
  orderBy 
} from "firebase/firestore";
import { Task, WorkloadDay, ForecastSummary, RecommendedAction, NotificationItem, ChatMessage, SubTask, FocusEvent } from "../types.js";
import { calculateTaskRisk, generateWorkloadForecast, getRecommendedNextAction, generateSmartNotifications } from "../utils/forecastEngine.js";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function sanitizeForFirestore<T>(data: T, path: string = ""): T {
  if (data === undefined) {
    console.warn(`[Firestore Sanitizer] WARNING: Found undefined value at path: "${path}". Converting to null.`);
    return null as any;
  }
  if (data === null) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data.map((item, index) => sanitizeForFirestore(item, `${path}[${index}]`)) as any;
  }
  if (typeof data === "object") {
    if (data.constructor && data.constructor.name !== "Object") {
      return data;
    }
    const clean: any = {};
    for (const key of Object.keys(data)) {
      const val = (data as any)[key];
      if (val === undefined) {
        console.warn(`[Firestore Sanitizer] WARNING: Found undefined property at path: "${path ? path + "." + key : key}". Omitting from payload.`);
      } else {
        clean[key] = sanitizeForFirestore(val, path ? `${path}.${key}` : key);
      }
    }
    return clean;
  }
  return data;
}

interface AppContextType {
  user: User | null;
  loadingAuth: boolean;
  tasks: Task[];
  loadingTasks: boolean;
  forecastDays: WorkloadDay[];
  forecastSummary: ForecastSummary;
  recommendedAction: RecommendedAction | null;
  notifications: NotificationItem[];
  chatMessages: ChatMessage[];
  loadingChat: boolean;
  
  // Auth Functions
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  
  // Task Functions
  addTask: (taskData: Omit<Task, 'id' | 'userId' | 'createdAt' | 'subtasks' | 'riskLevel' | 'riskReason'>) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  decomposeWithAI: (taskId: string) => Promise<void>;
  getAIEstimate: (title: string, description: string) => Promise<{ estimateHours: number; reasoning: string } | null>;
  
  // Chat Functions
  sendNudgeMessage: (text: string) => Promise<void>;
  clearChat: () => void;
  
  // Notification Functions
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;

  // Focus Events
  focusEvents: FocusEvent[];
  addFocusEvent: (event: Omit<FocusEvent, 'id' | 'userId' | 'timestamp'>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// A helper to format dates in UTC or relative to today's local time (e.g., 2026-06-27)
const TODAY_STR = "2026-06-27";

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "nudge_welcome",
      role: "model",
      text: "Hi! I'm Nudge, your intelligent scheduling assistant. I can help you forecast workload peaks, decompose heavy tasks, or adjust deadlines. What would you like to plan today?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // On mount, make sure dark class is removed (as we are strictly premium light theme)
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  // 1. Manage user session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoadingAuth(false);
      if (!firebaseUser) {
        // Load default mock tasks for guest/offline view
        setTasks(getDefaultMockTasks());
        setLoadingTasks(false);
      } else {
        // Clear tasks immediately so brand-new/authenticated users start clean and loading state is correct
        setTasks([]);
        setLoadingTasks(true);
      }
    });
    return unsubscribe;
  }, []);

  // 2. Fetch/Sync user tasks from Firestore in real-time
  useEffect(() => {
    if (!user) return;
    setLoadingTasks(true);

    const tasksRef = collection(db, "tasks");
    const q = query(tasksRef, where("userId", "==", user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTasks: Task[] = [];
      snapshot.forEach((doc) => {
        fetchedTasks.push(doc.data() as Task);
      });
      
      // Sort by deadline, completed state, priority
      fetchedTasks.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
      setTasks(fetchedTasks);
      setLoadingTasks(false);
    }, (error) => {
      console.error("Error syncing tasks:", error);
      handleFirestoreError(error, OperationType.LIST, "tasks");
    });

    return unsubscribe;
  }, [user]);

  // Focus tracking state and effects
  const [focusEvents, setFocusEvents] = useState<FocusEvent[]>([]);

  // Load focus events from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("nudge_focus_events");
    if (saved) {
      try {
        setFocusEvents(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing saved focus events:", e);
      }
    }
  }, []);

  // Sync focus events with Firestore when user is logged in
  useEffect(() => {
    if (!user) return;
    
    const eventsRef = collection(db, "focus_events");
    const q = query(eventsRef, where("userId", "==", user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEvents: FocusEvent[] = [];
      snapshot.forEach((doc) => {
        fetchedEvents.push(doc.data() as FocusEvent);
      });
      if (fetchedEvents.length > 0) {
        fetchedEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setFocusEvents(fetchedEvents);
        localStorage.setItem("nudge_focus_events", JSON.stringify(fetchedEvents));
      }
    }, (error) => {
      console.error("Error syncing focus events:", error);
    });

    return unsubscribe;
  }, [user]);

  const addFocusEvent = async (eventData: Omit<FocusEvent, 'id' | 'userId' | 'timestamp'>) => {
    const id = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userId = user ? user.uid : "guest";
    const timestamp = new Date().toISOString();
    
    const newEvent: FocusEvent = {
      ...eventData,
      id,
      userId,
      timestamp
    };

    const updated = [...focusEvents, newEvent];
    setFocusEvents(updated);
    localStorage.setItem("nudge_focus_events", JSON.stringify(updated));

    if (user) {
      try {
        const cleanedEvent = sanitizeForFirestore(newEvent, `focus_events/${id}`);
        await setDoc(doc(db, "focus_events", id), cleanedEvent);
      } catch (err) {
        console.error("Error writing focus event to firestore:", err);
      }
    }
  };

  // 3. Dynamic Workload Calculations & Analytics (Engine Sync)
  const [forecastDays, setForecastDays] = useState<WorkloadDay[]>([]);
  const [forecastSummary, setForecastSummary] = useState<ForecastSummary>({
    todayStatus: "Low",
    upcomingPeak: "None",
    completionProbability: 100,
    riskLevel: "Low"
  });
  const [recommendedAction, setRecommendedAction] = useState<RecommendedAction | null>(null);

  useEffect(() => {
    const { days, summary } = generateWorkloadForecast(tasks, TODAY_STR);
    setForecastDays(days);
    setForecastSummary(summary);
    
    const action = getRecommendedNextAction(tasks, TODAY_STR);
    setRecommendedAction(action);

    const smartNotifications = generateSmartNotifications(tasks, summary, TODAY_STR);
    setNotifications(smartNotifications);
  }, [tasks]);

  // Auth Functions
  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Google Sign-In Error:", err);
      throw err;
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("Email Login Error:", err);
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Create user profile document in users collection
      const userRef = doc(db, "users", userCredential.user.uid);
      try {
        const cleanedUserData = sanitizeForFirestore({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: displayName,
          createdAt: new Date().toISOString()
        }, `users/${userCredential.user.uid}`);
        await setDoc(userRef, cleanedUserData);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${userCredential.user.uid}`);
      }
    } catch (err) {
      console.error("Email Signup Error:", err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setTasks(getDefaultMockTasks());
    } catch (err) {
      console.error("Logout Error:", err);
    }
  };

  // Task Functions
  const addTask = async (taskData: Omit<Task, 'id' | 'userId' | 'createdAt' | 'subtasks' | 'riskLevel' | 'riskReason'>) => {
    const taskId = `task_${Date.now()}`;
    const userId = user ? user.uid : "guest";
    
    const newTask: Task = {
      ...taskData,
      id: taskId,
      userId,
      createdAt: new Date().toISOString(),
      subtasks: [],
      riskLevel: "Low",
      riskReason: "Assessment pending..."
    };

    // Calculate initial risk
    const risk = calculateTaskRisk(newTask, TODAY_STR);
    newTask.riskLevel = risk.riskLevel;
    newTask.riskReason = risk.riskReason;

    // Optimistically update local tasks immediately
    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);

    if (user) {
      try {
        const cleanedTask = sanitizeForFirestore(newTask, `tasks/${taskId}`);
        await setDoc(doc(db, "tasks", taskId), cleanedTask);
      } catch (err) {
        console.error("Error saving task to Firestore:", err);
        handleFirestoreError(err, OperationType.WRITE, `tasks/${taskId}`);
      }
    }

    // Automatically generate subtask plan on creation
    setTimeout(() => {
      decomposeWithAI(taskId);
    }, 200);
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        const merged = { ...t, ...updates };
        // Re-evaluate risk dynamically if deadline or priority or subtasks changed
        if (updates.deadline !== undefined || updates.priority !== undefined || updates.subtasks !== undefined) {
          const risk = calculateTaskRisk(merged, TODAY_STR);
          merged.riskLevel = risk.riskLevel;
          merged.riskReason = risk.riskReason;
        }
        return merged;
      }
      return t;
    });

    setTasks(updatedTasks);

    if (user) {
      try {
        const taskRef = doc(db, "tasks", taskId);
        const currentTask = updatedTasks.find(t => t.id === taskId);
        if (currentTask) {
          const cleanedTask = sanitizeForFirestore(currentTask, `tasks/${taskId}`);
          await setDoc(taskRef, cleanedTask, { merge: true });
        }
      } catch (err) {
        console.error("Error updating task in Firestore:", err);
        handleFirestoreError(err, OperationType.WRITE, `tasks/${taskId}`);
      }
    }
  };

  const deleteTask = async (taskId: string) => {
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    setTasks(updatedTasks);

    if (user) {
      try {
        await deleteDoc(doc(db, "tasks", taskId));
      } catch (err) {
        console.error("Error deleting task from Firestore:", err);
        handleFirestoreError(err, OperationType.DELETE, `tasks/${taskId}`);
      }
    }
  };

  const toggleSubtask = async (taskId: string, subtaskId: string) => {
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

    const updatedSubtasks = taskToUpdate.subtasks.map(s => 
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );

    await updateTask(taskId, { subtasks: updatedSubtasks });
  };

  // AI Integration Tasks
  const decomposeWithAI = async (taskId: string) => {
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;

    try {
      const response = await fetch("/api/decompose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: targetTask.name, 
          description: targetTask.description,
          estimatedHours: targetTask.estimatedHours
        }),
      });
      const data = await response.json();
      if (data.subtasks && Array.isArray(data.subtasks)) {
        const subtasksWithIds: SubTask[] = data.subtasks.map((item: any, index: number) => {
          if (typeof item === "string") {
            return {
              id: `sub_${Date.now()}_${index}`,
              name: item,
              completed: false
            };
          } else {
            return {
              id: `sub_${Date.now()}_${index}`,
              name: item.name,
              completed: false,
              group: item.group || undefined,
              duration: item.duration || undefined
            };
          }
        });
        await updateTask(taskId, { subtasks: subtasksWithIds });
        
        // Push notification of success
        setNotifications(prev => [
          {
            id: `ai_decompose_${Date.now()}`,
            text: `Successfully decomposed "${targetTask.name}" into ${subtasksWithIds.length} subtasks with structured groups via Gemini AI.`,
            timestamp: new Date().toISOString(),
            type: "success",
            read: false
          },
          ...prev
        ]);
      }
    } catch (err) {
      console.error("Failed to decompose task via AI:", err);
    }
  };

  const getAIEstimate = async (title: string, description: string) => {
    try {
      const response = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      const data = await response.json();
      if (typeof data.estimateHours === "number") {
        return {
          estimateHours: data.estimateHours,
          reasoning: data.reasoning || "Estimated based on average task complexity."
        };
      }
    } catch (err) {
      console.error("Failed to get AI effort estimate:", err);
    }
    return null;
  };

  // Nudge Chat integration
  const sendNudgeMessage = async (text: string) => {
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      text,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setLoadingChat(true);

    try {
      // Map history to server schema
      const history = chatMessages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const context = {
        tasks: tasks.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          deadline: t.deadline,
          priority: t.priority,
          estimatedHours: t.estimatedHours,
          completed: t.completed,
          subtasks: t.subtasks,
          riskLevel: t.riskLevel
        })),
        forecastSummary
      };

      const response = await fetch("/api/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, context, history }),
      });
      const data = await response.json();

      if (data.response) {
        const modelMessage: ChatMessage = {
          id: `model_${Date.now()}`,
          role: "model",
          text: data.response,
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, modelMessage]);
      }
    } catch (err) {
      console.error("Error communicating with Nudge:", err);
      // Fallback response
      const fallbackMsg: ChatMessage = {
        id: `model_${Date.now()}`,
        role: "model",
        text: "I experienced a minor network interruption. Can you repeat that, or should we talk about redistributing your workload?",
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setLoadingChat(false);
    }
  };

  const clearChat = () => {
    setChatMessages([
      {
        id: "nudge_welcome",
        role: "model",
        text: "Hi! I'm Nudge, your intelligent scheduling assistant. Ask me anything about your current workload or forecasts!",
        timestamp: new Date().toISOString()
      }
    ]);
  };

  // Notifications Functions
  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return (
    <AppContext.Provider value={{
      user,
      loadingAuth,
      tasks,
      loadingTasks,
      forecastDays,
      forecastSummary,
      recommendedAction,
      notifications,
      chatMessages,
      loadingChat,
      
      loginWithGoogle,
      loginWithEmail,
      signUpWithEmail,
      logout,
      
      addTask,
      updateTask,
      deleteTask,
      toggleSubtask,
      decomposeWithAI,
      getAIEstimate,
      
      sendNudgeMessage,
      clearChat,
      
      markNotificationRead,
      clearAllNotifications,
      
      focusEvents,
      addFocusEvent
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
};

// Default Tasks generator to feed mock experience
function getDefaultMockTasks(userId = "guest"): Task[] {
  // Disable demo data in production mode or for any authenticated user
  const isProduction = 
    (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') || 
    (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.PROD);

  if (isProduction || userId !== "guest") {
    return [];
  }

  return [
    {
      id: "task_mock_1",
      userId,
      name: "ML Assignment",
      description: "Neural network model training and report draft",
      deadline: "2026-06-29", // 2 days from June 27
      priority: "high",
      estimatedHours: 8,
      completed: false,
      createdAt: new Date().toISOString(),
      isRecurring: false,
      recurrencePattern: "none",
      subtasks: [
        { id: "s1", name: "Data preprocessing & loading", completed: true },
        { id: "s2", name: "Implement loss functions & layers", completed: false },
        { id: "s3", name: "Run hyperparameter sweep", completed: false },
        { id: "s4", name: "Draft evaluation charts", completed: false }
      ],
      riskLevel: "High",
      riskReason: "Large remaining effort (6.0 hrs) with limited remaining time (2 days)."
    },
    {
      id: "task_mock_2",
      userId,
      name: "Literature Review",
      description: "Prepare research literature references draft",
      deadline: "2026-07-01", // 4 days from June 27
      priority: "medium",
      estimatedHours: 4,
      completed: false,
      createdAt: new Date().toISOString(),
      isRecurring: false,
      recurrencePattern: "none",
      subtasks: [
        { id: "s5", name: "Search Google Scholar for 5 main papers", completed: true },
        { id: "s6", name: "Synthesize paper methodologies", completed: false }
      ],
      riskLevel: "Medium",
      riskReason: "Moderate effort spread over 4 days."
    },
    {
      id: "task_mock_3",
      userId,
      name: "Weekly Project Sync",
      description: "Prepare slides and key updates for team",
      deadline: "2026-06-28", // Tomorrow
      priority: "low",
      estimatedHours: 1.5,
      completed: false,
      createdAt: new Date().toISOString(),
      isRecurring: true,
      recurrencePattern: "weekly",
      subtasks: [],
      riskLevel: "Low",
      riskReason: "On track. Short estimated task duration."
    }
  ];
}
