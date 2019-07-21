import React from "react";
import cx from "classnames";
import styles from "./Viz.module.scss";

export default function({ step: { node, context, pre, summary, detail } }) {
  return (
    <div>
      <p>{summary}</p>
      <Scope context={context} scopeRef={0} current={context.currentScope} />
    </div>
  );
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
        <Scope
          key={childRef}
          context={context}
          scopeRef={childRef}
          current={current}
        />
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
  return value;
}
