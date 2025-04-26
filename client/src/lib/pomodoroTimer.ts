import { getStorageItem, setStorageItem } from './chromeStorage';
import { apiRequest } from './queryClient';

// Timer states
export type TimerState = 'idle' | 'running' | 'paused' | 'completed';
export type SessionType = 'work' | 'break' | 'long-break';

// Timer events
export type TimerEvent = 'start' | 'pause' | 'resume' | 'stop' | 'tick' | 'complete';

// Timer event listener
export type TimerEventListener = (event: TimerEvent, state: TimerInfo) => void;

// Timer info
export interface TimerInfo {
  state: TimerState;
  type: SessionType;
  duration: number;
  timeRemaining: number;
  sessionCount: number;
  sessionId: number | null;
}

class PomodoroTimer {
  private state: TimerState = 'idle';
  private sessionType: SessionType = 'work';
  private timeRemaining: number = 0; // in seconds
  private duration: number = 0; // in seconds
  private timerId: number | null = null;
  private sessionCount: number = 0;
  private sessionId: number | null = null;
  private listeners: TimerEventListener[] = [];
  private startTime: Date | null = null;

  constructor() {
    this.initialize();
  }

  // Initialize the timer state from storage
  private async initialize() {
    const currentSession = await getStorageItem('currentSession');
    if (currentSession && currentSession.isActive) {
      this.sessionType = currentSession.type;
      this.sessionId = currentSession.id;
      this.state = 'running';
      this.timeRemaining = currentSession.timeRemaining;
      
      if (this.timeRemaining > 0) {
        this.startTicking();
        this.emitEvent('resume');
      } else {
        this.completeSession();
      }
    } else {
      await this.reset();
    }
  }

  // Get the current timer info
  public getInfo(): TimerInfo {
    return {
      state: this.state,
      type: this.sessionType,
      duration: this.duration,
      timeRemaining: this.timeRemaining,
      sessionCount: this.sessionCount,
      sessionId: this.sessionId
    };
  }

  // Start a new session
  public async start(type?: SessionType): Promise<void> {
    if (this.state === 'running') {
      return;
    }

    // If type is provided, use it, otherwise use the current type
    if (type) {
      this.sessionType = type;
    }

    // Get the duration from settings
    const settings = await getStorageItem('settings');
    switch (this.sessionType) {
      case 'work':
        this.duration = settings.workDuration * 60;
        break;
      case 'break':
        this.duration = settings.breakDuration * 60;
        break;
      case 'long-break':
        this.duration = settings.longBreakDuration * 60;
        break;
    }

    this.timeRemaining = this.duration;
    this.state = 'running';
    this.startTime = new Date();
    
    // Start the session on the server
    const userId = await getStorageItem('userId');
    try {
      const response = await apiRequest('POST', '/api/sessions/start', {
        userId,
        type: this.sessionType
      });
      
      const data = await response.json();
      this.sessionId = data.id;
      
      // Start ticking
      this.startTicking();
      
      // Update storage
      await this.updateStorage();
      
      // Emit event
      this.emitEvent('start');
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  }

  // Pause the timer
  public async pause(): Promise<void> {
    if (this.state !== 'running') {
      return;
    }

    if (this.timerId) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }

    this.state = 'paused';
    await this.updateStorage();
    this.emitEvent('pause');
  }

  // Resume the timer
  public async resume(): Promise<void> {
    if (this.state !== 'paused') {
      return;
    }

    this.state = 'running';
    this.startTicking();
    await this.updateStorage();
    this.emitEvent('resume');
  }

  // Stop the timer
  public async stop(): Promise<void> {
    if (this.state === 'idle') {
      return;
    }

    if (this.timerId) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }

    // If a session is in progress, mark it as incomplete
    if (this.sessionId) {
      try {
        await apiRequest('POST', `/api/sessions/${this.sessionId}/complete`, {});
      } catch (error) {
        console.error('Failed to complete session:', error);
      }
    }

