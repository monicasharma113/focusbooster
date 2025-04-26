import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, BarChart, Clock } from "lucide-react";
import PomodoroTimer from "@/components/PomodoroTimer";
import BlockedSites from "@/components/BlockedSites";
import { pomodoroTimer, type TimerInfo } from "@/lib/pomodoroTimer";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [timerInfo, setTimerInfo] = useState<TimerInfo | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Listen for timer events
    const handleTimerEvent = (_event: string, info: TimerInfo) => {
      setTimerInfo(info);
    };

    pomodoroTimer.addEventListener(handleTimerEvent);
    
    // Initialize timer info
    setTimerInfo(pomodoroTimer.getInfo());

    // Cleanup
    return () => {
      pomodoroTimer.removeEventListener(handleTimerEvent);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold">Focus Booster</CardTitle>
          <div className="flex gap-2">
            <Link href="/analytics">
              <Button variant="outline" size="icon" title="Analytics">
                <BarChart className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/options">
              <Button variant="outline" size="icon" title="Settings">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="timer" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="timer">
                <Clock className="h-4 w-4 mr-2" />
                Timer
              </TabsTrigger>
              <TabsTrigger value="blocked">
                <Settings className="h-4 w-4 mr-2" />
                Blocked Sites
              </TabsTrigger>
            </TabsList>
            <TabsContent value="timer" className="mt-4">
              <PomodoroTimer />
            </TabsContent>
            <TabsContent value="blocked" className="mt-4">
              <BlockedSites />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
