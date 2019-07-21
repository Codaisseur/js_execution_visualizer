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
