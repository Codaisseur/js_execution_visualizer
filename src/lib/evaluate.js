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
  if (op === "<") return a < b;
  if (op === "<=") return a <= b;
  if (op === "==") return a == b;
  if (op === ">") return a > b;
  if (op === ">=") return a >= b;
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
  if (!skipScope) {
    const [blockScope, blockScopeRef] = makeNewScope(context);
    context = { ...context, currentScope: blockScopeRef };
  }

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
    value: returnValue.value
  };
  yield { context, node, summary: `computed return value`, detail: 1 };
  throw new Return(returnValue);
};

function makeNewScope(
  context,
  {
    parentScope = context.currentScope,
    _builtin = context.scopes[context.currentScope]._builtin
  } = {}
) {
  // Create an execution scope
  const scope = {
    parent: parentScope,
    _builtin,
    children: [],
    variables: {}
  };
  const scope_ref = context.scopes.push(scope) - 1;
  if (context.scopes[parentScope]) {
    context.scopes[parentScope].children.push(scope_ref);
  } // note: builtin methods don't have a defining scope

  return [scope, scope_ref];
}

function* invokeFunction(
  { definingScope, arrow, node },
  args,
  newThisBinding,
  context
) {
  // Create an execution scope
  const [executionScope, executionScopeRef] = makeNewScope(context, {
    parentScope: definingScope,
    _builtin: !!node.body._builtin // the !! is very important, not very elegant
  });

  // Apply new this binding
  if (newThisBinding) {
    executionScope.variables[newThisBinding.name] = newThisBinding;
  }

  // Populate with given arguments
  for (const [i, param] of node.params.entries()) {
    if (param.type !== "Identifier")
      throw new NotImplemented(
        `Sorry, can't deal with ${param.type} params yet :(`
      );

    executionScope.variables[param.name] = {
      name: param.name,
      kind: "param",
      value: args[i].value
    };
  }

  const executionContext = { ...context, currentScope: executionScopeRef };

  let returnValue;

  if (node.body.type === "BlockStatement") {
    returnValue = yield* Return.from(function*() {
      return yield* evaluate(node.body, executionContext, {
        skipScope: true
      });
    });
  } else {
    returnValue = yield* evaluate(node.body, executionContext);
  }

  // console.log("done executing function!", node._FRV, node._hasEscapes);
  if (!node._hasEscapes) {
    // console.log("definitely no escapes, freeing scope:", executionScopeRef);
    executionScope.freed = true;
    // const parentScope =
    //   context.scopes[context.scopes[executionScopeRef].parent];
    // parentScope.children.splice(
    //   parentScope.children.indexOf(executionScopeRef),
    //   1
    // );
    // delete context.scopes[executionScopeRef];
  }

  return returnValue;
}

evaluators.CallExpression = function*(node, context) {
  const { callee, arguments: argnodes } = node;
  yield { context, node, pre: true, summary: `evaluate call`, detail: 2 };

  // Second, lookup the function
  const fnValue = yield* evaluate(callee, context);
  if (!("object_ref" in fnValue.value))
    throw new RuntimeError(`Cannot call non-function #1`, callee);
  const fn = context.objects[fnValue.value.object_ref];
  if (!fn || fn.type !== "function")
    throw new RuntimeError(`Cannot call non-function #2`, callee);

  let newThisBinding;
  if (!fn.arrow) {
    if (callee.type === "MemberExpression") {
      // the object in the member expression, haha :D
      const { accessing_object_ref: object_ref } = fnValue;
      newThisBinding = { kind: "this", name: "this", value: { object_ref } };
    } else {
      newThisBinding = { kind: "this", name: "this", value: undefined };
    }
  }

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
  const ret = yield* invokeFunction(fn, args, newThisBinding, context);
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
    arrow: false,
    definingScope: context.currentScope,
    node,
    source: context.getSourceCodeRange(node),
    properties: {}
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
    prototype: context.scopes[0].variables.Object.value.object_ref,
    properties: {}
  };
  const object_ref = context.objects.push(obj) - 1;
  for (const property of node.properties) {
    yield* evaluate(property, context, { object_ref });
  }
  yield { context, node, summary: `evaluated obj expression`, detail: 2 };
  return { value: { object_ref } };
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
    prototype: context.scopes[0].variables.Array.value.object_ref,
    properties: {}
  };
  const object_ref = context.objects.push(arr) - 1;
  for (let i = 0; i < node.elements.length; i++) {
    arr.properties[i] = {
      name: i,
      kind: "property",
      value: (yield* evaluate(node.elements[i], context)).value
    };
  }
  arr.properties.length = {
    name: "length",
    kind: "property",
    value: node.elements.length
  };
  yield { context, node, summary: `evaluated array expression`, detail: 2 };
  return { value: { object_ref } };
};

evaluators.ArrowFunctionExpression = function*(node, context) {
  if (node.async || node.generator)
    throw new NotSupported(`Async and generator functions are not supported`);

  const fn = {
    type: "function",
    arrow: true,
    definingScope: context.currentScope,
    node,
    source: context.getSourceCodeRange(node),
    properties: {}
  };
  const object_ref = context.objects.push(fn) - 1;
  yield { context, node, summary: `evaluated arrow function`, detail: 2 };
  return { value: { object_ref } };
};

