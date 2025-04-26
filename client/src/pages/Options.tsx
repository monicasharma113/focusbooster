import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Bell, Shield } from "lucide-react";
import SettingsForm from "@/components/SettingsForm";
import BlockedSites from "@/components/BlockedSites";
import { getStorageItem } from "@/lib/chromeStorage";
import { type StorageItems } from "@/lib/chromeStorage";

export default function Options() {
  const [settings, setSettings] = useState<StorageItems["settings"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await getStorageItem("settings");
        setSettings(settings);
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="w-full max-w-3xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <CardTitle className="text-xl font-bold">Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="mb-4">
            Configure your Focus Booster settings to help you stay productive and eliminate distractions.
          </CardDescription>

          <Tabs defaultValue="timer" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="timer">
                <Clock className="h-4 w-4 mr-2" />
                Timer Settings
              </TabsTrigger>
              <TabsTrigger value="blocking">
                <Shield className="h-4 w-4 mr-2" />
                Website Blocking
              </TabsTrigger>
            </TabsList>
            <TabsContent value="timer" className="mt-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : settings ? (
                <SettingsForm initialSettings={settings} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Failed to load settings. Please refresh and try again.
                </div>
              )}
            </TabsContent>
            <TabsContent value="blocking" className="mt-4">
              <BlockedSites showHeader={true} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
