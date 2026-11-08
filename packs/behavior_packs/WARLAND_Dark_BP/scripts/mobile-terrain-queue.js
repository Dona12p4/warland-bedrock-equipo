// One adaptive Bedrock job, rather than one mandatory iteration per chunk job.
// Generators retain their original order, error handling and completion promises.
export function createTerrainQueue(system) {
  const queue = [];
  let running = false;
  return function enqueue(generator) {
    queue.push(generator);
    if (running) return;
    running = true;
    system.runJob((function* () {
      try {
        while (queue.length) yield* queue.shift();
      } finally {
        running = false;
      }
    })());
  };
}
