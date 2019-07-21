import React, { useEffect, useRef, useMemo, useState } from "react";
import createPersistedState from "use-persisted-state";
import { Controlled as CodeMirror } from "react-codemirror2";
import "codemirror/mode/jsx/jsx";
import "codemirror/lib/codemirror.css";
import "./assets/codemirror-theme.scss";
import styles from "./App.module.scss";

import Viz from "./Viz";
import HistoryTimeline from "./HistoryTimeline";
import record from "./lib/record";

const usePersistedCode = createPersistedState("code");

const CM_OPTS = {
  mode: "text/javascript",
  theme: "jsviz",
  lineNumbers: false,
  smartIndent: true,
  tabSize: 2,
  indentWithTabs: false
};

export default function App() {
  const inst = useRef({ editor: null, marker: null });
  const [code, setCode] = usePersistedCode(`let x = 42;`);
  const { error, history } = useMemo(() => {
    try {
      return { history: record(code) };
    } catch (error) {
      return { error };
    }
  }, [code]);

  const [_stepno, setStepno] = useState(0);
  const [maxDetail, setMaxDetail] = useState(2);

  const visibleHistory =
    history && history.length > 0
      ? history.filter(({ detail }) => detail <= maxDetail)
      : null;

  const stepno = Math.max(
    0,
    Math.min(_stepno, (visibleHistory || []).length - 1)
  );

  // step = { context, node, pre, summary, detail }
  const step = visibleHistory ? visibleHistory[stepno] : null;

  useEffect(() => {
    if (!inst.current.editor) return;
    inst.current.marker && inst.current.marker.clear();

    if (!step) return;
    const doc = inst.current.editor.getDoc();
    const loc = step.node.loc;
    inst.current.marker = doc.markText(
      { line: loc.start.line - 1, ch: loc.start.column },
      { line: loc.end.line - 1, ch: loc.end.column },
      {
        className: step.pre ? styles.markedPre : styles.markedPost
      }
    );
  }, [inst, step]);

  return (
    <div className="app">
      <div className={styles.code}>
        <CodeMirror
          className="editable"
          options={CM_OPTS}
          editorDidMount={editor => (inst.current.editor = editor)}
          value={code}
          onBeforeChange={(editor, data, value) => {
            setCode(value || "");
          }}
        />
      </div>
      {(error || !visibleHistory) && <hr className={styles.emptyDivider} />}
      {error && (
        <div className={styles.main}>
          <div className={styles.error}>
            <p>{error.message}</p>
          </div>
        </div>
      )}
      {visibleHistory && (
        <div>
          <HistoryTimeline
            value={stepno}
            onChange={setStepno}
            history={visibleHistory}
          />
          <div className={styles.main}>
            {/* <div>
              <label>
                Step{" "}
                <input
                  style={{ width: "400px" }}
                  min={0}
                  max={visibleHistory.length - 1}
                  step={1}
                  value={stepno}
                  onChange={e => setStepno(e.target.value)}
                  type="range"
                />
              </label>
            </div> */}
            <div>
              <label>
                Expression detail?{" "}
                <input
                  type="checkbox"
                  checked={maxDetail === 2}
                  onChange={() => setMaxDetail(3 - maxDetail)}
                />
              </label>
            </div>
            <Viz step={step} />
          </div>
        </div>
      )}
    </div>
  );
}
