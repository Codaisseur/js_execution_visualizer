import React from "react";
import styles from "./ProjectInfo.module.scss";

export default function ProjectInfo() {
  return (
    <div className="wrap">
      <div className={styles.ProjectInfo}>
        <h2>What am I looking at?</h2>
        <p>
          <strong>A steppable visualization of JS execution.</strong>
        </p>
        <p>
          Scopes, references and execution flow can be visually tracked, and
          while doing this the relevant syntax is broken down to its tree
          structure of statements and expressions.{" "}
        </p>
        <p>
          This can help people new to programming to understand the{" "}
          <em>mechanical</em> and <em>structured</em> way the computer works
          when it executes JavaScript code.
        </p>

        <h3>TODO</h3>
        <p>Any help is appreciated, BTW!</p>
        <p>
          <input type="checkbox" checked={false} />
          &nbsp; Make a small garbage collector for the object graphs, and/or
          (actually more important) escape analysis for the scope tree. It's
          daunting to see all those dangling execution scopes lying around that
          really are just regular stack frames because no variables escaped.
        </p>
        <p>
          <input type="checkbox" checked={false} />
          &nbsp; Make a visually pleasing and guiding object reference graph /
          scope tree, a better history scrubber, and other UI work.
        </p>
        <p>
          <input type="checkbox" checked={false} />
          &nbsp; Implement more of the language. The aim is not to implement a
          complete JavaScript runtime, and neither to make it performant. Rather
          we just need to support best practices and most often used
          functionality. The tool is only meant for teaching purposes, and aimed
          at beginners. If the codebase is readable, that's a bonus for students
          interested in how the JavaScript runtime operates.
        </p>
        <p>
          <input type="checkbox" checked={false} />
          &nbsp; Devise the criteria needed to filter the history nodes
          according to a multi-level detail configuration option. My initial
          idea was to just select statement-level nodes, or all nodes, but this
          doesn't work for visualizing function calls, single-expression
          map/filter/reduce computations, etc. Possible factors might include:
          AST node type, nesting depth of AST node, etc.
        </p>
        <p>
          <input type="checkbox" checked={false} />
          &nbsp; Make a configurable "widget" version of smaller size, so that
          it can be embedded in the teaching materials in various forms. For
          example, as part of prediction-exercises.
        </p>

        <h3>Technical details</h3>
        <p>
          Can be found @{" "}
          <a href="https://github.com/Codaisseur/visualized-execution">
            https://github.com/Codaisseur/visualized-execution
          </a>
        </p>
      </div>
    </div>
  );
}