    await this.reset();
    this.emitEvent('stop');
  }

  // Reset the timer
  private async reset(): Promise<void> {
    this.state = 'idle';
    this.sessionType = 'work';
    this.timeRemaining = 0;
    this.duration = 0;
    this.sessionId = null;
    await this.updateStorage();
  }

  // Start the ticking
  private startTicking(): void {
    if (this.timerId) {
      window.clearInterval(this.timerId);
    }

    this.timerId = window.setInterval(() => {
      if (this.timeRemaining <= 0) {
        this.completeSession();
        return;
      }

      this.timeRemaining--;
      this.updateStorage();
      this.emitEvent('tick');
    }, 1000);
  }

  // Complete the current session
  private async completeSession(): Promise<void> {
    if (this.timerId) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }

    this.state = 'completed';
    
    // Update session on server
    if (this.sessionId) {
      try {
        await apiRequest('POST', `/api/sessions/${this.sessionId}/complete`, {});
      } catch (error) {
        console.error('Failed to complete session:', error);
      }
    }

    // Increment session count if it was a work session
    if (this.sessionType === 'work') {
      this.sessionCount++;
    }

    // Play notification sound
    this.playNotificationSound();

    // Show notification
    this.showNotification();

    // Emit complete event
    this.emitEvent('complete');

    // Transition to next session if auto-start is enabled
    const settings = await getStorageItem('settings');
    
    let nextSessionType: SessionType | null = null;
    
    if (this.sessionType === 'work') {
      // After work, take a break
      if (this.sessionCount % settings.sessionsBeforeLongBreak === 0) {
        nextSessionType = 'long-break';
      } else {
        nextSessionType = 'break';
      }
    } else if (settings.autoStartPomodoros) {
      // After a break, start working again if auto-start is enabled
      nextSessionType = 'work';
    }

    // Start next session automatically if configured
    if (nextSessionType && 
        ((nextSessionType === 'work' && settings.autoStartPomodoros) || 
         (nextSessionType !== 'work' && settings.autoStartBreaks))) {
      await this.start(nextSessionType);
    } else {
      await this.reset();
    }
  }

  // Update the session in storage
  private async updateStorage(): Promise<void> {
    await setStorageItem('currentSession', {
      id: this.sessionId,
      type: this.sessionType,
      startTime: this.startTime ? this.startTime.toISOString() : null,
      endTime: null,
      completed: false,
      timeRemaining: this.timeRemaining,
      isActive: this.state === 'running' || this.state === 'paused'
    });
  }

  // Play notification sound
  private async playNotificationSound(): Promise<void> {
    const settings = await getStorageItem('settings');
    
    // If no sound is selected or volume is 0, don't play anything
    if (settings.notificationSound === 'none' || settings.notificationVolume === 0) {
      return;
    }
    
    // Play the notification sound
    try {
      const audio = new Audio(`/sounds/${settings.notificationSound}.mp3`);
      audio.volume = settings.notificationVolume / 100;
      await audio.play();
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  }

  // Show notification
  private showNotification(): void {
    if (typeof chrome !== 'undefined' && chrome.notifications) {
      const title = this.sessionType === 'work' 
        ? 'Work session completed!' 
        : 'Break time is over!';
      
      const message = this.sessionType === 'work'
        ? 'Time to take a break!'
        : 'Time to get back to work!';
      
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon-128.png',
        title,
        message,
        priority: 2
      });
    }
  }

  // Add event listener
  public addEventListener(listener: TimerEventListener): void {
    this.listeners.push(listener);
  }

  // Remove event listener
  public removeEventListener(listener: TimerEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Emit event
  private emitEvent(event: TimerEvent): void {
    const info = this.getInfo();
    for (const listener of this.listeners) {
      listener(event, info);
    }
  }
}

// Singleton instance
export const pomodoroTimer = new PomodoroTimer();
