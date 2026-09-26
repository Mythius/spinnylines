// Runs the solver and generator off the page's thread so the editor stays responsive.
importScripts("puzzle.js", "solver.js", "generator.js");

onmessage = e => {
    let { type, level, params, limit } = e.data;
    if (type == "count") postMessage({ type, result: analyzeLevel(level, limit) });
    if (type == "generate") postMessage({ type, result: generateLevel(params) });
};
