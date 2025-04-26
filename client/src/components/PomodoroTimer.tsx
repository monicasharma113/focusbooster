import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, Square, RotateCcw } from "lucide-react";
import { pomodoroTimer, type TimerInfo, type TimerState, type SessionType } from "@/lib/pomodoroTimer";
import { getStorageItem } from "@/lib/chromeStorage";
import { useToast } from "@/hooks/use-toast";

export default function PomodoroTimer() {
  const [timerInfo, setTimerInfo] = useState<TimerInfo | null>(null);
  const [progress, setProgress] = useState(100);
  const { toast } = useToast();

  // Format the time remaining as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Get the session type label
  const getSessionTypeLabel = (type: SessionType) => {
    switch (type) {
      case "work":
        return "Work";
      case "break":
        return "Short Break";
      case "long-break":
        return "Long Break";
      default:
        return "Unknown";
    }
  };

  // Get the button for the current state
  const getActionButton = () => {
    if (!timerInfo) return null;

    switch (timerInfo.state) {
      case "idle":
        return (
          <Button 
            onClick={handleStart} 
            className="w-full" 
            size="lg"
          >
            <Play className="mr-2 h-4 w-4" />
            Start Work Session
          </Button>
        );
      case "running":
        return (
          <Button 
            onClick={handlePause} 
            variant="outline" 
            className="w-full" 
            size="lg"
          >
            <Pause className="mr-2 h-4 w-4" />
            Pause
          </Button>
        );
      case "paused":
        return (
          <Button 
            onClick={handleResume} 
            className="w-full" 
            size="lg"
          >
            <Play className="mr-2 h-4 w-4" />
            Resume
          </Button>
        );
      case "completed":
        return (
          <Button 
            onClick={handleStart} 
            className="w-full" 
            size="lg"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Start New Session
          </Button>
        );
      default:
        return null;
    }
  };

  // Handle starting a new timer
  const handleStart = async () => {
    try {
      await pomodoroTimer.start("work");
      toast({
        title: "Work session started",
        description: "Stay focused for the next 25 minutes!",
      });
    } catch (error) {
      console.error("Failed to start timer:", error);
      toast({
        title: "Failed to start timer",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  // Handle pausing the timer
  const handlePause = async () => {
    try {
      await pomodoroTimer.pause();
    } catch (error) {
      console.error("Failed to pause timer:", error);
    }
  };

  // Handle resuming the timer
  const handleResume = async () => {
    try {
      await pomodoroTimer.resume();
    } catch (error) {
      console.error("Failed to resume timer:", error);
    }
  };

  // Handle stopping the timer
  const handleStop = async () => {
    try {
      await pomodoroTimer.stop();
      toast({
        title: "Timer stopped",
        description: "Your session has been canceled",
      });
    } catch (error) {
      console.error("Failed to stop timer:", error);
    }
  };

  // Start a specific type of session
  const startSession = async (type: SessionType) => {
    try {
      await pomodoroTimer.start(type);
      
      const typeLabel = getSessionTypeLabel(type);
      toast({
        title: `${typeLabel} session started`,
        description: type === "work" 
          ? "Stay focused for this work session!" 
          : "Take a well-deserved break!",
      });
    } catch (error) {
      console.error(`Failed to start ${type} session:`, error);
    }
  };

  useEffect(() => {
    // Initialize
    const initTimer = async () => {
      setTimerInfo(pomodoroTimer.getInfo());
    };
    
    initTimer();

    // Listen for timer events
    const handleTimerEvent = (_event: string, info: TimerInfo) => {
      setTimerInfo(info);
      
      // Calculate progress
      if (info.duration > 0) {
        setProgress(Math.round((info.timeRemaining / info.duration) * 100));
      } else {
        setProgress(0);
      }
    };

    pomodoroTimer.addEventListener(handleTimerEvent);
    
    // Cleanup
    return () => {
      pomodoroTimer.removeEventListener(handleTimerEvent);
    };
  }, []);

  if (!timerInfo) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Badge variant={timerInfo.state === 'running' ? "default" : "outline"}>
          {getSessionTypeLabel(timerInfo.type)}
        </Badge>
        
        {timerInfo.state !== 'idle' && (
          <Button 
            onClick={handleStop} 
            variant="ghost" 
            size="icon"
            title="Stop Timer"
          >
            <Square className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <div className="text-center py-8">
        <div className="text-6xl font-mono font-bold">
          {formatTime(timerInfo.timeRemaining)}
        </div>
        
        {timerInfo.duration > 0 && (
          <Progress 
            value={progress} 
            className="mt-4" 
            indicatorClassName={
              timerInfo.type === 'work' 
                ? 'bg-primary' 
                : timerInfo.type === 'break' 
                  ? 'bg-green-500' 
                  : 'bg-blue-500'
            }
          />
        )}
      </div>
      
      <div className="space-y-3">
        {getActionButton()}
        
        {timerInfo.state === 'idle' && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Button 
              onClick={() => startSession("break")} 
              variant="outline"
              size="sm"
            >
              Short Break
            </Button>
            <Button 
              onClick={() => startSession("long-break")} 
              variant="outline"
              size="sm"
            >
              Long Break
            </Button>
          </div>
        )}
      </div>
      
      {timerInfo.state !== 'idle' && (
        <div className="text-xs text-center text-muted-foreground mt-2">
          Session: {timerInfo.sessionCount + 1}
          {timerInfo.state === 'running' && (
            <span> • Website blocking active</span>
          )}
        </div>
      )}
    </div>
  );
}
