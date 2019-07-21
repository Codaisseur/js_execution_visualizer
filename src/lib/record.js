import { parse } from "@babel/parser";
import deepcopy from "deepcopy";
import { RuntimeError } from "./errors";
import { evaluate } from "./evaluate";

export default function(code) {
  const ast = parse(code);
  const runtime = evaluate(ast);

  const history = [];
  try {
    for (const report of runtime) {
      history.push(deepcopy(report));
      if (history.length > 100) {
        throw new Error("too many steps!");
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
