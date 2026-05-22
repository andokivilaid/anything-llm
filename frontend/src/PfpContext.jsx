import React, { createContext, useState, useEffect, useMemo } from "react";
import useUser from "./hooks/useUser";
import System from "./models/system";

export const PfpContext = createContext();

export function PfpProvider({ children }) {
  const [pfp, setPfp] = useState(null);
  const { user } = useUser();

  useEffect(() => {
    async function fetchPfp() {
      if (!user?.id) return;
      try {
        const pfpUrl = await System.fetchPfp(user.id);
        setPfp(pfpUrl);
      } catch (err) {
        setPfp(null);
        console.error("Failed to fetch pfp:", err);
      }
    }
    fetchPfp();
  }, [user?.id]);

  const value = useMemo(() => ({ pfp, setPfp }), [pfp]);

  return <PfpContext.Provider value={value}>{children}</PfpContext.Provider>;
}