evaluators.UpdateExpression = function*(node, context) {
  const { operator, prefix, loc, argument } = node;

  if (operator !== "++" && operator !== "--") {
    throw new NotSupported(`update expression with operator ${operator}`);
  }

  yield {
    context,
    node,
    pre: true,
    summary: `evaluate update expression`,
    detail: 2
  };

  let result;
  if (prefix) {
    result = yield* evaluate(argument, context);
  }

  yield* evaluate(
    {
      type: "AssignmentExpression",
      _builtin: true,
      operator: "=",
      left: argument,
      right: {
        type: "BinaryExpression",
        _builtin: true,
        operator: operator[0],
        left: argument,
        right: {
          type: "NumericLiteral",
          _builtin: true,
          value: 1
        }
      }
    },
    context
  );

  if (!prefix) {
    result = yield* evaluate(argument, context);
  }

  yield { context, node, summary: `evaluated update expression`, detail: 2 };
  return result;
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
  const leftValue = (yield* evaluate(left, context)).value;
  if (node.operator === "&&" && !leftValue) return leftValue;
  if (node.operator === "||" && leftValue) return leftValue;
  const rightValue = (yield* evaluate(right, context)).value;
  yield {
    context,
    node,
    summary: `evaluated binary expression`,
    detail: 2
  };
  return { value: applyOperator(node.operator, leftValue, rightValue) };
};

evaluators.ThisExpression = function*(node, context) {
  return yield* evaluate(
    {
      ...node,
      type: "Identifier",
      name: "this"
    },
    context
  );
};

evaluators.Identifier = function*(node, context) {
  if (node.name === "undefined") {
    yield (context, { node, summary: `evaluated undefined`, detail: 2 });
    return { value: undefined };
  }

  const { site } = yield* locate(node, context);
  yield { context, node, summary: `evaluated variable`, detail: 2 };
  return { value: site.value };
};

evaluators.MemberExpression = function*(node, context) {
  const location = yield* locate(node, context);
  if (!location) {
    yield { context, node, summary: `property does not exist`, detail: 2 };
    return { value: undefined };
  }
  const { site, accessing_object_ref } = location;
  yield {
    context,
    node,
    summary: `evaluated property to ${site.value}`,
    detail: 2
  };
  return { value: site.value, accessing_object_ref };
};

evaluators.AssignmentExpression = function*(node, context) {
  const { left, right } = node;

  if (node.operator !== "=")
    throw new NotSupported(`assignment with operator ${node.operator}`);

  // yield ({context,  node, pre: true, summary: `assign ${left.name}`, detail: 2 });
  const { site } = yield* locate(left, context, { makeIfNonexistent: true });
  site.value = (yield* evaluate(right, context)).value;
  // yield ({context,  node, summary: `assigned ${left.name}`, detail: 2 });
};

function* checkForTest(test, context) {
  yield {
    context,
    node: test,
    pre: true,
    detail: 1,
    summary: `for test`
  };
  const { value } = yield* evaluate(test, context);
  yield {
    context,
    node: test,
    detail: 1,
    summary: `for test checked`
  };
  return value;
}

// (actually, es5 for-statements are way more complicated)
evaluators.ForStatement = function*(node, context) {
  const { init, test, update, body } = node;
  yield {
    context,
    node,
    pre: true,
    detail: 1,
    summary: `encountered for-loop`
  };
  const [forScope, forScopeRef] = makeNewScope(context);
  const scopedContext = { ...context, currentScope: forScopeRef };

  yield* evaluate(init, scopedContext);

  while (yield* checkForTest(test, scopedContext)) {
    yield* evaluate(body, scopedContext);
    yield {
      context,
      node: update,
      pre: true,
      detail: 1,
      summary: `for update`
    };
    yield* evaluate(update, scopedContext);
    yield {
      context,
      node: update,
      detail: 1,
      summary: `for update - done`
    };
  }

  yield {
    context,
    node,
    detail: 1,
    summary: `completed for-loop`
  };
};

evaluators.IfStatement = function*(node, context) {
  const { test, consequent, alternate } = node;
  yield {
    context,
    node,
    pre: true,
    detail: 1,
    summary: `encountered if-statement`
  };
  const [ifBodyScope, ifBodyScopeRef] = makeNewScope(context);
  const scopedContext = { ...context, currentScope: ifBodyScopeRef };

  const b = (yield* evaluate(test, scopedContext)).value;

  if (b) {
    yield* evaluate(consequent, scopedContext);
  } else if (alternate) {
    yield* evaluate(alternate, scopedContext);
  }

  yield {
    context,
    node,
    detail: 1,
    summary: `completed if-statement`
  };
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
    const value = (yield* evaluate(node.init, context)).value;
    scope.variables[name].value = value;
    yield { context, node, summary: `initialized ${name}`, detail: 2 };
  }
};

evaluators.NullLiteral = function*(node, context) {
  yield { context, node, summary: `evaluated null`, detail: 2 };
  return { value: null };
};

evaluators.StringLiteral = function*(node, context) {
  yield { context, node, summary: `evaluated "${node.value}"`, detail: 2 };
  return { value: node.value };
};

evaluators.NumericLiteral = function*(node, context) {
  yield { context, node, summary: `evaluated ${node.value}`, detail: 2 };
  return { value: node.value };
};

evaluators.BooleanLiteral = function*(node, context) {
  yield { context, node, summary: `evaluated ${node.value}`, detail: 2 };
  return { value: node.value };
};
