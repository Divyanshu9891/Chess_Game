const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const path = require("path");

const chessJs = require("chess.js");              
const Chess = typeof chessJs === "function" ? chessJs : chessJs.Chess;

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const chess = new Chess();
const players = { white: null, black: null };

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index", { title: "Chess Game" });
});

io.on("connection", (sock) => {
  console.log("connected:", sock.id);

  if (!players.white) {
    players.white = sock.id;
    sock.emit("playerRole", "w");
  } else if (!players.black) {
    players.black = sock.id;
    sock.emit("playerRole", "b");
  } else {
    sock.emit("spectatorRole");
  }

  sock.emit("boardState", chess.fen());

  sock.on("disconnect", () => {
    if (sock.id === players.white) players.white = null;
    if (sock.id === players.black) players.black = null;
  });

  sock.on("move", (move) => {
    try {
      if (chess.turn() === "w" && sock.id !== players.white) return;
      if (chess.turn() === "b" && sock.id !== players.black) return;

      const result = chess.move(move); 
      if (!result) {
        sock.emit("invalidMove", move);
        sock.emit("boardState", chess.fen());
        return;
      }

      io.emit("move", move);
      io.emit("boardState", chess.fen());
    } catch (err) {
      console.error("Move error:", err);
      sock.emit("invalidMove", move);
      sock.emit("boardState", chess.fen());
    }
  });
});

server.listen(3000, () => {
  console.log("server listening on http://localhost:3000");
});
