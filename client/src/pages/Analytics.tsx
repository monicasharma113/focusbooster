import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart, Clock, Globe } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AnalyticsChart from "@/components/AnalyticsChart";
import { getBrowsingHistory, getWebsiteStatistics, getCategoryStatistics, formatTimeSpent } from "@/lib/analytics";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function Analytics() {
  const [websiteStats, setWebsiteStats] = useState<any[]>([]);
  const [categoryStats, setCategoryStats] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [websiteData, categoryData, historyData] = await Promise.all([
          getWebsiteStatistics(),
          getCategoryStatistics(),
          getBrowsingHistory()
        ]);
        
        // Sort data by total time spent in descending order
        setWebsiteStats(websiteData.sort((a, b) => b.totalTime - a.totalTime).slice(0, 10));
        setCategoryStats(categoryData.sort((a, b) => b.totalTime - a.totalTime));
        
        // Sort history by visit time in descending order
        setHistory(historyData.sort((a, b) => 
          new Date(b.visitTime).getTime() - new Date(a.visitTime).getTime()
        ).slice(0, 50));
      } catch (error) {
        console.error("Failed to load analytics data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="w-full max-w-4xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <CardTitle className="text-xl font-bold">Productivity Analytics</CardTitle>
          </div>
          <ThemeToggle />
        </CardHeader>
        <CardContent>
          <CardDescription className="mb-4">
            Track your browsing habits and productivity patterns to optimize your focus time.
          </CardDescription>

          <Tabs defaultValue="websites" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="websites">
                <Globe className="h-4 w-4 mr-2" />
                Websites
              </TabsTrigger>
              <TabsTrigger value="categories">
                <BarChart className="h-4 w-4 mr-2" />
                Categories
              </TabsTrigger>
              <TabsTrigger value="history">
                <Clock className="h-4 w-4 mr-2" />
                History
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="websites" className="mt-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : websiteStats.length > 0 ? (
                <>
                  <div className="h-80">
                    <AnalyticsChart 
                      data={websiteStats.map(stat => ({
                        name: new URL(stat.url).hostname.replace('www.', ''),
                        value: stat.totalTime
                      }))}
                      xKey="name"
                      yKey="value"
                      type="bar"
                      title="Time Spent per Website (seconds)"
                    />
                  </div>
                  <ScrollArea className="h-64 mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Website</TableHead>
                          <TableHead className="text-right">Time Spent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {websiteStats.map((stat, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {new URL(stat.url).hostname.replace('www.', '')}
                            </TableCell>
                            <TableCell className="text-right">{formatTimeSpent(stat.totalTime)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No website data available yet. Start browsing to collect analytics.
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="categories" className="mt-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : categoryStats.length > 0 ? (
                <>
                  <div className="h-80">
                    <AnalyticsChart 
                      data={categoryStats.map(stat => ({
                        name: stat.category.charAt(0).toUpperCase() + stat.category.slice(1),
                        value: stat.totalTime
                      }))}
                      xKey="name"
                      yKey="value"
                      type="pie"
                      title="Time Spent by Category"
                    />
                  </div>
                  <ScrollArea className="h-64 mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Time Spent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryStats.map((stat, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {stat.category.charAt(0).toUpperCase() + stat.category.slice(1)}
                            </TableCell>
                            <TableCell className="text-right">{formatTimeSpent(stat.totalTime)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No category data available yet. Start browsing to collect analytics.
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="history" className="mt-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : history.length > 0 ? (
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Website</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Time Spent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {new URL(entry.url).hostname.replace('www.', '')}
                          </TableCell>
                          <TableCell className="truncate max-w-[200px]">{entry.title}</TableCell>
                          <TableCell>{entry.category}</TableCell>
                          <TableCell className="text-right">{formatTimeSpent(entry.timeSpent || 0)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No browsing history available yet. Start browsing to collect data.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
