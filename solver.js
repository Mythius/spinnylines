// Counts every way to solve a level, following the same flow rules as
// Board.flow. A piece's rotation (or what goes in a gap) is only chosen the
// first time the flow reaches it, so pieces the flow never touches don't
// multiply the count. Needs puzzle.js.

// distinct rotations per piece; the rest look and connect the same
const ROT_OPTIONS = { "0": [0], G: [0], O: [0], X: [0], I: [0, 1], C: [0, 1], L: [0, 1, 2, 3], U: [0, 1, 2, 3], T: [0, 1, 2, 3] };

function solverModel(level) {
    let rows = level.rows.map(r => r.trim().split(/\s+/));
    let H = rows.length, W = rows[0].length;
    let cells = [], tray = [];
    for (let x = 0; x < W; x++) {
        for (let y = 0; y < H; y++) {
            let t = rows[y][x] || ".";
            if (t == ".") cells.push(null);
            else if (t == "_") cells.push({ gap: true });
            else {
                let name = t[0], rest = t.slice(1);
                if (rest.endsWith("*")) {
                    tray.push(name);
                    cells.push({ gap: true });
                    continue;
                }
                let c = { name };
                if (name == "0") c.color = COLORS[rest[0]];
                if (name == "G") c.target = COLORS[rest[0]];
                cells.push(c);
            }
        }
    }
    return { W, H, cells, tray };
}

// cells lit when the level is set up as written (x * height + y)
function intendedLit(level) {
    let b = new Board(level);
    for (let item of [...b.tray]) b.place(b.tray.indexOf(item), item.home.x, item.home.y);
    let solved = b.flow();
    let lit = [];
    b.forEachItem((item, x, y) => { if (item.colors.some(c => c)) lit.push(x * b.height + y); });
    return { solved, lit };
}

