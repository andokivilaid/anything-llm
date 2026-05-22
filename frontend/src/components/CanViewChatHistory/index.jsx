import { Navigate } from "react-router-dom";
import { FullScreenLoader } from "@/components/Preloader";
import paths from "@/utils/paths";
import { useCanViewChatHistoryQuery } from "@/hooks/queries/useSystem";

/**
 * Protects the view from system set ups who cannot view chat history.
 * If the user cannot view chat history, they are redirected to the home page.
 * @param {React.ReactNode} children
 */
export function CanViewChatHistory({ children }) {
  const { loading, viewable } = useCanViewChatHistory();
  if (loading) return <FullScreenLoader />;
  if (!viewable) return <Navigate to={paths.home()} replace />;

  return <>{children}</>;
}

/**
 * Provides the `viewable` state to the children.
 * @returns {React.ReactNode}
 */
export function CanViewChatHistoryProvider({ children }) {
  const { loading, viewable } = useCanViewChatHistory();
  if (loading) return null;
  return <>{children({ viewable })}</>;
}

/**
 * Hook that fetches the can view chat history state.
 * Cached via React Query so multiple consumers share one request.
 */
export function useCanViewChatHistory() {
  const { data, isLoading } = useCanViewChatHistoryQuery();
  return { loading: isLoading, viewable: !!data };
}
