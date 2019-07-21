import { NotImplemented, NotSupported, RuntimeError } from "./errors";
import { makeInitialContext } from "./context";
import { Return } from "./return";
import { locate } from "./locate";

export const evaluators = {};

export function* evaluate(
  node,
  context = makeInitialContext(),
  namedArgs = {}
) {
  const evaluator = evaluators[node.type];
  if (!evaluator) {
    console.error(
      `Couldn't find evaluator for AST node of type: ${node.type}`,
      node
    );
    throw new NotImplemented(
      `Couldn't find evaluator for AST node of type: ${node.type}`
    );
  }
  return yield* evaluator(node, context, namedArgs);
}

function applyOperator(op, a, b) {
  if (op === "+") return a + b;
  if (op === "-") return a - b;
  if (op === "*") return a * b;
  if (op === "&&") return a && b;
  if (op === "||") return a || b;
  throw new NotImplemented(`operator not implemented: ${op}`);
}

evaluators.File = function*(node, context) {
  yield* evaluate(node.program, context);
};

evaluators.Program = function*(node, context) {
  // TODO actually extract function definitions etc.
  for (const statement of node.body) {
    yield* evaluate(statement, context);
  }
};

evaluators.BlockStatement = function*(node, context, { skipScope }) {
  // TODO make new scope instead if `skip_scope` set
  for (const statement of node.body) {
    yield* evaluate(statement, context);
  }
};

evaluators.ReturnStatement = function*(node, context) {
  yield {
    context,
    node,
    pre: true,
    summary: `compute return value`,
    detail: 1
  };
  const returnValue = yield* evaluate(node.argument, context);
  context.scopes[context.currentScope].variables["[[return]]"] = {
    kind: "return",
    value: returnValue
  };
  yield { context, node, summary: `computed return value`, detail: 1 };
  throw new Return(returnValue);
};

function* invokeFunction({ definingScope, params, body }, args, context) {
  // Create an execution scope
  const executionScope = {
    parent: definingScope,
    children: [],
    variables: {}
  };
  const scope_ref = context.scopes.push(executionScope) - 1;
  context.scopes[definingScope].children.push(scope_ref);

  // Populate with given arguments
  for (const [i, param] of params.entries()) {
    if (param.type !== "Identifier")
      throw new NotImplemented(
        `Sorry, can't deal with ${param.type} params yet :(`
      );

    executionScope.variables[param.name] = {
      name: param.name,
      kind: "param",
      value: args[i]
    };
  }

  const executionContext = { ...context, currentScope: scope_ref };
  if (body.type === "BlockStatement") {
    return yield* Return.from(function*() {
      return yield* evaluate(body, executionContext, {
        skipScope: true
      });
    });
  } else {
    return yield* evaluate(body, executionContext);
  }
}

evaluators.CallExpression = function*(node, context) {
  const { callee, arguments: argnodes } = node;
  yield { context, node, pre: true, summary: `evaluate call`, detail: 2 };

  // Second, lookup the function
  const fnValue = yield* evaluate(callee, context);
  if (!("object_ref" in fnValue))
    throw new RuntimeError(`Cannot call non-function #1`, callee);
  const fn = context.objects[fnValue.object_ref];
  if (!fn || fn.type !== "function")
    throw new RuntimeError(`Cannot call non-function #2`, callee);

  // First, evaluate arguments
  const args = [];
  for (const argnode of argnodes) {
    args.push(yield* evaluate(argnode, context));
  }

  // Finally, invoke the function
  yield {
    context,
    node,
    pre: true,
    summary: `invoke function`,
    detail: 2
  };
  const ret = yield* invokeFunction(fn, args, context);
  yield { context, node, summary: `evaluated call`, detail: 2 };
  return ret;
};

evaluators.FunctionDeclaration = function*(node, context) {
  if (node.async || node.generator)
    throw new NotSupported(`Async and generator functions are not supported`);
  if (!node.id || node.id.type !== "Identifier")
    throw new RuntimeError(`should not happen`, node.id);

  yield {
    context,
    node,
    pre: true,
    summary: `declare function ${node.id.name}`,
    detail: 1
  };
  const scope = context.scopes[context.currentScope];
  const fn = {
    type: "function",
    definingScope: context.currentScope,
    params: node.params,
    body: node.body
  };
  const object_ref = context.objects.push(fn) - 1;
  scope.variables[node.id.name] = {
    name: node.id.name,
    kind: "fundecl",
    value: { object_ref }
  };
  yield {
    context,
    node,
    summary: `declared function ${node.id.name}`,
    detail: 1
  };
};

evaluators.ObjectProperty = function*(node, context, { object_ref }) {
  const { key } = node;
  if (key.type !== "Identifier")
    throw new NotImplemented(
      `Computed or otherwise property keys are sadly not implemented yet :(`
    );

  const obj = context.objects[object_ref];
  const value = yield* evaluate(node.value, context);
  obj.properties[key.name] = { name: key.name, kind: "property", value };
};

