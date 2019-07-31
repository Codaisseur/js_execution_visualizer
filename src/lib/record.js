import { parse } from "@babel/parser";
import deepcopy from "deepcopy";
import { RuntimeError } from "./errors";
import { makeInitialContext } from "./context";
import { evaluate } from "./evaluate";

export default function(code) {
  const ast = parse(code);
  const context = makeInitialContext();
  context.sourceCode = code;
  const runtime = evaluate(ast, context);

  const history = [];
  let i = 0;
  try {
    for (let report of runtime) {
      if (!report.node._builtin) {
        history.push(deepcopy(report));
      }
      if (i++ > 1000) {
        console.error("too many steps", history);
        return { history, runtimeError: new Error("too many steps!") };
        // throw new Error("too many steps!");
      }
    }
  } catch (e) {
    if (e instanceof RuntimeError) {
      // noop
      console.log("caught runtime error:", e);
      return { history, runtimeError: e };
    } else throw e;
  }

  return { history };
}
