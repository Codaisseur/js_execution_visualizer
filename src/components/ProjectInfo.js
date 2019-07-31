import React from "react";
import "katex/dist/katex.min.css";
import { InlineMath, BlockMath } from "react-katex";
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
        <p>
          Built at <a href="https://codaisseur.com">Codaisseur</a>.
        </p>

        <h2>TODO</h2>
        <p>Any help is appreciated, BTW!</p>
        <p>
          Make <input type="checkbox" checked={false} /> a small garbage
          collector for the object graphs and{" "}
          <input type="checkbox" checked={true} />
          (actually more important) an escape analysis for the scope tree. It's
          daunting to see all those dangling execution scopes lying around that
          really are just regular stack frames because no variables escaped.
        </p>
        <p>
          <input type="checkbox" checked={false} /> Make a visually pleasing and
          guiding object reference graph / scope tree, a better history
          scrubber, and other UI work.
        </p>
        <p>
          <input type="checkbox" checked={false} /> Implement more of the
          language. The aim is not to implement a complete JavaScript runtime,
          and neither to make it performant. Rather we just need to support best
          practices and most often used functionality. The tool is only meant
          for teaching purposes, and aimed at beginners. If the codebase is
          readable, that's a bonus for students interested in how the JavaScript
          runtime operates.
        </p>
        <p>
          <input type="checkbox" checked={false} /> Devise the criteria needed
          to filter the history nodes according to a multi-level detail
          configuration option. My initial idea was to just select
          statement-level nodes, or all nodes, but this doesn't work for
          visualizing function calls, single-expression map/filter/reduce
          computations, etc. Possible factors might include: AST node type,
          nesting depth of AST node, etc.
        </p>
        <p>
          <input type="checkbox" checked={false} /> Make a configurable "widget"
          version of smaller size, so that it can be embedded in the teaching
          materials in various forms. For example, as part of
          prediction-exercises.
        </p>

        <h2>Technical details</h2>
        <p>
          Original idea, motivation and background can be found @{" "}
          <a href="https://github.com/Codaisseur/visualized-execution">
            https://github.com/Codaisseur/visualized-execution
          </a>
        </p>

        <h3>High-level overview</h3>
        <p>
          A very straight-to-the-point recursive implementation based on the
          parsed AST, so that the code is essentially split into a collection of
          functions, each performing the necessary steps for a particular node
          type. But, there are actually <em>two</em> (mutually) recursive
          functions:
        </p>
        <ul>
          <li>
            <code>evaluate</code> &mdash; This is the "actual" implementation,
            which both executes and evaluates a node in a context.
          </li>
          <li>
            <code>locate</code> &mdash; This is a helper function that is only
            defines on the subset of the syntax that is used to reference
            variables and attributes (members). It doesn't evaluate a variable
            (or member) expression to it's value, but rather to information
            about the scope or object in which it is defined.
          </li>
        </ul>
        <p>
          Both functions are in fact defined as <em>generator functions</em>,
          which don't compute directly, but rather return a "computation
          stepping" generator. This "trick" enables a easy way to "report" on
          the intermediate steps through <code>yield</code>s.
        </p>

        <h3>Escape analysis</h3>
        <p>
          A <em>static</em> escape analysis is used to remove dangling execution
          scopes from the visualization. Static, because we determine whether a
          scope is definitely escape-free based on a purely lexical analysis. It
          can happen that certain scopes are not marked escape-free that in fact
          are due to runtime considerations, but those are left out.
        </p>
        <p>
          A scope might have an escaping variable, if one of its subscopes has
          one, or one of its own variables has possibly escaped:
        </p>
        <BlockMath
          math={String.raw`
            \textrm{Escape}(S)
            ~\Leftrightarrow~
            \exists_{v \in S} \big[
              \textrm{Escape}(v, S)
            \big]
            \lor
            \exists_{S' \in S} \big[
              \textrm{Escape}(S')
            \big]
          `}
        />
        <p>
          A variable can only escape via a function (though maybe nested
          arbitrarily deep) within that scope, which in which that variable
          occurs:
        </p>
        <BlockMath
          math={String.raw`
            \textrm{Escape}(v, S)
            ~\Leftrightarrow~
            \exists_{f \in S} \big[
              v \in \textrm{FV}(f)
            \big]
            \lor
            \exists_{S' \in S} \big[
              \textrm{Escape}(v, S')
            \big]
          `}
        />
        <p>
          The static analysis is done (quirckily) in{" "}
          <code>src/lib/performEscapeAnalysis.js</code>, and cleaning up the
          execution scope of a function is done after function execution ends,
          in the <code>invokeFunction</code> function in the evaluator.
        </p>

        <h3>Garbage collection</h3>
        <p>TODO</p>

        <h3>Object viz graph</h3>
        <p>TODO</p>
      </div>
    </div>
  );
}