function countSolutions(level, limit = 2e6) {
    const { W, H, cells, tray } = solverModel(level);
    const N = W * H;
    const goals = [];
    const sources = [];
    cells.forEach((c, i) => {
        if (c && c.color) sources.push(i);
        if (c && c.target) goals.push(i);
    });
    const DXS = [0, 1, 0, -1], DYS = [-1, 0, 1, 0];
    let nodes = 0, solutions = 0, aborted = false;
    const litSets = new Map();

    let init = {
        name: cells.map(c => c && !c.gap ? c.name : null),
        rot: new Int8Array(N).fill(-1),
        gapDone: new Int8Array(N),
        trayUsed: 0,
        col: new Array(N * 2).fill(null),
        from: new Int16Array(N * 2).fill(-1),
        queue: [], qh: 0, ei: 0,
    };
    cells.forEach((c, i) => {
        if (c && !c.gap && PIECES[c.name].fixed) init.rot[i] = 0;
        if (c && c.color) {
            init.col[i * 2] = c.color;
            init.from[i * 2] = i;
            init.queue.push(i * 2);
        }
    });

    function clone(s) {
        return {
            name: s.name.slice(), rot: s.rot.slice(), gapDone: s.gapDone.slice(), trayUsed: s.trayUsed,
            col: s.col.slice(), from: s.from.slice(), queue: s.queue.slice(), qh: s.qh, ei: s.ei,
        };
    }
    function edgesOf(s, i, g) {
        return PIECES[s.name[i]].groups[g].map(e => (e + s.rot[i]) % 4);
    }
    function groupWithEdge(s, i, edge) {
        return PIECES[s.name[i]].groups.findIndex(gr => gr.some(e => (e + s.rot[i]) % 4 == edge));
    }
    // true when a color, or one source's flow, has nothing left to spread
    // but still hasn't lit what it needs, so this branch can't win
    function flowDied(s, color, from) {
        let color_alive = false, from_alive = false;
        for (let k = s.qh; k < s.queue.length; k++) {
            let q = s.queue[k];
            if (s.name[q >> 1] == "G") continue;
            if (s.col[q] == color) color_alive = true;
            if (s.from[q] == from) from_alive = true;
            if (color_alive && from_alive) return false;
        }
        if (!color_alive && goals.some(gi => cells[gi].target == color && s.col[gi * 2] != color)) return true;
        if (!from_alive && !goals.some(gi => s.from[gi * 2] == from && s.col[gi * 2] == cells[gi].target)) return true;
        return false;
    }

    function run(s) {
        if (aborted) return;
        if (++nodes > limit) {
            aborted = true;
            return;
        }
        while (s.qh < s.queue.length) {
            let qi = s.queue[s.qh], i = qi >> 1, g = qi & 1;
            if (s.name[i] == "G") {
                s.qh++;
                s.ei = 0;
                continue;
            }
            let edges = edgesOf(s, i, g);
            let x = Math.floor(i / H), y = i % H;
            for (; s.ei < edges.length; s.ei++) {
                let e = edges[s.ei];
                let nx = x + DXS[e], ny = y + DYS[e];
                if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
                let n = nx * H + ny;
                let c = cells[n];
                if (!c) continue;
                if (c.gap && !s.gapDone[n]) {
                    // leave the gap empty, or place any unused tray piece in any rotation
                    let a = clone(s);
                    a.gapDone[n] = 1;
                    run(a);
                    let tried = new Set();
                    tray.forEach((name, k) => {
                        if (s.trayUsed & (1 << k) || tried.has(name)) return;
                        tried.add(name);
                        for (let r of ROT_OPTIONS[name]) {
                            let b = clone(s);
                            b.gapDone[n] = 1;
                            b.trayUsed |= 1 << k;
                            b.name[n] = name;
                            b.rot[n] = r;
                            run(b);
                        }
                    });
                    return;
                }
                if (!s.name[n]) continue;
                if (s.rot[n] < 0) {
                    for (let r of ROT_OPTIONS[s.name[n]]) {
                        let b = clone(s);
                        b.rot[n] = r;
                        run(b);
                    }
                    return;
                }
                let ng = groupWithEdge(s, n, (e + 2) % 4);
                if (ng < 0 || s.col[n * 2 + ng]) continue;
                s.col[n * 2 + ng] = s.col[qi];
                s.from[n * 2 + ng] = s.from[qi];
                if (s.name[n] == "G" && cells[n].target != s.col[qi]) return; // a goal got the wrong color
                s.queue.push(n * 2 + ng);
            }
            s.qh++;
            s.ei = 0;
            if (flowDied(s, s.col[qi], s.from[qi])) return;
        }
        let lit = goals.filter(gi => s.col[gi * 2] == cells[gi].target);
        if (lit.length != goals.length) return;
        if (!sources.every(si => lit.some(gi => s.from[gi * 2] == si))) return;
        solutions++;
        let key = s.col.map((c, k) => c ? k + c : "").join("");
        if (!litSets.has(key)) litSets.set(key, [...new Set(s.col.map((c, k) => c ? k >> 1 : -1).filter(k => k >= 0))]);
    }
    run(init);
    return { solutions, nodes, aborted, litSets: [...litSets.values()] };
}

// solutions: every rotation/placement that wins
// ways: how many different sets of lit cells those wins produce
// routeUnique: every win lights all of the level's written paths, so the
// only differences are harmless extras like a decoy lit as a dead end
function analyzeLevel(level, limit = 2e6) {
    let intended = intendedLit(level);
    if (!intended.solved) return { valid: false };
    let r = countSolutions(level, limit);
    let routeUnique = !r.aborted && r.litSets.every(lit => {
        let s = new Set(lit);
        return intended.lit.every(k => s.has(k));
    });
    return { valid: true, solutions: r.solutions, ways: r.litSets.length, routeUnique, aborted: r.aborted, nodes: r.nodes, path: intended.lit.length };
}
