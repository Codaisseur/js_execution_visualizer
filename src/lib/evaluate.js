export class NotImplemented extends Error {}
export class NotSupported extends Error {}
export class RuntimeError extends Error {}

function lookup(context, name, ref) {
  const scope = context.scopes[ref];
  if (scope.variables[name]) {
    return ref;
  } else if (scope.parent !== undefined) {
    return lookup(context, name, scope.parent);
  } else {
    return null;
  }
}

function lookupProperty(context, name, object_ref) {
  const object = context.object[object_ref];
  if (object.properties[name]) {
    return object_ref;
  } else if (object.prototype !== undefined) {
    return lookupProperty(context, name, object.prototype);
  } else {
    return null;
  }
}

export function makeInitialContext() {
  return {
    scopes: [{ variables: {}, children: [] }],
    objects: [],
    currentScope: 0
  };
}

export class Return {
  constructor(value) {
    this.value = value;
  }
}

// Returning from a block of code is somewhat
//  uncompositional. The simplest way to deal
//  with it, instead of expanding the semantics,
//  is leveraging the fact that the interpreter
//  language, i.e. JS, already has this kind of
//  non-local flow feature in the form of throwing
//  :D
Return.from = function*(mkgen) {
  try {
    return yield* mkgen();
  } catch (e) {
    if (e instanceof Return) {
      return e.value;
    } else {
      throw e;
    }
  }
};

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

export const locators = {};

export function* locate(node, context, namedArgs = {}) {
  const locator = locators[node.type];
  if (!locator) {
    console.error(
      `Couldn't find locator for AST node of type: ${node.type}`,
      node
    );
    throw new NotImplemented(
      `Couldn't find locator for AST node of type: ${node.type}`
    );
  }
  return yield* locator(node, context, namedArgs);
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
    throw new RuntimeError(`Cannot call non-function #1`);
  const fn = context.objects[fnValue.object_ref];
  if (!fn || fn.type !== "function")
    throw new RuntimeError(`Cannot call non-function #2`);

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
    throw new RuntimeError(`should not happen`);

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

locators.Identifier = function*(node, context) {
  const defining_scope_ref = lookup(context, node.name, context.currentScope);
  if (defining_scope_ref === null)
    throw new RuntimeError(
      `variable ${node.name} is not defined [lookup identifier]`
    );

  yield { context, node, summary: `looked up ${node.name}`, detail: 2 };
  return {
    scope_ref: defining_scope_ref,
    name: node.name,
    site: context.scopes[defining_scope_ref].variables[node.name]
  };
};

// (b) evaluate identifier as value (more common)
evaluators.Identifier = function*(node, context) {
  if (node.name === "undefined") {
    yield (context, { node, summary: `evaluated undefined`, detail: 2 });
    return undefined;
  } else {
    const defining_scope_ref = lookup(context, node.name, context.currentScope);
    if (defining_scope_ref === null) {
      throw new RuntimeError(
        `variable ${node.name} is not defined [eval identifier]`
      );
    }

    yield { context, node, summary: `looked up ${node.name}`, detail: 2 };
    return context.scopes[defining_scope_ref].variables[node.name].value;
  }
};

// evaluators.MemberExpression = function* (node, context, { log }) {
//   const { computed, object, property } = node;
//   const obj = yield* evaluate(object, context, { log });

//   let propertyName;
//   if (computed) {
//     propertyName = yield* evaluate();
//   } else {
//     if (property.type !== "Identifier") throw new Error("should not happen");
//     propertyName = property.name;
//   }
//   const defining_object_ref = lookupProperty(context, propertyName);
//   if (defining_object_ref === null)
//     throw new RuntimeError(`property ${node.name} not found`);

//   yield (context, { node, summary: `looked up property ${propertyName}`, detail: 2 });
//   return {
//     object_ref: defining_object_ref,
//     name: propertyName,
//     site: context.objects[defining_object_ref].properties[propertyName]
//   };
// };

evaluators.AssignmentExpression = function*(node, context) {
  const { left, right } = node;

  // yield ({context,  node, pre: true, summary: `assign ${left.name}`, detail: 2 });
  const { site } = yield* locate(left, context);
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
