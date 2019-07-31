import React, { useEffect, useRef, useMemo, useState } from "react";
import { stripIndent } from "common-tags";
import createPersistedState from "use-persisted-state";
import CodeMirror from "../codemirror/codemirror";
import styles from "./VisualizedExecution.module.scss";
import Viz from "./Viz";
import HistoryTimeline from "./HistoryTimeline";

import record from "../lib/record";
import useAsync from "react-use/lib/useAsync";

const usePersistedCode = createPersistedState("code");
const usePersistedMaxDetail = createPersistedState("maxdetail");
const usePersistedStepno = createPersistedState("stepno");
const usePersistedShowBuiltins = createPersistedState("showbuiltins");

const PRESETS = [
  {
    title: "just a variable",
    code: stripIndent`
      let n = 42;
    `
  },
  {
    title: "array push and access",
    code: stripIndent`
      const fruits = ["pear", "banana"];
      fruits.push("jello");
      const jello = fruits[fruits.length - 1];
    `
  },
  {
    title: "a closure and correct scoping",
    code: stripIndent`
      let adjective = "beautiful";
      function make(a) {
        return thing => {
          return a + " " + adjective + " " + thing;
        };
      }
      const definite = make("the");
      const s1 = definite("variable");
      adjective = "nested";
      const s2 = definite("scope");
    `
  },
  {
    title: "map+filter+reduce expression",
    code: stripIndent`
      const result = [10, 2, 3, 6]
        .map(n => n - 2)
        .filter(n => n > 3)
        .reduce((a, b) => a + b, 0);
    `
  }
];

const CM_OPTS = {
  mode: "text/javascript",
  theme: "jsviz",
  lineNumbers: false,
  smartIndent: true,
  tabSize: 2,
  indentWithTabs: false,
  styleSelectedText: true
};

export default function App() {
  const inst = useRef({ editor: null, marker: null });
  const [code, setCode] = usePersistedCode(`const result = [10, 2, 3, 6]
  .map(n => n - 2)
  .filter(n => n > 3)
  .reduce((a, b) => a + b, 0);`);

  const { loading, value, error } = useAsync(async () => await record(code), [
    code
  ]);

  const [showBuiltins, setShowBuiltins] = usePersistedShowBuiltins(false);
  const [_stepno, setStepno] = usePersistedStepno(0);
  const [maxDetail, setMaxDetail] = usePersistedMaxDetail(2);

  const history =
    value && value.history.length > 0
      ? value.history.filter(({ detail }) => detail <= maxDetail)
      : [];

  // const history =
  //   history && history.length > 0
  //     ? history.filter(({ detail }) => detail <= maxDetail)
  //     : null;

  const stepno = Math.max(0, Math.min(_stepno, history.length - 1));

  // step = { context, node, pre, summary, detail }
  const step = history ? history[stepno] : null;

  useEffect(() => {
    if (!inst.current.editor) return;
    inst.current.marker && inst.current.marker.clear();

    if (!step) return;
    const doc = inst.current.editor.getDoc();
    const loc = step.node.loc;
    if (loc) {
      inst.current.marker = doc.markText(
        { line: loc.start.line - 1, ch: loc.start.column },
        { line: loc.end.line - 1, ch: loc.end.column },
        {
          className: step.pre ? styles.markedPre : styles.markedPost
        }
      );
    }
  }, [inst, step]);

  return (
    <div>
      <div className={styles.code}>
        <CodeMirror
          className="editable"
          options={CM_OPTS}
          editorDidMount={editor => {
            inst.current.editor = editor;
          }}
          value={code}
          onBeforeChange={(editor, data, value) => {
            setCode(value || "");
          }}
        />
      </div>
      {(loading || error || history.length === 0) && (
        <hr className={styles.emptyDivider} />
      )}
      {loading && (
        <div className={styles.main}>
          <div className={styles.loading}>Loading...</div>
        </div>
      )}
      {error && (
        <div className={styles.main}>
          <div className={styles.error}>
            <p>Compile error: {error.message}</p>
          </div>
        </div>
      )}
      {value && history && (
        <div>
          <HistoryTimeline
            value={stepno}
            onChange={setStepno}
            history={history}
            runtimeError={value.runtimeError}
          />
          <div className={styles.main}>
            <div>
              <select
                value=""
                onChange={e => {
                  const preset = PRESETS.find(
                    ({ title }) => title === e.target.value
                  );
                  if (preset) setCode(preset.code);
                }}
              >
                <option value="">-- Select a code preset --</option>
                {PRESETS.map(({ title, code }) => (
                  <option key={title}>{title}</option>
                ))}
              </select>
              {" / "}
              <label>
                Expression detail?{" "}
                <input
                  type="checkbox"
                  checked={maxDetail === 2}
                  onChange={() => setMaxDetail(3 - maxDetail)}
                />
              </label>
              {" / "}
              <label>
                Show builtins?{" "}
                <input
                  type="checkbox"
                  checked={showBuiltins}
                  onChange={() => setShowBuiltins(!showBuiltins)}
                />
              </label>
            </div>
            {step && <Viz step={step} showBuiltins={showBuiltins} />}
            {value.runtimeError && (
              <div className={styles.error}>
                <p>Runtime error: {value.runtimeError.message}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
