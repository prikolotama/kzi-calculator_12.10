import { useMemo, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { formatDate } from '../domain/common/format';
import type { Mode } from '../domain/mode';
import { nextAssessmentDate } from '../domain/schedule';
import styles from './PageHeader.module.css';

const PERIOD: Record<Mode, string> = {
  kzi: 'Кзи рассчитывают не реже одного раза в 6 месяцев.',
  uzi: 'Подрядчик рассчитывает Узи не реже одного раза в 2 года.',
};

/** Заголовок режима и строка о периодичности оценки со сроком следующей проверки. */
export function PageHeader({ mode, title, subtitle }: { mode: Mode; title: string; subtitle: ReactNode }) {
  const due = useMemo(() => nextAssessmentDate(mode, new Date()), [mode]);
  return (
    <div className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>
      <div className={styles.period}>
        <span className={styles.icon}>
          <Icon name="calendar" size={18} />
        </span>
        <span>
          {PERIOD[mode]} При оценке сегодня следующая проверка не позднее {formatDate(due)}.
        </span>
      </div>
    </div>
  );
}
