import React, { useRef, useCallback } from "react";
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

  const moveData = {};
  const scrubberRef = useRef();

  const handleMouseDown = useCallback(
    e => {
      e.preventDefault();
      e.stopPropagation();

      Object.assign(moveData, {
        initialMousePos: {
          x: e.clientX,
          y: e.clientY
        },
        initialValue: value,
        isMouseDown: true
      });

      document.addEventListener(
        "mouseup",
        () => (moveData.isMouseDown = false)
      );
      document.addEventListener("mousemove", e => {
        if (moveData.isMouseDown && scrubberRef.current) {
          const p = e.clientX / scrubberRef.current.clientWidth;

          const newValue = Math.min(
            history.length - 1,
            Math.max(0, Math.round(p * history.length))
          );

          onChange(newValue);
        }
      });
    },
    [value, onChange, history, moveData]
  );

  return (
    <div>
      <div
        className={styles.timeline}
        onKeyDown={onKeyDown}
        ref={scrubberRef}
        onMouseDown={handleMouseDown}
      >
        {history.map((step, i) => {
          return (
            <div
              key={i}
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
    </div>
  );
}
