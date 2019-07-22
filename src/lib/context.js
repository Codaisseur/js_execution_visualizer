export function makeInitialContext() {
  return {
    scopes: [{ variables: {}, children: [] }],
    objects: [],
    currentScope: 0,
    sourceCode: "",
    getSourceCodeRange(loc) {
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
  };
}
