import React, { useState } from "react";
import cx from "classnames";
import styles from "./Viz.module.scss";

export default function Viz({
  step: { node, context, pre, summary, detail },
  showBuiltins
}) {
  return (
    <div>
      <p>
        <em>{summary}</em>
      </p>
      <div className={styles.split}>
        <div className={styles.col}>
          <Scope
            context={context}
            scopeRef={0}
            current={context.currentScope}
            showBuiltins={showBuiltins}
          />
        </div>
        <div className={styles.col}>
          {context.objects
            .filter(o => showBuiltins || !o.builtin)
            .map((obj, i) => {
              return (
                <div key={i} style={{ marginBottom: ".4rem" }}>
                  <div>
                    object #{i} - {obj.type}
                  </div>
                  <Obj obj={obj} />
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function Obj({ obj }) {
  const [showBody, set_showBody] = useState(true);

  return (
    <div className={styles.obj}>
      {/* {obj.type === "array" && (
        <>
          {Object.values(obj.elements).map((value, i) => (
            <div key={i} className={styles.item}>
              <span className={styles.kind}>item</span> <Value value={value} />
            </div>
          ))}
        </>
      )} */}
      {obj.type === "function" && (
        <>
          <div className={styles.item}>
            <span
              className={styles.kind}
              style={{ cursor: "pointer" }}
              onClick={() => set_showBody(!showBody)}
            >
              {showBody ? "hide" : "show"} body
            </span>{" "}
            {showBody && (
              <pre
                style={{
                  margin: "0 0 0 .4rem",
                  display: "inline-block",
                  verticalAlign: "text-top"
                }}
              >
                {obj.source}
              </pre>
            )}
          </div>
        </>
      )}
      {Object.values(obj.properties || {}).map((v, i) => (
        <Var key={i} v={v} />
      ))}
    </div>
  );
}

function Scope({ context, scopeRef, current, showBuiltins }) {
  const scope = context.scopes[scopeRef];
  const isCurrent = current === scopeRef;
  const vars = Object.values(scope.variables);

  if (!showBuiltins && scope._builtin) return null;

  return (
    <div
      className={cx({ [styles.scope]: true, [styles.isCurrent]: isCurrent })}
    >
      {vars
        .filter(v => showBuiltins || v.kind !== "builtin")
        .map((v, i) => (
          <Var key={i} v={v} />
        ))}
      {scope.children.map(childRef => (
        <div key={childRef}>
          <Scope
            context={context}
            scopeRef={childRef}
            current={current}
            showBuiltins={showBuiltins}
          />
        </div>
      ))}
    </div>
  );
}

function Var({ v: { kind, name, value } }) {
  return (
    <div className={styles.var}>
      <span className={styles.kind}>{kind}</span> {name}{" "}
      {value !== undefined && (
        <span>
          {kind === "return" ? `` : `= `}
          <Value value={value} />
        </span>
      )}
    </div>
  );
}

function Value({ value }) {
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "object" && "object_ref" in value)
    return `object #${value.object_ref}`;
  if (typeof value === "boolean") return `${value}`;
  if (typeof value === "object") {
    console.log("object value???", value);
    return "???";
  }
  return value;
}
