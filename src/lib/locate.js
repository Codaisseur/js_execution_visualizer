import { NotImplemented, RuntimeError } from "./errors";
import { evaluate } from "./evaluate";

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
  const object = context.objects[object_ref];
  if (object.properties[name]) {
    return object_ref;
  } else if (object.prototype !== undefined) {
    return lookupProperty(context, name, object.prototype);
  } else {
    return null;
  }
}

export const locators = {};

// locate: (Node, Context) => { scope_ref|object_ref, name, site }
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

locators.Identifier = function*(node, context) {
  const defining_scope_ref = lookup(context, node.name, context.currentScope);
  if (defining_scope_ref === null)
    throw new RuntimeError(
      `variable ${node.name} is not defined [lookup identifier]`
    );

  yield {
    context,
    node,
    summary: `looked up variable ${node.name}`,
    detail: 2
  };
  return {
    scope_ref: defining_scope_ref,
    name: node.name,
    site: context.scopes[defining_scope_ref].variables[node.name]
  };
};

locators.MemberExpression = function*(node, context) {
  const objectValue = yield* evaluate(node.object, context);
  if (typeof objectValue !== "object" || !("object_ref" in objectValue))
    // (actually, you can do things like `(2).toFixed(2)`)
    throw new RuntimeError("cannot use memberexpression for non-object");

  if (node.property.type !== "Identifier") throw new NotImplemented();

  const { object_ref } = objectValue;
  const defining_object_ref = lookupProperty(
    context,
    node.property.name,
    object_ref
  );

  yield {
    context,
    node,
    summary: `looked up property ${node.name}`,
    detail: 2
  };
  return {
    object_ref: defining_object_ref,
    name: node.property.name,
    site: context.objects[defining_object_ref].properties[node.property.name]
  };
};
