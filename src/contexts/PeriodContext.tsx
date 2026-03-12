import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PeriodContextType {
  periodoAno: number;
  periodoMes: number;
  loading: boolean;
  setPeriodo: (ano: number, mes: number) => void;
}

const now = new Date();
const PeriodContext = createContext<PeriodContextType>({
  periodoAno: now.getFullYear(),
  periodoMes: now.getMonth() + 1,
  loading: true,
  setPeriodo: () => {},
});

export const usePeriod = () => useContext(PeriodContext);

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const [periodoAno, setAno] = useState(now.getFullYear());
  const [periodoMes, setMes] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('vendas')
      .select('data_emissao')
      .order('data_emissao', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]?.data_emissao) {
          const d = new Date(data[0].data_emissao + 'T00:00:00');
          setAno(d.getFullYear());
          setMes(d.getMonth() + 1);
        }
        setLoading(false);
      });
  }, []);

  const setPeriodo = (ano: number, mes: number) => {
    setAno(ano);
    setMes(mes);
  };

  return (
    <PeriodContext.Provider value={{ periodoAno, periodoMes, loading, setPeriodo }}>
      {children}
    </PeriodContext.Provider>
  );
}
