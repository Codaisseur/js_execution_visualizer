import React from "react";
import cx from "classnames";
import styles from "./Viz.module.scss";

export default function({ step: { node, context, pre, summary, detail } }) {
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
          />
        </div>
        <div className={styles.col}>
          {context.objects.map((obj, i) => {
            return (
              <div key={i}>
                <div>object #{i}</div>
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
  if (obj.type === "object") {
    return (
      <div className={styles.obj}>
        {Object.values(obj.properties).map((v, i) => (
          <Var key={i} v={v} />
        ))}
      </div>
    );
  } else if (obj.type === "array") {
    return (
      <div className={styles.obj}>
        {Object.values(obj.elements).map((value, i) => (
          <div key={i} className={styles.item}>
            <span className={styles.kind}>item</span> <Value value={value} />
          </div>
        ))}
        {Object.values(obj.properties).map((v, i) => (
          <Var key={i} v={v} />
        ))}
      </div>
    );
  } else {
    return null;
  }
}

function Scope({ context, scopeRef, current }) {
  const scope = context.scopes[scopeRef];
  const isCurrent = current === scopeRef;
  const vars = Object.values(scope.variables);

  return (
    <div
      className={cx({ [styles.scope]: true, [styles.isCurrent]: isCurrent })}
    >
      {vars.map((v, i) => (
        <Var key={i} v={v} />
      ))}
      {scope.children.map(childRef => (
        <div key={childRef}>
          <Scope context={context} scopeRef={childRef} current={current} />
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
  return value;
}
