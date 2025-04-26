import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { getStorageItem, setStorageItem, type StorageItems } from "@/lib/chromeStorage";
import { useToast } from "@/hooks/use-toast";

// Define the form schema
const formSchema = z.object({
  workDuration: z.number().min(1).max(120),
  breakDuration: z.number().min(1).max(60),
  longBreakDuration: z.number().min(1).max(120),
  sessionsBeforeLongBreak: z.number().min(1).max(10),
  autoStartBreaks: z.boolean(),
  autoStartPomodoros: z.boolean(),
  notificationSound: z.string(),
  notificationVolume: z.number().min(0).max(100),
});

type FormValues = z.infer<typeof formSchema>;

interface SettingsFormProps {
  initialSettings: StorageItems["settings"];
}

export default function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Create form with initial values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workDuration: initialSettings.workDuration,
      breakDuration: initialSettings.breakDuration,
      longBreakDuration: initialSettings.longBreakDuration,
      sessionsBeforeLongBreak: initialSettings.sessionsBeforeLongBreak,
      autoStartBreaks: initialSettings.autoStartBreaks,
      autoStartPomodoros: initialSettings.autoStartPomodoros,
      notificationSound: initialSettings.notificationSound,
      notificationVolume: initialSettings.notificationVolume,
    },
  });

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    setIsSaving(true);
    try {
      // Get user ID
      const userId = await getStorageItem("userId");
      
      // Update settings on server
      await apiRequest("POST", "/api/settings", {
        userId,
        ...data
      });
      
      // Update settings in storage
      await setStorageItem("settings", data);
      
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully",
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({
        title: "Failed to save settings",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="workDuration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Work Duration (minutes)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  How long each work session should last
                </FormDescription>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="breakDuration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Break Duration (minutes)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  How long each short break should last
                </FormDescription>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="longBreakDuration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Long Break Duration (minutes)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  How long long breaks should last
                </FormDescription>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="sessionsBeforeLongBreak"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sessions Before Long Break</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  Number of work sessions before a long break
                </FormDescription>
              </FormItem>
            )}
          />
        </div>
        
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="autoStartBreaks"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Auto-start Breaks</FormLabel>
                  <FormDescription>
                    Automatically start breaks after work sessions end
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="autoStartPomodoros"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Auto-start Work Sessions</FormLabel>
                  <FormDescription>
                    Automatically start work sessions after breaks end
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="notificationSound"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notification Sound</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a sound" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="bell">Bell</SelectItem>
                    <SelectItem value="chime">Chime</SelectItem>
                    <SelectItem value="ding">Ding</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Sound to play when a timer completes
                </FormDescription>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="notificationVolume"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notification Volume</FormLabel>
                <FormControl>
                  <Slider
                    value={[field.value]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(value) => field.onChange(value[0])}
                    className="py-4"
                  />
                </FormControl>
                <FormDescription>
                  Volume: {field.value}%
                </FormDescription>
              </FormItem>
            )}
          />
        </div>
        
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </form>
    </Form>
  );
}
