import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { getMyCredits } from '../studio/lib/credits.js';

// رصيد الكريدت لكل الموقع: يظهر في الشريط العلوي ويتحدّث بعد كل تنزيل أو شحن،
// وعند الرجوع إلى الصفحة، وكل دقيقة (حتى تظهر موافقة الأدمن على الشحن دون تحديث الصفحة)
const CreditsContext = createContext({ balance: null, isAdmin: false, change: 0, refresh: () => {}, setBalance: () => {} });

export function CreditsProvider({ children }) {
  const { token } = useAuth();
  const [balance, setBal] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [change, setChange] = useState(0); // آخر تغيّر (+/−) لإظهار حركة صغيرة
  const last = useRef(null);
  const timer = useRef(null);

  const setBalance = useCallback((b) => {
    if (typeof b !== 'number') return;
    if (last.current !== null && b !== last.current) {
      setChange(b - last.current);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setChange(0), 2500);
    }
    last.current = b;
    setBal(b);
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return null;
    try {
      const d = await getMyCredits();
      setIsAdmin(!!d.isAdmin);
      setBalance(d.balance);
      return d;
    } catch {
      return null;
    }
  }, [token, setBalance]);

  useEffect(() => {
    if (!token) {
      last.current = null;
      setBal(null);
      setIsAdmin(false);
      return undefined;
    }
    refresh();
    const onFocus = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onFocus);
    const iv = setInterval(onFocus, 60e3);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      clearInterval(iv);
    };
  }, [token, refresh]);

  return (
    <CreditsContext.Provider value={{ balance, isAdmin, change, refresh, setBalance }}>
      {children}
    </CreditsContext.Provider>
  );
}

export const useCredits = () => useContext(CreditsContext);