evaluators.ObjectExpression = function*(node, context) {
  yield {
    context,
    node,
    pre: true,
    summary: `evaluate obj expression`,
    detail: 2
  };
  const obj = {
    type: "object",
    properties: {}
  };
  const object_ref = context.objects.push(obj) - 1;
  for (const property of node.properties) {
    yield* evaluate(property, context, { object_ref });
  }
  yield { context, node, summary: `evaluated obj expression`, detail: 2 };
  return { object_ref };
};

evaluators.ArrayExpression = function*(node, context) {
  yield {
    context,
    node,
    pre: true,
    summary: `evaluate array expression`,
    detail: 2
  };
  const arr = {
    type: "array",
    properties: {},
    elements: []
  };
  const object_ref = context.objects.push(arr) - 1;
  for (const el of node.elements) {
    arr.elements.push(yield* evaluate(el, context));
  }
  yield { context, node, summary: `evaluated array expression`, detail: 2 };
  return { object_ref };
};

evaluators.ArrowFunctionExpression = function*(node, context) {
  if (node.async || node.generator)
    throw new NotSupported(`Async and generator functions are not supported`);

  const fn = {
    type: "function",
    definingScope: context.currentScope,
    params: node.params,
    body: node.body
  };
  const object_ref = context.objects.push(fn) - 1;
  yield { context, node, summary: `evaluated arrow function`, detail: 2 };
  return { object_ref };
};

evaluators.BinaryExpression = function*(node, context) {
  const { left, right } = node;
  yield {
    context,
    node,
    pre: true,
    summary: `evaluate binary expression`,
    detail: 2
  };
  const leftValue = yield* evaluate(left, context);
  if (node.operator === "&&" && !leftValue) return leftValue;
  if (node.operator === "||" && leftValue) return leftValue;
  const rightValue = yield* evaluate(right, context);
  yield {
    context,
    node,
    summary: `evaluated binary expression`,
    detail: 2
  };
  return applyOperator(node.operator, leftValue, rightValue);
};

evaluators.Identifier = function*(node, context) {
  if (node.name === "undefined") {
    yield (context, { node, summary: `evaluated undefined`, detail: 2 });
    return undefined;
  }

  const { site } = yield* locate(node, context);
  yield { context, node, summary: `evaluated variable`, detail: 2 };
  return site.value;
};

evaluators.MemberExpression = function*(node, context) {
  const location = yield* locate(node, context);
  if (!location) {
    throw new RuntimeError(`member does not exist`, node);
  }
  const { site } = location;
  yield { context, node, summary: `evaluated property`, detail: 2 };
  return site.value;
};

evaluators.AssignmentExpression = function*(node, context) {
  const { left, right } = node;

  // yield ({context,  node, pre: true, summary: `assign ${left.name}`, detail: 2 });
  const { site } = yield* locate(left, context, { makeIfNonexistent: true });
  site.value = yield* evaluate(right, context);
  // yield ({context,  node, summary: `assigned ${left.name}`, detail: 2 });
};

evaluators.ExpressionStatement = function*(node, context) {
  yield {
    context,
    node,
    pre: true,
    summary: `compute expression statement`,
    detail: 1
  };
  yield* evaluate(node.expression, context);
  yield {
    context,
    node,
    summary: `computed expression statement`,
    detail: 1
  };
};

evaluators.VariableDeclaration = function*(node, context) {
  const kind = node.kind;
  yield {
    context,
    node,
    pre: true,
    summary: `${kind} variable declaration`,
    detail: 1
  };
  for (const declaration of node.declarations) {
    yield* evaluate(declaration, context, { kind });
  }
  yield {
    context,
    node,
    summary: `completed ${kind} variable declaration`,
    detail: 1
  };
};

evaluators.VariableDeclarator = function*(node, context, { kind }) {
  if (kind !== "let" && kind !== "const")
    throw new NotSupported(`only let/const supported, not ${kind}`);
  if (node.id.type !== "Identifier")
    throw new NotImplemented(`Not yet able to declare non-identifiers :(`);

  const scope = context.scopes[context.currentScope];
  const name = node.id.name;
  scope.variables[name] = { name, kind };
  yield { context, node: node.id, summary: `declared ${name}`, detail: 2 };
  if (node.init) {
    const value = yield* evaluate(node.init, context);
    scope.variables[name].value = value;
    yield { context, node, summary: `initialized ${name}`, detail: 2 };
  }
};

evaluators.NullLiteral = function*(node, context) {
  yield { context, node, summary: `evaluated null`, detail: 2 };
  return null;
};

evaluators.StringLiteral = function*(node, context) {
  yield { context, node, summary: `evaluated "${node.value}"`, detail: 2 };
  return node.value;
};

evaluators.NumericLiteral = function*(node, context) {
  yield { context, node, summary: `evaluated ${node.value}`, detail: 2 };
  return node.value;
};

evaluators.BooleanLiteral = function*(node, context) {
  yield { context, node, summary: `evaluated ${node.value}`, detail: 2 };
  return node.value;
};
