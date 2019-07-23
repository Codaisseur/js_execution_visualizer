import { parse } from "@babel/core";

// I'm gonna have to find a way to do this more elegantly/scalably :D

function processBuiltinAST(node) {
  delete node.loc;
  node._builtin = true;
  Object.values(node).forEach(maybeChildNode => {
    if (
      maybeChildNode &&
      typeof maybeChildNode === "object" &&
      "type" in maybeChildNode
    ) {
      processBuiltinAST(maybeChildNode);
    } else if (maybeChildNode && maybeChildNode.forEach) {
      maybeChildNode.forEach(processBuiltinAST);
    }
  });
  return node;
}

// ArrowFunctionExpression, why not
const _mapBuiltin = processBuiltinAST(
  parse(`callback => {
  const arr = [];
  for (let i = 0; i < this.length; i++) {
    arr.push(callback(this[i], i));
  }
  return arr;
}`).program.body[0].expression
);

// ArrowFunctionExpression, why not
const _filterBuiltin = processBuiltinAST(
  parse(`callback => {
  const arr = [];
  for (let i = 0; i < this.length; i++) {
    if (callback(this[i], i))
      arr.push(this[i]);
  }
  return arr;
}`).program.body[0].expression
);

// ArrowFunctionExpression, why not
// TODO without initial value
const _reduceBuiltin = processBuiltinAST(
  parse(`(callback, acc) => {
  for (let i = 0; i < this.length; i++) {
    acc = callback(acc, this[i], i);
  }
  return acc;
}`).program.body[0].expression
);

// ArrowFunctionExpression, why not
const _pushBuiltin = processBuiltinAST(
  parse(`x => {
  this[this.length] = x;
  this.length = this.length + 1;
  return this.length;
}`).program.body[0].expression
);

// ArrowFunctionExpression, why not
const _logBuiltin = processBuiltinAST(
  parse(`x => {
  __logs__.push(x);
}`).program.body[0].expression
);

export function makeInitialContext() {
  const builtin = {
    objects: []
  };

  const _log =
    builtin.objects.push({
      builtin: true,
      type: "function",
      body: _logBuiltin.body,
      params: _logBuiltin.params,
      source: "(builtin)"
    }) - 1;

  const _console =
    builtin.objects.push({
      builtin: true,
      type: "object",
      properties: {
        log: { name: "log", kind: "property", value: { object_ref: _log } }
      }
    }) - 1;

  const _Object =
    builtin.objects.push({ builtin: true, type: "object", properties: {} }) - 1;

  const _map =
    builtin.objects.push({
      builtin: true,
      type: "function",
      body: _mapBuiltin.body,
      params: _mapBuiltin.params,
      source: "(builtin)"
    }) - 1;

  const _filter =
    builtin.objects.push({
      builtin: true,
      type: "function",
      body: _filterBuiltin.body,
      params: _filterBuiltin.params,
      source: "(builtin)"
    }) - 1;

  const _reduce =
    builtin.objects.push({
      builtin: true,
      type: "function",
      body: _reduceBuiltin.body,
      params: _reduceBuiltin.params,
      source: "(builtin)"
    }) - 1;

  const _push =
    builtin.objects.push({
      builtin: true,
      type: "function",
      body: _pushBuiltin.body,
      params: _pushBuiltin.params,
      source: "(builtin)"
    }) - 1;

  const _Array =
    builtin.objects.push({
      builtin: true,
      type: "array",
      properties: {
        map: { name: "map", kind: "property", value: { object_ref: _map } },
        filter: {
          name: "filter",
          kind: "property",
          value: { object_ref: _filter }
        },
        reduce: {
          name: "reduce",
          kind: "property",
          value: { object_ref: _reduce }
        },
        push: { name: "push", kind: "property", value: { object_ref: _push } }
      },
      prototype: _Object
    }) - 1;

  const __logs__ = builtin.objects.push({
    builtin: true,
    type: "array",
    prototype: _Array,
    properties: {}
  });

  return {
    scopes: [
      {
        variables: {
          Object: {
            kind: "builtin",
            name: "Object",
            value: { object_ref: _Object }
          },
          Array: {
            kind: "builtin",
            name: "Array",
            value: { object_ref: _Array }
          },
          __logs__: {
            kind: "builtin",
            name: "__logs__",
            value: { object_ref: __logs__ }
          },
          console: {
            kind: "builtin",
            name: "console",
            value: { object_ref: _console }
          }
        },
        children: []
      }
    ],
    objects: builtin.objects,
    currentScope: 0,
    sourceCode: "",
    getSourceCodeRange(node) {
      if (node._builtin) {
        return "(builtin)";
      } else if (!node.loc) {
        return "(no loc)";
      } else {
        const loc = node.loc;
        const lines = this.sourceCode
          .split("\n")
          .slice(loc.start.line - 1, loc.end.line);

        if (lines.length === 1) {
          lines[0] = lines[0].slice(loc.start.column, loc.end.column);
        } else if (lines.length > 0) {
          lines[0] = lines[0].slice(loc.start.column);
          lines[lines.length - 1] = lines[lines.length - 1].slice(
            0,
            loc.end.column
          );
        }

        return lines.join("\n");
      }
    }
  };
}
