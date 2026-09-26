// Each level is written solved; pieces get scrambled when it loads.
// See the token list above the Board class in puzzle.js.
const LEVELS = [
  {
    name: "First Turn",
    hint: "Click a piece to rotate it. Connect the source to the goal of the same color.",
    rows: ["0r I0 L2 .  .", ".  .  I1 .  .", ".  .  L0 I0 Gr"],
    seed: 1,
  },
  {
    name: "Split",
    hint: "A T sends one color two ways. Every goal has to be filled.",
    rows: [".  .  U1 I0 Gv", "0v I0 T0 I0 Gv"],
    seed: 1,
  },
  {
    name: "Crossing",
    hint: "An X is two separate lines. The colors cross without mixing.",
    rows: [
      ".  .  0b .  .",
      ".  .  I1 .  .",
      "0r I0 X0 I0 Gr",
      ".  .  I1 .  .",
      ".  .  Gb .  .",
    ],
    seed: 1,
  },
  {
    name: "Swap",
    hint: "A C joins its edges in pairs. Turn it to send each color the right way.",
    rows: [".  0r .  .", "0b C1 I0 Gr", ".  I1 .  .", ".  Gb .  ."],
    seed: 1,
  },
  {
    name: "Missing Piece",
    hint: "Click a piece in the tray, then click a dashed gap to place it. Right-click (or press and hold) a placed piece to take it back.",
    rows: ["0t I0 L2* _  .", "_  .  I1  .  .", ".  .  L0  I0 Gt"],
    seed: 1,
  },
  {
    name: "Two Lines",
    hint: "Two pieces, four gaps. Where does each one belong?",
    rows: [
      "0r I0 L2 L1  I0  Gb",
      ".  _  I1 I1  .   _",
      ".  .  L0 X0* L2  .",
      "0b I0 I0 L3  L0* Gr",
    ],
    seed: 1,
  },
  {
    name: "Just Red",
    hint: "",
    rows: ["0r I0 L1 I0 Gr", "I1 L1 X0 L2 .", "L0 O0 L3 L0 Gr"],
    seed: 1,
  },
  {
    name: "Full House",
    hint: "Every cell has a piece now. Most of them are just in the way.",
    rows: [
      "L3 L1 L1 I2 Gb T0",
      "L1 L1 U3 I1 X0 T0",
      "U1 U3 L1 I2 L2 U1",
      "I3 Gr U3 0b L0 L2",
      "L0 I2 I2 L3 0r L3",
    ],
    seed: 1,
  },
  {
    name: "Two Gaps",
    hint: "Two pieces, four gaps.",
    rows: [
      "I3 _   I1 L1 L2  X3",
      "X3 L1  Gr I1 U0  L2",
      "Gb X0* I0 L3 _   I3",
      "L0 I1  L1 L2 0b  I1",
      "X2 L0  L3 0r L0* L3",
    ],
    seed: 1,
  },
  {
    name: "Three Way",
    hint: "Orange has two goals to fill.",
    rows: [
      "U1 U2 0t L2 L1 I2 U2",
      "I3 T1 0o L0 X0 U2 Gv",
      "I3 I1 0v U2 I3 U0 Gt",
      "Go I3 L1 C1 C2 Go T0",
      "T1 L0 L3 U0 U3 X3 C3",
    ],
    seed: 1,
  },
  {
    name: "Interchange",
    hint: "Three colors, three pieces, five gaps.",
    rows: [
      "0r _  L1  0v U1 T2* L2",
      "I3 0t X0* I2 U3 Gt  I1",
      "I3 L1 C2* Gr _  U1  U3",
      "U0 X0 L3  C0 Gv L0  L2",
      "T2 L0 I2  I2 L3 Gt  L3",
    ],
    seed: 1,
  },
  {
    name: "Tangle",
    hint: "Four colors, five goals, every cell full. Only one set of paths works.",
    rows: [
      "T3 U1 L2 U1 I2 Gt U3 I0",
      "L1 U3 L0 X0 L2 Gb I0 L2",
      "0b 0t L1 X0 C3 I2 T2 L3",
      "I0 I3 0v I1 I3 Gb I1 Gr",
      "0r L0 I0 C2 X0 C3 U3 I1",
      "L0 L2 L1 L3 U0 X0 Gv I3",
      "L1 L0 L3 T2 T0 L0 I0 U3",
    ],
    seed: 123
  },
  {
    name: "Switchyard",
    hint: "Four pieces, seven gaps. Every piece has one home.",
    rows: [
      "_   L1  U2 L1  I2 I2 L2 _",
      "L1  C2* C3 X0* I2 I2 X0 Go",
      "T1* X0  C3 L3  _  U1 X0 U2",
      "I3  L0  C1 L2* Gb I1 Gv I1",
      "I1  Go  I1 U0  X0 X0 L2 I1",
      "L0  L3  L0 0v  L0 L3 0o 0b",
    ],
    seed: 234
  },
  {
    name: "Long Way Round",
    hint: "Red takes the long way around. Not every piece is on a path.",
    rows: [
      ".  L0 0r U1 Gb L0 U1 L2",
      "L0 L1 X0 C0 I0 X0 L3 I1",
      "Gt I1 T0 U3 U1 0t C0 I1",
      "U0 C1 0b L1 I0 C0 U2 I1",
      "L0 T0 I0 U3 L0 Gr L0 T3",
    ],
    seed: 456
  },
  {
    name: "Shared Corner",
    hint: "Red and blue have to share a cell. A C can carry both.",
    rows: [
      "I2 L3 X1 0r I0 L2",
      "T1 L1 I0 I0 L2 I1",
      "C2 L0 U2 0b C0 U3",
      ".  L0 Gb .  U0 L2",
      ".  .  .  L2 T3 Gr",
    ],
    seed: 30
  },
  {
    name: "Stepping Stones",
    hint: "Three pieces, five gaps. Two of the gaps stay empty.",
    rows: [
      "_   I1 _   U1 0t .",
      "L1* Gt U1  C0 U2 0o",
      "U0* I0 C0* U3 U0 U3",
      ".   Go L3  .  X3 .",
    ],
    seed: 122
  },
  {
    name: "Fork in the Road",
    hint: "Purple has two goals, and red has to cross teal to get home.",
    rows: [
      "U1 I0 T2 I0 Gv U1 L2",
      "I1 Gv U3 L1 L2 I1 Gr",
      "U0 L2 C1 I1 0t I1 Gt",
      "C2 I1 0r X0 I0 L3 I1",
      "C3 0v I1 L0 I0 I0 U3",
    ],
    seed: 166
  },
  {
    name: "Grand Central",
    hint: "Four colors, three pieces, four gaps. Orange splits to two goals.",
    rows: [
      "L1 U2 0o U1 L2 U1  T2 U2*",
      "I1 I1 U0 L3 L0 L3  I1 Go",
      "I1 U0 0b 0t U1 I0  U3 Gt",
      "U0 U2 L1 C0 C0 I0* I0 U3",
      "U1 X0 X0 C0 C0 I0  I0 L2",
      "Go I1 I1 I1 U0 I0  Gr I1",
      "_  Gb U0 L3 0r I0* I0 L3",
    ],
    seed: 226
  },
];
