import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { calculateUzi } from '../domain/uzi/calculate';
import { downloadBlob } from '../reports/download';
import type { ReportKind } from '../reports';
import { useAppState } from '../state/store';
import { useMessage } from './messages';

interface ReportActions {
  /** Идет формирование отчета: кнопки отчетов недоступны. */
  busy: boolean;
  generate: (kind: ReportKind) => Promise<void>;
}

const ReportsContext = createContext<ReportActions | null>(null);

export function useReports(): ReportActions {
  const value = useContext(ReportsContext);
  if (!value) throw new Error('useReports используется вне ReportsProvider');
  return value;
}

export function ReportsProvider({ children }: { children: ReactNode }) {
  const state = useAppState();
  const showMessage = useMessage();
  const [busy, setBusy] = useState(false);

  const generate = useCallback(
    async (kind: ReportKind) => {
      setBusy(true);
      try {
        // Генераторы отчетов вместе с библиотекой docx загружаются только при первом нажатии
        const { createReportFile } = await import('../reports');
        const { blob, fileName } = await createReportFile(kind, state);
        downloadBlob(blob, fileName);
        let text = `Отчет сохранен: ${fileName}.`;
        if (kind === 'uziFull' || kind === 'uziCurrent') {
          const result = calculateUzi(state.uzi);
          const missing = result.questions - result.answered;
          if (missing) text += ` Без ответа ${missing} из ${result.questions}, они учтены как 0.`;
        }
        showMessage({
          text,
          tone: 'ok',
        });
      } catch (error) {
        console.error(error);
        showMessage({ text: 'Не удалось сформировать отчет. Обновите страницу и попробуйте еще раз.', tone: 'error' });
      } finally {
        setBusy(false);
      }
    },
    [showMessage, state]
  );

  const value = useMemo(() => ({ busy, generate }), [busy, generate]);
  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}
