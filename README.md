
# Visualizing JS execution

## Brief sketch of the idea

**A steppable visualization of JS execution**. Scopes and object references and the like. Aimed at teaching purposes only, not correctness. Multiple levels of detail: expression-detail vs statement-detail, and possibly max depth configs for jumping into function calls / certain block statements...

## Why?

Because getting a feel for how a computer operates is essential. I'm not sure / convinced a fine-detailed JS execution stepper is necessarily the right tool to do this for everyone, at every level. But I do think there can be benefits to a configurable, simple-to-use tool:
- for certain students, that don't naturally tend to think this way (I've had a few smart students, graduated, who just didn't naturally get the hang of execution stepping)
- for certain situations (i.e. when explaining map/reduce/filter, or when explaining objects being passed by reference and mutation problems arising there)
- for code result prediction-based exercises: the student predicts what result a piece of code will result in, and on failure gets to see why/how (and somehow recover -- possible idea: each time the student guesses wrong, a next (interesting) execution step is revealed?)

## What should it be?

- configurable down to a "basics" version, e.g. with only statement-level stepping and object reference diagrams, nothing more;
- (relatively) easy to understand by looking at it, i.e. visually informative and pleasing

## Implementation details

- Necessarily means a full computation of code, because e.g. it has to figure out the actual number of execution iterations in a for loop.
- Straight-to-the-point implementation: babel AST output node types are mapped pretty much directly onto execution mechanisms. These mechanisms are generator functions, which are just functions that operate on an execution context, but because they're generators enable an elegant report-yielding API while stepping through the execution process of the node in question.
- These intermediate (yielded) reports can be anything, but for now are objects of the shape `{ context, node, summary, pre, detail }`. The `pre` denotes a pre-evaluation step, which can be essential for visualization purposes, the `summary` a textual description, and the `detail` a number indicating whether it's a expression/statement.

  For example, the `NumericLiteral` executor looks like this:
  ```js
  evaluators.NumericLiteral = function* (node, context) {
    yield ({ context, node, detail: 2, summary: "evaluated number " + node.value });
    return node.value;
  }
  ```
- Not making any efforts to make these generator functions operate on the context in an immutable way, because that can just as well be achieved by a wrapper that, while stepping through the obtainer generator, use proxying library like Immer, or just deep copying, to record a history.
- _(possibly a temporary choice)_ Normalized execution context:
  ```ts
  type Context = {
    scopes: Scope[];
    objects: Obj[];
    currentScope: scope_ref; // index
  }
  ```

## Previous work

- http://pythontutor.com/visualize.html
- https://tylermcginnis.com/javascript-visualizer/ [also see the [github repo](https://github.com/tylermcginnis/javascriptvisualizer)]
- http://latentflip.com/loupe/
- https://github.com/brendan-w/execute-js
- [interpreter] https://github.com/NeilFraser/JS-Interpreter

**Why? Does it improve?** Not sure if it'll improve. Tyler's viz is just excellent, and beautiful as well. It has closure scopes too, which Pythontutor does not. So probs my version is going to be _strictly worse_ than Tyler's :P (In correctness and looks.) But there are a few ways in which I might be adding:
- ES6 support (But then because my app is educational, I'm actually stripping things like `var`... So our syntaxes will be non-overlapping, haha...)
- More configurable in what's included in execution history. I generate "flat" report objects to history, which can be filtered all kinds of ways, incl. detail but also including pre/post execution, specific nodes, etc.
- Ah, and where Pythontutor does not have closure scopes, Tyler's viz does not have an object reference graph. I'll have both :D