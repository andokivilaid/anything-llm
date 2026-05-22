// Central query-key factory. All React Query hooks should derive their keys
// from here so invalidation in mutations stays in sync with the queries.
export const queryKeys = {
  workspaces: {
    all: ["workspaces"],
    list: () => [...queryKeys.workspaces.all, "list"],
    bySlug: (slug) => [...queryKeys.workspaces.all, "bySlug", slug],
    threads: (slug) => [...queryKeys.workspaces.all, "threads", slug],
  },
  system: {
    all: ["system"],
    canViewChatHistory: () => [...queryKeys.system.all, "canViewChatHistory"],
  },
};
