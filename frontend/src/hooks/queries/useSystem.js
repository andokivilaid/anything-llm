import { useQuery } from "@tanstack/react-query";
import System from "@/models/system";
import { queryKeys } from "./keys";

export function useCanViewChatHistoryQuery() {
  return useQuery({
    queryKey: queryKeys.system.canViewChatHistory(),
    queryFn: async () => {
      const { viewable } = await System.fetchCanViewChatHistory();
      return !!viewable;
    },
  });
}
