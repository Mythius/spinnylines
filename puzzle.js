// edges: 0 = top, 1 = right, 2 = bottom, 3 = left (before rotation)
// groups: edges joined by one continuous stroke
// elements: which group each colored element in the svg belongs to, in file order
const PIECES = {
    "0": { groups: [[0, 1, 2, 3]], elements: [0], fixed: true },
    G: { groups: [[0, 1, 2, 3]], elements: [0], fixed: true, goal: true },
    O: { groups: [[0, 1, 2, 3]], elements: [0] },
    I: { groups: [[1, 3]], elements: [0] },
    L: { groups: [[0, 1]], elements: [0] },
    U: { groups: [[0, 1]], elements: [0] },
    T: { groups: [[0, 1, 3]], elements: [0, 0] },
    X: { groups: [[1, 3], [0, 2]], elements: [0, 1] },
    C: { groups: [[1, 2], [0, 3]], elements: [0, 1] },
};
const COLORS = { r: "#e63946", o: "#f4a261", t: "#2a9d8f", b: "#3a86ff", v: "#8338ec" };
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

// returns a function like Math.random that gives the same numbers for the same seed
function seededRandom(seed) {
    return () => {
        seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function hashString(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    return h >>> 0;
}

// Level tokens:
//   .     empty
//   _     gap a tray piece can be placed in
//   0r    source, letter is its color (r o t b v)
//   Gr    goal, letter is the color it needs
//   L1    piece L turned 1 quarter clockwise (its solved rotation)
//   L1*   same, but it starts in the tray and its cell starts as a gap
// A level can also have a seed, which picks how it gets scrambled.
class Board {
    constructor(level) {
        let rows = level.rows.map(r => r.trim().split(/\s+/));
        this.name = level.name;
        this.hint = level.hint || "";
        // levels without a saved seed still scramble the same way every time
        this.seed = level.seed ?? hashString(level.rows.join("|"));
        this.width = rows[0].length;
        this.height = rows.length;
        this.cells = [];
        this.tray = [];
        for (let x = 0; x < this.width; x++) {
            let column = [];
            for (let y = 0; y < this.height; y++) {
                column.push(this.parseToken(rows[y][x], x, y));
            }
            this.cells.push(column);
        }
    }
    parseToken(token, x, y) {
        if (token == ".") return null;
        if (token == "_") return { gap: true, item: null };
        let name = token[0];
        let rest = token.slice(1);
        let item = { name, rot: 0, anim: 0 };
        if (name == "0") item.color = COLORS[rest];
        else if (name == "G") item.target = COLORS[rest];
        else item.rot = item.solution = +rest[0];
        if (rest.endsWith("*")) {
            item.home = { x, y };
            this.tray.push(item);
            return { gap: true, item: null };
        }
        return { gap: false, item };
    }
    getCell(x, y) {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null;
        return this.cells[x][y];
    }
    getItem(x, y) {
        let cell = this.getCell(x, y);
        return cell ? cell.item : null;
    }
    forEachItem(callback) {
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                let item = this.getItem(x, y);
                if (item) callback(item, x, y);
            }
        }
    }
    rotate(x, y) {
        let item = this.getItem(x, y);
        if (!item || PIECES[item.name].fixed) return;
        item.rot = (item.rot + 1) % 4;
        item.anim += 90;
    }
    // counts down each item's remaining animation, in degrees
    step(degrees) {
        this.forEachItem(item => item.anim = Math.max(0, item.anim - degrees));
    }
    place(tray_index, x, y) {
        let cell = this.getCell(x, y);
        if (!cell || !cell.gap || cell.item) return false;
        cell.item = this.tray.splice(tray_index, 1)[0];
        cell.item.anim = 0;
        return true;
    }
    pickUp(x, y) {
        let cell = this.getCell(x, y);
        if (!cell || !cell.gap || !cell.item) return;
        cell.item.anim = 0;
        this.tray.push(cell.item);
        cell.item = null;
    }
    scramble(seed = this.seed) {
        let random = seededRandom(seed);
        for (let item of this.tray) item.rot = 0;
        for (let tries = 0; tries < 50; tries++) {
            this.forEachItem(item => {
                if (!PIECES[item.name].fixed) item.rot = Math.floor(random() * 4);
            });
            if (!this.flow()) return;
        }
    }
    edges(item, group) {
        if (item.anim > 0) return [];
        return PIECES[item.name].groups[group].map(e => (e + item.rot) % 4);
    }
    groupWithEdge(item, edge) {
        if (item.anim > 0) return -1;
        return PIECES[item.name].groups.findIndex(g => g.some(e => (e + item.rot) % 4 == edge));
    }
    // spreads each source's color through connected pieces (closest source wins),
    // stopping at goals. Returns true when every goal has its color and every
    // source reaches a goal of its color
    flow() {
        let queue = [];
        let sources = [];
        let goals = [];
        this.forEachItem((item, x, y) => {
            item.colors = PIECES[item.name].groups.map(() => null);
            item.from = PIECES[item.name].groups.map(() => null);
            if (item.color) {
                item.colors[0] = item.color;
                item.from[0] = item;
                queue.push([item, x, y, 0]);
                sources.push(item);
            }
            if (item.target) goals.push(item);
        });
        while (queue.length) {
            let [item, x, y, group] = queue.shift();
            if (PIECES[item.name].goal) continue;
            for (let e of this.edges(item, group)) {
                let nx = x + DX[e];
                let ny = y + DY[e];
                let next = this.getItem(nx, ny);
                if (!next) continue;
                let next_group = this.groupWithEdge(next, (e + 2) % 4);
                if (next_group < 0 || next.colors[next_group]) continue;
                next.colors[next_group] = item.colors[group];
                next.from[next_group] = item.from[group];
                queue.push([next, nx, ny, next_group]);
            }
        }
        let lit = goals.filter(g => g.colors[0] == g.target);
        return goals.length > 0 &&
            lit.length == goals.length &&
            sources.every(s => lit.some(g => g.from[0] == s));
    }
}
