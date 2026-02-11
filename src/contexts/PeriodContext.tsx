import React, { createContext, useContext, useState } from 'react';

interface PeriodContextType {
  periodoAno: number;
  periodoMes: number;
  setPeriodo: (ano: number, mes: number) => void;
}

const now = new Date();
const PeriodContext = createContext<PeriodContextType>({
  periodoAno: now.getFullYear(),
  periodoMes: now.getMonth() + 1,
  setPeriodo: () => {},
});

export const usePeriod = () => useContext(PeriodContext);

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const [periodoAno, setAno] = useState(now.getFullYear());
  const [periodoMes, setMes] = useState(now.getMonth() + 1);

  const setPeriodo = (ano: number, mes: number) => {
    setAno(ano);
    setMes(mes);
  };

  return (
    <PeriodContext.Provider value={{ periodoAno, periodoMes, setPeriodo }}>
      {children}
    </PeriodContext.Provider>
  );
}
