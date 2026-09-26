// Random level generator. Routes a winding path from each source to its goal
// (crossing other colors with X and C, splitting with T), then fills the other
// cells with decoys the solution never reaches. Needs puzzle.js, and
// solver.js when unique levels are asked for.
//
// params: {
//   width, height,
//   colors,       how many sources (each a different color)
//   splits,       how many of those colors feed two goals
//   minLength,    shortest path from a source to its first goal
//   tray,         path pieces moved into the tray
//   gaps,         extra empty gaps as decoys
//   fill,         fill unused cells with decoy pieces (otherwise leave them empty)
//   unique,       keep trying until every solution uses the written paths
//   timeLimit,    milliseconds to keep trying
// }

const GEN_DECOYS = ["I", "L", "U", "T", "T", "X", "C", "L"];
const GEN_DX = [0, 1, 0, -1];
const GEN_DY = [-1, 0, 1, 0];

// one attempt; returns null when the paths couldn't be routed
function generateGrid(p, seed) {
    const random = seededRandom(seed);
    const pick = a => a[Math.floor(random() * a.length)];
    const shuffle = a => {
        for (let i = a.length - 1; i > 0; i--) {
            let j = Math.floor(random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };
    const W = p.width, H = p.height;
    const min_dist = Math.max(3, Math.floor((W + H) / 3));
    const max_len = Math.min(W * H, p.minLength + 12);
    // grid[x][y] = { fixed: "0"|"G", color } or { segs: [{ color, edges }] } or null
    const grid = [...Array(W)].map(() => Array(H).fill(null));
    const inBounds = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    const free = [];
    for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) free.push([x, y]);
    shuffle(free);
    const takeFree = near => {
        for (let k = 0; k < free.length; k++) {
            let [x, y] = free[k];
            if (grid[x][y]) continue;
            if (near && Math.abs(x - near[0]) + Math.abs(y - near[1]) < min_dist) continue;
            free.splice(k, 1);
            return [x, y];
        }
    };

    // sources and goals go down first so paths route around them
    const letters = shuffle(Object.keys(COLORS)).slice(0, p.colors);
    const plan = [];
    letters.forEach((color, i) => {
        plan.push({ color, goals: i < p.splits ? 2 : 1 });
    });
    for (let c of plan) {
        c.s = takeFree();
        if (!c.s) return null;
        grid[c.s[0]][c.s[1]] = { fixed: "0", color: c.color };
        let goals = [];
        for (let k = 0; k < c.goals; k++) {
            let g = takeFree(c.s);
            if (!g) return null;
            grid[g[0]][g[1]] = { fixed: "G", color: c.color };
            goals.push(g);
        }
        c.goals = goals;
    }
    // a goal touching another color's source would take that color at once
    for (let a of plan) {
        for (let b of plan) {
            if (a != b && b.goals.some(g => Math.abs(g[0] - a.s[0]) + Math.abs(g[1] - a.s[1]) == 1)) return null;
        }
    }

    let budget;
    // randomized depth-first search from (x, y), entered through edge in_edge
    function route(x, y, in_edge, color, target, path, visited, min_len) {
        if (--budget < 0) return false;
        let cell = grid[x][y];
        let exits;
        if (cell && cell.segs) {
            // crossing another color: leave through its two unused edges
            let used = cell.segs[0].edges;
            exits = [0, 1, 2, 3].filter(e => e != in_edge && !used.includes(e));
        } else {
            exits = shuffle([0, 1, 2, 3].filter(e => e != in_edge));
            // lean towards turning, which makes paths wind
            if (random() < 0.6) exits.sort((a, b) => ((a + 2) % 4 == in_edge) - ((b + 2) % 4 == in_edge));
        }
        for (let e of exits) {
            let nx = x + GEN_DX[e], ny = y + GEN_DY[e];
            if (!inBounds(nx, ny)) continue;
            let back = (e + 2) % 4;
            if (nx == target[0] && ny == target[1]) {
                if (path.length + 1 < min_len) continue;
                path.push({ x, y, edges: [in_edge, e] });
                return true;
            }
            let key = nx * H + ny;
            if (visited.has(key)) continue;
            if (path.length + 1 + Math.abs(nx - target[0]) + Math.abs(ny - target[1]) > max_len) continue;
            let next = grid[nx][ny];
            if (next && next.fixed) continue;
            if (next && next.segs) {
                // only cross a lone two-edge segment of another color, through its free edges
                if (next.segs.length != 1 || next.segs[0].color == color || next.segs[0].edges.length != 2) continue;
                if (next.segs[0].edges.includes(back)) continue;
                if (random() > 0.9) continue;
            }
            path.push({ x, y, edges: [in_edge, e] });
            visited.add(key);
            if (route(nx, ny, back, color, target, path, visited, min_len)) return true;
            visited.delete(key);
            path.pop();
        }
        return false;
    }
    function commit(path, color) {
        for (let step of path) {
            if (step.edges[0] < 0) continue; // the source itself
            let cell = grid[step.x][step.y];
            if (!cell) grid[step.x][step.y] = { segs: [{ color, edges: step.edges.slice() }] };
            else cell.segs.push({ color, edges: step.edges.slice() });
        }
    }

    for (let c of plan) {
        let routed = false;
        for (let attempt = 0; attempt < 20 && !routed; attempt++) {
            for (let e of shuffle([0, 1, 2, 3])) {
                let nx = c.s[0] + GEN_DX[e], ny = c.s[1] + GEN_DY[e];
                if (!inBounds(nx, ny) || grid[nx][ny]) continue;
                budget = 20000;
                let path = [{ x: c.s[0], y: c.s[1], edges: [-1, e] }];
                let visited = new Set([c.s[0] * H + c.s[1], nx * H + ny]);
                if (route(nx, ny, back4(e), c.color, c.goals[0], path, visited, p.minLength)) {
                    commit(path, c.color);
                    routed = true;
                    break;
                }
            }
        }
        if (!routed) return null;
        // second goal: branch off a straight or turn of this color, making a T
        for (let k = 1; k < c.goals.length; k++) {
            let options = [];
            for (let x = 0; x < W; x++) {
                for (let y = 0; y < H; y++) {
                    let cell = grid[x][y];
                    if (cell && cell.segs && cell.segs.length == 1 && cell.segs[0].color == c.color && cell.segs[0].edges.length == 2) options.push([x, y]);
                }
            }
            let branched = false;
            for (let [bx, by] of shuffle(options)) {
                let seg = grid[bx][by].segs[0];
                for (let e of shuffle([0, 1, 2, 3].filter(e => !seg.edges.includes(e)))) {
                    let nx = bx + GEN_DX[e], ny = by + GEN_DY[e];
                    if (!inBounds(nx, ny) || grid[nx][ny]) continue;
                    budget = 20000;
                    let path = [];
                    let visited = new Set([bx * H + by, nx * H + ny]);
                    if (route(nx, ny, back4(e), c.color, c.goals[k], path, visited, 3)) {
                        seg.edges.push(e);
                        commit(path, c.color);
                        branched = true;
                        break;
                    }
                }
                if (branched) break;
            }
            if (!branched) return null;
        }
    }

    // grid -> tokens
    const tokens = [...Array(H)].map(() => Array(W).fill("."));
    const path_cells = [];
    const spare_cells = [];
    const turnRot = edges => [0, 1, 2, 3].find(k => edges.includes(k) && edges.includes((k + 1) % 4));
    for (let x = 0; x < W; x++) {
        for (let y = 0; y < H; y++) {
            let cell = grid[x][y];
            if (!cell) {
                spare_cells.push([x, y]);
                continue;
            }
            if (cell.fixed) {
                tokens[y][x] = cell.fixed + cell.color;
                continue;
            }
            let t;
            if (cell.segs.length == 2) {
                let a = cell.segs[0].edges;
                if ((a[0] + 2) % 4 == a[1]) t = "X0";
                else t = "C" + ((a.includes(1) && a.includes(2)) || (a.includes(0) && a.includes(3)) ? pick([0, 2]) : pick([1, 3]));
            } else {
                let e = cell.segs[0].edges;
                if (e.length == 3) t = "T" + (([0, 1, 2, 3].find(k => !e.includes(k)) + 2) % 4);
                else if ((e[0] + 2) % 4 == e[1]) t = "I" + (e.includes(1) ? pick([0, 2]) : pick([1, 3]));
                else t = pick(["L", "L", "U"]) + turnRot(e);
            }
            tokens[y][x] = t;
            path_cells.push([x, y]);
        }
    }

    // decoys are never reached in the solution: path pieces only open onto their
    // own path, and decoys next to a source are turned away from it
    const sources = plan.map(c => c.s);
    const OPEN = { I: [1, 3], L: [0, 1], U: [0, 1], T: [0, 1, 3] };
    if (p.fill) {
        for (let [x, y] of spare_cells) {
            let facing = [0, 1, 2, 3].filter(e => sources.some(s => s[0] == x + GEN_DX[e] && s[1] == y + GEN_DY[e]));
            let token = null;
            for (let tries = 0; tries < 50 && !token; tries++) {
                let name = pick(facing.length ? ["I", "L", "U", "T", "T"] : GEN_DECOYS);
                let rot = Math.floor(random() * 4);
                if (!facing.length || !OPEN[name].map(e => (e + rot) % 4).some(e => facing.includes(e))) token = name + rot;
            }
            if (!token) return null;
            tokens[y][x] = token;
        }
    }

    // move the most interesting path pieces into the tray
    const interest = { X: 3, C: 3, T: 2, L: 1, U: 1, I: 0 };
    let ranked = shuffle(path_cells.slice()).sort((a, b) => interest[tokens[b[1]][b[0]][0]] - interest[tokens[a[1]][a[0]][0]]);
    // different kinds of pieces for the first few, then whatever is left
    let names = new Set();
    let chosen = [];
    for (let c of ranked) {
        if (chosen.length >= Math.min(3, p.tray)) break;
        let name = tokens[c[1]][c[0]][0];
        if (names.has(name)) continue;
        chosen.push(c);
        names.add(name);
    }
    for (let c of ranked) {
        if (chosen.length >= p.tray) break;
        if (!chosen.includes(c)) chosen.push(c);
    }
    for (let [x, y] of chosen) tokens[y][x] += "*";
    for (let [x, y] of shuffle(spare_cells.slice()).slice(0, p.gaps)) tokens[y][x] = "_";

    return tokens;
}

function back4(e) {
    return (e + 2) % 4;
}

// token grid -> rows with each column padded to the same width
function tokensToRows(tokens) {
    let W = tokens[0].length;
    let widths = [...Array(W)].map((_, x) => Math.max(...tokens.map(r => r[x].length)));
    return tokens.map(r => r.map((t, x) => t.padEnd(widths[x])).join(" ").trimEnd());
}

// keeps generating until it finds a level, or a unique one when asked;
// returns the best level found in the time allowed
function generateLevel(p) {
    let start = Date.now();
    let time_limit = p.timeLimit || 8000;
    let seed = Math.floor(Math.random() * 2 ** 31);
    let best = null;
    let attempts = 0;
    while (Date.now() - start < time_limit) {
        attempts++;
        let tokens = generateGrid(p, seed++);
        if (!tokens) continue;
        let level = { rows: tokensToRows(tokens) };
        if (!intendedLit(level).solved) continue;
        if (!p.unique) return { level, attempts };
        let analysis = analyzeLevel(level, 3e5);
        if (!analysis.valid) continue;
        if (analysis.routeUnique) return { level, analysis, attempts };
        if (!analysis.aborted && (!best || analysis.ways < best.analysis.ways)) best = { level, analysis };
    }
    if (best) return { ...best, attempts, notUnique: true };
    return { attempts, failed: true };
}
