import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PeriodContextType {
  periodoAno: number;
  periodoMes: number;
  dataInicio: string;
  dataFim: string;
  loading: boolean;
  setPeriodo: (ano: number, mes: number) => void;
  setCustomRange: (inicio: string, fim: string) => void;
  resetRange: () => void;
}

function getMonthRange(ano: number, mes: number) {
  const start = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const lastDay = new Date(ano, mes, 0).getDate();
  const end = `${ano}-${String(mes).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

const now = new Date();
const defaultRange = getMonthRange(now.getFullYear(), now.getMonth() + 1);

const PeriodContext = createContext<PeriodContextType>({
  periodoAno: now.getFullYear(),
  periodoMes: now.getMonth() + 1,
  dataInicio: defaultRange.start,
  dataFim: defaultRange.end,
  loading: true,
  setPeriodo: () => {},
  setCustomRange: () => {},
  resetRange: () => {},
});

export const usePeriod = () => useContext(PeriodContext);

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const [periodoAno, setAno] = useState(now.getFullYear());
  const [periodoMes, setMes] = useState(now.getMonth() + 1);
  const [dataInicio, setDataInicio] = useState(defaultRange.start);
  const [dataFim, setDataFim] = useState(defaultRange.end);
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
          const ano = d.getFullYear();
          const mes = d.getMonth() + 1;
          setAno(ano);
          setMes(mes);
          const range = getMonthRange(ano, mes);
          setDataInicio(range.start);
          setDataFim(range.end);
        }
        setLoading(false);
      });
  }, []);

  const setPeriodo = useCallback((ano: number, mes: number) => {
    setAno(ano);
    setMes(mes);
    const range = getMonthRange(ano, mes);
    setDataInicio(range.start);
    setDataFim(range.end);
  }, []);

  const setCustomRange = useCallback((inicio: string, fim: string) => {
    setDataInicio(inicio);
    setDataFim(fim);
  }, []);

  const resetRange = useCallback(() => {
    const range = getMonthRange(periodoAno, periodoMes);
    setDataInicio(range.start);
    setDataFim(range.end);
  }, [periodoAno, periodoMes]);

  const value = useMemo(() => ({
    periodoAno, periodoMes, dataInicio, dataFim, loading,
    setPeriodo, setCustomRange, resetRange,
  }), [periodoAno, periodoMes, dataInicio, dataFim, loading, setPeriodo, setCustomRange, resetRange]);

  return (
    <PeriodContext.Provider value={value}>
      {children}
    </PeriodContext.Provider>
  );
}
