const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");
const roleEl = document.getElementById("role");
const msgEl = document.getElementById("msg");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

const getPieceUnicode = (piece) => {
  const map = {
    k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
    K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
  };
  const key = piece.color === "w" ? piece.type.toUpperCase() : piece.type;
  return map[key];
};

const renderBoard = () => {
  const board = chess.board(); 
  boardElement.innerHTML = "";

  board.forEach((row, rowIndex) => {
    row.forEach((square, colIndex) => {
      const el = document.createElement("div");
      el.className = `square ${ (rowIndex + colIndex) % 2 === 0 ? "light" : "dark" }`;
      el.dataset.row = rowIndex;
      el.dataset.col = colIndex;

      if (square) {
        const p = document.createElement("div");
        p.className = "piece";
        p.textContent = getPieceUnicode(square);
        p.draggable = playerRole === square.color;

        p.addEventListener("dragstart", (e) => {
          if (!p.draggable) return e.preventDefault();
          draggedPiece = p;
          sourceSquare = { row: rowIndex, col: colIndex };
          setTimeout(() => { p.style.pointerEvents = "none"; }, 0);
          e.dataTransfer.setData("text/plain", "");
        });

        p.addEventListener("dragend", () => {
          draggedPiece = null;
          sourceSquare = null;
          p.style.pointerEvents = "";
        });

        el.appendChild(p);
      }

      el.addEventListener("dragover", (e) => e.preventDefault());

      el.addEventListener("drop", (e) => {
        e.preventDefault();
        if (!draggedPiece || !sourceSquare) return;

        const targetSquare = {
          row: parseInt(el.dataset.row, 10),
          col: parseInt(el.dataset.col, 10),
        };
        handleMove(sourceSquare, targetSquare);
      });

      boardElement.appendChild(el);
    });
  });

  if (playerRole === "b") boardElement.classList.add("flipped");
  else boardElement.classList.remove("flipped");

  roleEl.textContent =
    playerRole === "w" ? "You are White"
    : playerRole === "b" ? "You are Black"
    : "You are a Spectator";
};

const handleMove = (source, target) => {
  const from = `${String.fromCharCode(97 + source.col)}${8 - source.row}`;
  const to   = `${String.fromCharCode(97 + target.col)}${8 - target.row}`;

  msgEl.textContent = "";
  socket.emit("move", { from, to, promotion: "q" });
};

const resetBtn = document.getElementById("resetBtn");

resetBtn.addEventListener("click", () => {
  socket.emit("resetGame");
});



socket.on("playerRole", (role) => {
  playerRole = role;      
  renderBoard();
});

socket.on("spectatorRole", () => {
  playerRole = null;
  renderBoard();
});

socket.on("boardState", (fen) => {
  try {
    chess.load(fen);
  } catch (e) {
    console.error("Bad FEN from server:", fen, e);
  }
  renderBoard();
});

socket.on("move", (move) => {
  chess.move(move);
  renderBoard();
});

socket.on("invalidMove", (move) => {
  msgEl.textContent = `Invalid move: ${move.from} → ${move.to}`;
});

socket.on("resetGame", (fen) => {
  chess.load(fen);
  msgEl.textContent = "Game has been reset!";
  renderBoard();
});

renderBoard();
