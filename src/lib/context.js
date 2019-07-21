export function makeInitialContext() {
  return {
    scopes: [{ variables: {}, children: [] }],
    objects: [],
    currentScope: 0
  };
}
