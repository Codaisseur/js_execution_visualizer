import React, { useEffect, useRef, useMemo } from "react";
import createPersistedState from "use-persisted-state";
import CodeMirror from "./codemirror/codemirror";
import styles from "./App.module.scss";

import Viz from "./Viz";
import HistoryTimeline from "./HistoryTimeline";
import record from "./lib/record";

const usePersistedCode = createPersistedState("code");
const usePersistedMaxDetail = createPersistedState("maxdetail");
const usePersistedStepno = createPersistedState("stepno");

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
  const [code, setCode] = usePersistedCode(`let adj = "kind";
const f = a => {
  return thing => a + " " + adj + " " + thing;
};
const definite = f("the");
const s1 = definite("variable");
`);
  const { error, runtimeError, history } = useMemo(() => {
    try {
      return record(code);
    } catch (error) {
      return { error };
    }
  }, [code]);

  const [_stepno, setStepno] = usePersistedStepno(0);
  const [maxDetail, setMaxDetail] = usePersistedMaxDetail(2);

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
      <div className={styles.header}>
        <svg
          viewBox="7 7 30 30"
          aria-hidden="true"
          role="presentation"
          fill="none"
          className={styles.logo}
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M13.2723 15.4467C12.8235 15.0295 12.2255 14.8208 11.4788 14.8208C10.7396 14.8208 10.1421 15.0295 9.68529 15.4467C9.22843 15.8639 9 16.4089 9 17.0812C9 17.7618 9.23058 18.3189 9.69121 18.7522C10.1518 19.1855 10.7477 19.4022 11.4788 19.4022C12.2179 19.4022 12.8138 19.1877 13.2663 18.7582C13.7194 18.3289 13.9457 17.7699 13.9457 17.0812C13.9457 16.4089 13.721 15.8639 13.2723 15.4467ZM13.2841 24.2359C12.8273 23.819 12.2255 23.61 11.4788 23.61C10.7477 23.61 10.1518 23.8209 9.69121 24.2418C9.23058 24.6633 9 25.206 9 25.8702C9 26.543 9.23058 27.0959 9.69121 27.5294C10.1518 27.9624 10.7477 28.1791 11.4788 28.1791C12.2255 28.1791 12.8273 27.9645 13.2841 27.5354C13.741 27.106 13.9694 26.5511 13.9694 25.8702C13.9694 25.198 13.741 24.6534 13.2841 24.2359Z"
            fill="#c1272d"
          />
          <path
            d="M21.7333 21.4871C22.3453 21.8873 22.768 22.3537 23.0017 22.8849C23.2351 23.4157 23.352 24.33 23.352 25.6289V27.4133C23.352 28.2331 23.4188 28.7478 23.5529 28.9591C23.6868 29.17 23.9406 29.3126 24.3145 29.3873C24.404 29.411 24.5381 29.4352 24.7168 29.4591C25.6346 29.5941 26.0938 30.0355 26.0938 30.7829C26.0938 31.1491 25.9604 31.443 25.6934 31.666C25.4266 31.8885 25.0706 32 24.6259 32C24.0596 32 23.5116 31.9072 22.9818 31.7221C22.4519 31.5366 22.0131 31.2831 21.6654 30.9609C21.285 30.6143 21.0163 30.167 20.8587 29.6196C20.7008 29.0715 20.622 28.133 20.622 26.8041V25.3647C20.622 23.9068 19.9504 23.0681 18.608 22.8496C18.5513 22.8335 18.5109 22.8253 18.4867 22.8253C18.0984 22.76 17.8111 22.621 17.6251 22.4082C17.4391 22.1955 17.3462 21.8879 17.3462 21.4871C17.3462 21.1353 17.425 20.8573 17.5828 20.653C17.7404 20.4487 17.9932 20.3015 18.3411 20.2114C18.4946 20.1629 18.7172 20.1105 19.0083 20.0541C20.084 19.8523 20.622 19.0532 20.622 17.6567V16.216C20.622 14.9786 20.6827 14.1116 20.8038 13.614C20.9253 13.1168 21.1316 12.6822 21.4228 12.3099C21.7624 11.8976 22.2175 11.5763 22.7877 11.3458C23.3579 11.1153 23.9868 11 24.6742 11C25.103 11 25.4467 11.1115 25.7056 11.3342C25.9643 11.5571 26.0938 11.8506 26.0938 12.2152C26.0938 12.9769 25.6023 13.4346 24.6194 13.5884C24.5298 13.5967 24.4649 13.6047 24.4242 13.6128C24.0181 13.6773 23.7377 13.8246 23.5833 14.0548C23.429 14.2849 23.352 14.8075 23.352 15.6226V17.4024C23.352 18.6182 23.2309 19.5096 22.9894 20.077C22.748 20.6443 22.3291 21.1144 21.7333 21.4871Z"
            fill="#c1272d"
          />
          <path
            d="M30.0845 14.2755C30.0845 14.1493 30.1284 14.0404 30.2162 13.9488C30.3042 13.8574 30.4077 13.8115 30.5271 13.8115C30.8094 13.8115 31.1532 13.9678 31.5581 14.2802C31.9633 14.5925 32.3979 15.0393 32.8626 15.62C33.5719 16.5101 34.1054 17.4473 34.4634 18.4322C34.8211 19.4167 35.0001 20.4426 35.0001 21.5092C35.0001 22.6782 34.7835 23.8018 34.3504 24.881C33.9171 25.9603 33.2736 26.9768 32.4199 27.9298C32.0557 28.3335 31.7073 28.6451 31.3746 28.8627C31.0418 29.0806 30.753 29.1891 30.5082 29.1891C30.3951 29.1891 30.2963 29.1468 30.2115 29.0617C30.1268 28.9763 30.0845 28.8706 30.0845 28.7439C30.0845 28.6055 30.2377 28.2838 30.5443 27.7786C30.7693 27.4059 30.9443 27.103 31.0694 26.8695C31.5758 25.9225 31.9418 25.023 32.1668 24.171C32.3918 23.3187 32.5045 22.4321 32.5045 21.5092C32.5045 20.6824 32.414 19.8807 32.2326 19.1044C32.051 18.328 31.773 17.5547 31.3977 16.7845C31.1912 16.368 30.921 15.8804 30.5863 15.3218C30.2517 14.7631 30.0845 14.4143 30.0845 14.2755Z"
            fill="#c1272d"
          />
        </svg>
        A proof a concept JS execution visualization tool for teaching purposes
        <em>
          {" "}
          - click the timeline, then use your arrow keys (UI needs improvement
          :D)
        </em>{" "}
        <a href="https://github.com/Codaisseur/js_execution_visualizer">
          [repo]
        </a>
      </div>
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
      {(error || !visibleHistory) && <hr className={styles.emptyDivider} />}
      {error && (
        <div className={styles.main}>
          <div className={styles.error}>
            <p>Compile error: {error.message}</p>
          </div>
        </div>
      )}
      {visibleHistory && (
        <div>
          <HistoryTimeline
            value={stepno}
            onChange={setStepno}
            history={visibleHistory}
            runtimeError={runtimeError}
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
            {runtimeError && (
              <div className={styles.error}>
                <p>Runtime error: {runtimeError.message}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
