import { useState, useEffect, FormEvent } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { getStorageItem, setStorageItem } from "@/lib/chromeStorage";
import { useToast } from "@/hooks/use-toast";

interface BlockedSite {
  id: number;
  url: string;
  isActive: boolean;
}

interface BlockedSitesProps {
  showHeader?: boolean;
}

export default function BlockedSites({ showHeader = false }: BlockedSitesProps) {
  const [blockedSites, setBlockedSites] = useState<BlockedSite[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  // Load blocked sites from storage and server
  useEffect(() => {
    async function loadBlockedSites() {
      setIsLoading(true);
      try {
        // Get user ID
        const userId = await getStorageItem("userId");
        
        // Get sites from server
        const response = await apiRequest("GET", `/api/blocked-sites/${userId}`, undefined);
        const sites = await response.json();
        
        // Update state
        setBlockedSites(sites);
        
        // Also update chrome storage
        await setStorageItem("blockedSites", sites);
      } catch (error) {
        console.error("Failed to load blocked sites:", error);
        
        // Try fallback to chrome storage
        try {
          const sites = await getStorageItem("blockedSites");
          setBlockedSites(sites);
        } catch (e) {
          console.error("Failed to load from storage too:", e);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadBlockedSites();
  }, []);

  // Add a new blocked site
  const handleAddSite = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!newUrl.trim()) return;
    
    // Try to format the URL properly
    let formattedUrl = newUrl.trim();
    
    // Add protocol if not present
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }
    
    try {
      setIsAdding(true);
      
      const userId = await getStorageItem("userId");
      
      // Add site to server
      const response = await apiRequest("POST", "/api/blocked-sites", {
        userId,
        url: formattedUrl,
        isActive: true
      });
      
      const newSite = await response.json();
      
      // Update state
      setBlockedSites([...blockedSites, newSite]);
      
      // Update storage
      await setStorageItem("blockedSites", [...blockedSites, newSite]);
      
      // Clear input
      setNewUrl("");
      
      toast({
        title: "Website blocked",
        description: `${new URL(formattedUrl).hostname} has been added to your blocked list`,
      });
    } catch (error) {
      console.error("Failed to add blocked site:", error);
      toast({
        title: "Failed to block website",
        description: "Please make sure the URL is valid",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  // Toggle a site's active status
  const handleToggleSite = async (id: number, isActive: boolean) => {
    try {
      // Update on server
      const response = await apiRequest("PATCH", `/api/blocked-sites/${id}`, {
        isActive: !isActive
      });
      
      const updatedSite = await response.json();
      
      // Update state
      const updatedSites = blockedSites.map(site => 
        site.id === id ? updatedSite : site
      );
      
      setBlockedSites(updatedSites);
      
      // Update storage
      await setStorageItem("blockedSites", updatedSites);
      
      toast({
        title: isActive ? "Website unblocked" : "Website blocked",
        description: `The website is now ${isActive ? "unblocked" : "blocked"} during work sessions`,
      });
    } catch (error) {
      console.error("Failed to toggle site:", error);
      toast({
        title: "Failed to update website",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  // Delete a blocked site
  const handleDeleteSite = async (id: number) => {
    try {
      // Delete from server
      await apiRequest("DELETE", `/api/blocked-sites/${id}`, undefined);
      
      // Update state
      const updatedSites = blockedSites.filter(site => site.id !== id);
      setBlockedSites(updatedSites);
      
      // Update storage
      await setStorageItem("blockedSites", updatedSites);
      
      toast({
        title: "Website removed",
        description: "The website has been removed from your blocked list",
      });
    } catch (error) {
      console.error("Failed to delete blocked site:", error);
      toast({
        title: "Failed to remove website",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const formatUrl = (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace(/^www\./, "");
    } catch (e) {
      return url;
    }
  };

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="mb-4">
          <CardTitle className="text-xl mb-2">Blocked Websites</CardTitle>
          <p className="text-sm text-muted-foreground">
            Add websites you want to block during your work sessions to avoid distractions.
          </p>
        </div>
      )}
      
      <form onSubmit={handleAddSite} className="flex space-x-2">
        <Input
          placeholder="Enter website URL"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          disabled={isAdding}
        />
        <Button type="submit" disabled={isAdding || !newUrl.trim()}>
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </form>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : blockedSites.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No blocked websites. Add websites you want to block during work sessions.
        </div>
      ) : (
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {blockedSites.map((site) => (
              <div key={site.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={site.isActive}
                    onCheckedChange={() => handleToggleSite(site.id, site.isActive)}
                  />
                  <span className={site.isActive ? "" : "text-muted-foreground"}>
                    {formatUrl(site.url)}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleDeleteSite(site.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
