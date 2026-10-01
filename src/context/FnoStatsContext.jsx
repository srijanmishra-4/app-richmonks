import { createContext, useContext, useState, useCallback, useEffect } from 'react';

import { socketRequest } from '@/utils/socket';
import { useSocketEvent } from '@/hooks/useSocket';
import { useRegisterRefresh } from '@/context/RefreshContext';

const FnoStatsContext = createContext(null);

export function FnoStatsProvider({ children }) {
  const [fnoStats, setFnoStats] = useState(null);

  const fetchFnoStats = useCallback(() => socketRequest('GET_FNO_STATS'), []);

  useSocketEvent('REC_FNO_STATS', (res) => {
    if (res) setFnoStats(res);
  });

  useEffect(() => {
    fetchFnoStats().catch(() => {});
  }, [fetchFnoStats]);

  useRegisterRefresh(fetchFnoStats);

  return (
    <FnoStatsContext.Provider value={fnoStats}>
      {children}
    </FnoStatsContext.Provider>
  );
}

export function useFnoStats() {
  return useContext(FnoStatsContext);
}
