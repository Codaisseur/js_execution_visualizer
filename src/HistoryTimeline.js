import React, { useCallback } from "react";
import cx from "classnames";
import styles from "./HistoryTimeline.module.scss";

export default function HistoryTimeline({
  history,
  value,
  onChange,
  runtimeError
}) {
  const onKeyDown = useCallback(
    e => {
      if (e.keyCode === 37) {
        onChange(value - 1);
      } else if (e.keyCode === 39) {
        onChange(value + 1);
      }
    },
    [value, onChange]
  );

  return (
    <div className={styles.timeline} onKeyDown={onKeyDown}>
      {history.map((step, i) => {
        return (
          <a
            key={i}
            href="#"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              onChange(i);
            }}
            className={cx({
              [styles.step]: true,
              [styles.selected]: i === parseInt(value)
            })}
          />
        );
      })}
      {runtimeError && (
        <div className={cx([styles.step, styles.runtimeError])} />
      )}
    </div>
  );
}
