import { useSettings, useUpdateSettings, useRefreshData, useWeightLog, useAddWeightEntry, useDeleteWeightEntry } from "@/hooks/use-hevy";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertHevyConnectionSchema } from "@shared/schema";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Loader2, Save, Key, Target, RefreshCw, Scale, Plus, Trash2, Calendar, Eye, EyeOff, Sun, Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/components/ThemeProvider";

// Schema for the form
const formSchema = insertHevyConnectionSchema.pick({
  apiKey: true,
  targetWeightLb: true,
  selectedYear: true,
}).extend({
  targetWeightLb: z.coerce.number().min(1000, "Goal must be at least 1,000 lbs"),
  selectedYear: z.coerce.number().min(2020).max(2030),
});

type FormValues = z.infer<typeof formSchema>;

export default function Settings() {
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const refreshMutation = useRefreshData();
  const { data: weightLogData, isLoading: weightLogLoading } = useWeightLog();
  const addWeightMutation = useAddWeightEntry();
  const deleteWeightMutation = useDeleteWeightEntry();
  const { theme, toggleTheme } = useTheme();
  
  const [newWeightDate, setNewWeightDate] = useState(new Date().toISOString().split('T')[0]);
  const [newWeightValue, setNewWeightValue] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      apiKey: "",
      targetWeightLb: 3000000,
      selectedYear: new Date().getFullYear(),
    },
  });

  // Populate form when data loads
  useEffect(() => {
    if (settings) {
      form.reset({
        apiKey: settings.apiKey,
        targetWeightLb: Number(settings.targetWeightLb),
        selectedYear: settings.selectedYear || new Date().getFullYear(),
      });
    }
  }, [settings, form]);

  const onSubmit = (data: FormValues) => {
    updateMutation.mutate({
      apiKey: data.apiKey,
      targetWeightLb: data.targetWeightLb.toString(),
      selectedYear: data.selectedYear,
    });
  };

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const handleAddWeight = () => {
    if (!newWeightValue || !newWeightDate) return;
    addWeightMutation.mutate({ 
      date: newWeightDate, 
      weightLb: newWeightValue 
    }, {
      onSuccess: () => {
        setNewWeightValue("");
      }
    });
  };

  const handleDeleteWeight = (id: number) => {
    deleteWeightMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <Shell>
        <div className="h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">Configure your connection to Hevy and set your volume goals.</p>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              Appearance
            </CardTitle>
            <CardDescription>
              Choose between light and dark mode.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sun className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Light</span>
              </div>
              <Switch
                id="theme-toggle"
                checked={theme === "dark"}
                onCheckedChange={toggleTheme}
                data-testid="switch-theme"
              />
              <div className="flex items-center gap-3">
                <span className="text-sm">Dark</span>
                <Moon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Manage your API keys and goal parameters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hevy API Key</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type={showApiKey ? "text" : "password"}
                            placeholder="your_api_key_here" 
                            className="pl-9 pr-10" 
                            data-testid="input-api-key"
                            {...field} 
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-0.5 h-8 w-8"
                            onClick={() => setShowApiKey(!showApiKey)}
                            data-testid="button-toggle-api-key"
                          >
                            {showApiKey ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Found in Hevy App Settings {'>'} Developer. Kept secure and encrypted.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="targetWeightLb"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Volume Goal (lbs)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Target className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="text"
                              className="pl-9"
                              value={field.value ? Number(field.value).toLocaleString() : ''}
                              onChange={(e) => {
                                const rawValue = e.target.value.replace(/,/g, '');
                                if (rawValue === '' || /^\d+$/.test(rawValue)) {
                                  field.onChange(rawValue ? Number(rawValue) : '');
                                }
                              }}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Default is 3,000,000 lbs per year.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="selectedYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Year</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          The year to track progress for.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    type="submit" 
                    size="lg" 
                    disabled={updateMutation.isPending}
                    className="w-full sm:w-auto min-w-[150px]"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {settings && (
          <Card className="border-secondary bg-secondary/20">
            <CardHeader>
              <CardTitle>Manual Sync</CardTitle>
              <CardDescription>
                Force a synchronization with Hevy. This happens automatically, but you can trigger it manually here.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button 
                variant="outline" 
                onClick={handleRefresh} 
                disabled={refreshMutation.isPending}
                className="w-full sm:w-auto"
                data-testid="button-sync"
              >
                {refreshMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Now
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Weight Log
            </CardTitle>
            <CardDescription>
              Track your bodyweight over time. The app will use the closest weight entry for each workout date to calculate volume for bodyweight exercises.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={newWeightDate}
                    onChange={(e) => setNewWeightDate(e.target.value)}
                    className="pl-9"
                    data-testid="input-weight-date"
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="relative">
                  <Scale className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="Weight (lbs)"
                    value={newWeightValue}
                    onChange={(e) => setNewWeightValue(e.target.value)}
                    className="pl-9"
                    data-testid="input-weight-value"
                  />
                </div>
              </div>
              <Button 
                onClick={handleAddWeight}
                disabled={addWeightMutation.isPending || !newWeightValue}
                data-testid="button-add-weight"
              >
                {addWeightMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>

            {weightLogLoading ? (
              <div className="flex justify-center py-4" data-testid="loading-weight-log">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : weightLogData && weightLogData.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto" data-testid="list-weight-log">
                {weightLogData.map((entry) => (
                  <div 
                    key={entry.id} 
                    className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                    data-testid={`weight-entry-${entry.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground" data-testid={`text-weight-date-${entry.id}`}>
                        {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </span>
                      <span className="font-semibold" data-testid={`text-weight-value-${entry.id}`}>{parseFloat(entry.weightLb).toFixed(1)} lbs</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteWeight(entry.id)}
                      disabled={deleteWeightMutation.isPending}
                      data-testid={`button-delete-weight-${entry.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-weight-log-empty">
                No weight entries yet. Add your first entry above.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
