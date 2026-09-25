// Drawing helpers shared by the game and the level editor.
// Expects a global ctx, like sprite.js does.
const UNLIT = "#555555";

const svg_text = {};
const tinted = {};
for (let name in PIECES) {
    fetch(`assets/${name}.svg`).then(r => r.text()).then(t => svg_text[name] = t);
}

// returns an image of the piece with each group drawn in its color,
// and a goal's center drawn in its target color
function getTinted(name, colors, target) {
    let key = name + colors.join() + (target || "");
    if (!tinted[key]) {
        let text = svg_text[name];
        if (!text) return;
        let parts = text.split("#3590ce");
        let out = parts[0];
        for (let i = 1; i < parts.length; i++) {
            out += colors[PIECES[name].elements[i - 1]] + parts[i];
        }
        if (target) out = out.replace("fill:#555;", `fill:${target};`);
        let img = new Image();
        img.onload = () => img.loaded = true;
        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(out);
        tinted[key] = img;
    }
    return tinted[key];
}

function addSprite(item) {
    item.sprite = new Sprite(`assets/${item.name}.svg`);
    let size = item.name.match(/[O0G]/) ? 104 : 100;
    size *= .90;
    item.sprite.resize(size, size);
}

// colors defaults to the item's flowed colors, unlit where nothing reached it
function drawItem(item, x, y, colors) {
    if (!colors) {
        let flowed = item.colors || [];
        colors = PIECES[item.name].groups.map((g, i) => flowed[i] || UNLIT);
    }
    let s = item.sprite;
    let img = getTinted(item.name, colors, item.target);
    if (img && img.loaded) s.element = img;
    s.position = new Vector(x, y);
    s.direction = item.rot * 90 - item.anim;
    s.draw();
}

function drawGap(x, y, highlight) {
    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = highlight ? 4 : 2;
    ctx.strokeStyle = highlight ? "#222" : "#888";
    ctx.beginPath();
    ctx.roundRect(x - 44, y - 44, 88, 88, 10);
    ctx.stroke();
    ctx.restore();
}
