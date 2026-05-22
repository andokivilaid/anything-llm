import { useQuery } from "@tanstack/react-query";
import Workspace from "@/models/workspace";
import { queryKeys } from "./keys";

export function useWorkspaces() {
  return useQuery({
    queryKey: queryKeys.workspaces.list(),
    queryFn: () => Workspace.all(),
  });
}

export function useWorkspaceBySlug(slug) {
  return useQuery({
    queryKey: queryKeys.workspaces.bySlug(slug),
    queryFn: () => Workspace.bySlug(slug),
    enabled: !!slug,
  });
}

export function useWorkspaceThreads(slug) {
  return useQuery({
    queryKey: queryKeys.workspaces.threads(slug),
    queryFn: async () => {
      const { threads } = await Workspace.threads.all(slug);
      return threads ?? [];
    },
    enabled: !!slug,
  });
}
