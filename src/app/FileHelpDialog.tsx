import type { RefObject } from 'react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import styles from './RequisitesDialog.module.css';

export function FileHelpDialog({ dialogRef }: { dialogRef: RefObject<HTMLDialogElement | null> }) {
  const close = () => dialogRef.current?.close();
  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="file-help-title">
      <div className={styles.form}>
        <div className={styles.header}>
          <h2 id="file-help-title" className={styles.title}>
            Как это работает
          </h2>
          <button type="button" className={styles.close} aria-label="Закрыть" onClick={close}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <p>
          Ответы обрабатываются в вашем браузере и не отправляются на сервер. Нажмите «Сохранить в файл», чтобы скачать
          файл с ответами и реквизитами.
        </p>
        <p>
          Вы можете отправить этот файл и ссылку на калькулятор коллегам. Чтобы посмотреть ответы и результат расчета,
          им нужно открыть калькулятор и нажать «Загрузить из файла».
        </p>
        <p>
          Коллеги также могут заполнить калькулятор или изменить ответы, сохранить файл и отправить его вам. Загрузите
          полученный файл, чтобы посмотреть их результат.
        </p>
        <div className={styles.actions}>
          <Button variant="dark" onClick={close}>
            Понятно
          </Button>
        </div>
      </div>
    </dialog>
  );
}
