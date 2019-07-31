import traverse from "@babel/traverse";
// import * as t from "@babel/types";

/*
For sure this is a bit of a quircky analysis technique :D
I would'ave written it otherwise, but I'm still getting used
 to the weirdly specific, powerful but idiosyncratic Babel API.

The idea:
- Find all *references* variables (`Identifier`s), and for each:
  - Recursively loop up the function nesting tree, and each
      time we hit a function that doesn't define this binding,
      register this "Free Referenced Variable" on the fn node,
      for future reference.

What's missing:
- Block scopes (e.g. in a for-loop) need the same kind of escape
    analysis as function scopes, but we're not currently doing this.
- Let and const binding defining order?
*/
export default function performEscapeAnalysis(ast) {
  // console.log("performEscapeAnalysis");
  traverse(ast, {
    Identifier(path) {
      if (path.isReferencedIdentifier()) {
        const variableName = path.node.name;
        let i = 0;
        while ((path = path.getFunctionParent())) {
          if (!path.scope.bindings[variableName]) {
            path.node._FRV = path.node._FRV || {};
            path.node._FRV[variableName] = true;
            // console.log("variable not owned by fn:", variableName, path, i);
          } else {
            path.node._hasEscapes = path.node._hasEscapes || i > 0;
            // console.log("found ref variable binding:", variableName, path, i);
            break;
          }
          i++;
        }
      }
    }
  });
}
