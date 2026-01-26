import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type UpdateSettingsInput, type DashboardDataResponse, type SettingsResponse } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

// ============================================
// SETTINGS HOOKS
// ============================================

export function useSettings() {
  return useQuery({
    queryKey: [api.settings.get.path],
    queryFn: async () => {
      const res = await fetch(api.settings.get.path, { credentials: "include" });
      if (res.status === 404) return null; // Not set up yet
      if (!res.ok) throw new Error("Failed to fetch settings");
      return api.settings.get.responses[200].parse(await res.json());
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: UpdateSettingsInput) => {
      const res = await fetch(api.settings.update.path, {
        method: api.settings.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update settings");
      }
      return api.settings.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.settings.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.get.path] });
      toast({
        title: "Settings Saved",
        description: "Your configuration has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useRefreshData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.settings.refresh.path, {
        method: api.settings.refresh.method,
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to sync data");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.dashboard.get.path] });
      toast({
        title: "Sync Complete",
        description: data.message || "Your workout data is now up to date.",
      });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// ============================================
// WEIGHT LOG HOOKS
// ============================================

export function useWeightLog() {
  return useQuery({
    queryKey: [api.weightLog.list.path],
    queryFn: async () => {
      const res = await fetch(api.weightLog.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch weight log");
      return api.weightLog.list.responses[200].parse(await res.json());
    },
  });
}

export function useAddWeightEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { date: string; weightLb: string }) => {
      const res = await fetch(api.weightLog.create.path, {
        method: api.weightLog.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to add weight entry" }));
        throw new Error(error.message || "Failed to add weight entry");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.weightLog.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.get.path] });
      toast({
        title: "Weight Added",
        description: "Your weight entry has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteWeightEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/weight-log/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to delete weight entry" }));
        throw new Error(error.message || "Failed to delete weight entry");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.weightLog.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.get.path] });
      toast({
        title: "Entry Deleted",
        description: "Weight entry has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// ============================================
// EXERCISE PRs HOOKS
// ============================================

export function useExercisePrs() {
  return useQuery({
    queryKey: [api.exercisePrs.list.path],
    queryFn: async () => {
      const res = await fetch(api.exercisePrs.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch exercise PRs");
      return api.exercisePrs.list.responses[200].parse(await res.json());
    },
  });
}

// ============================================
// DASHBOARD HOOKS
// ============================================

export function useDashboardData(year?: number) {
  return useQuery({
    queryKey: [api.dashboard.get.path, year],
    queryFn: async () => {
      const url = new URL(api.dashboard.get.path, window.location.origin);
      if (year) url.searchParams.append("year", year.toString());
      
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      return api.dashboard.get.responses[200].parse(await res.json());
    },
  });
}
