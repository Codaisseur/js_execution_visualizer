export class NotImplemented extends Error {}
export class NotSupported extends Error {}

export class RuntimeError extends Error {
  constructor(message, node) {
    super(
      `${message} (${node.type} @ ${node.loc.start.line}:${
        node.loc.start.column
      })`
    );
  }
}
