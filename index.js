const express = require("express");
const app = express();
const http = require("http");
const path = require("path");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const rooms = {};

// Serve static files from the 'client' directory
app.use(express.static(path.join(__dirname, "client")));

app.get("/service-worker.js", (req, res) => {
  res.sendFile(path.join(__dirname, "service-worker.js"));
});

// Health check endpoint
app.get("/healthcheck", (req, res) => {
  res.send("<h1>RPS App running...</h1>");
});

// Serve the main page
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/client/index.html");
});

// Socket.io connections
io.on("connection", (socket) => {
  console.log("A user connected");
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });

  socket.on("createGame", () => {
    const roomUniqueId = makeid(6);
    rooms[roomUniqueId] = {};
    socket.join(roomUniqueId);
    socket.emit("newGame", { roomUniqueId: roomUniqueId });
  });

  socket.on("joinGame", (data) => {
    if (rooms[data.roomUniqueId] != null) {
      socket.join(data.roomUniqueId);
      socket.to(data.roomUniqueId).emit("playersConnected", {});
      socket.emit("playersConnected");
    }
  });

  socket.on("p1Choice", (data) => {
    let rpsValue = data.rpsValue;
    rooms[data.roomUniqueId].p1Choice = rpsValue;
    socket.to(data.roomUniqueId).emit("p1Choice", { rpsValue: data.rpsValue });
    if (rooms[data.roomUniqueId].p2Choice != null) {
      declareWinner(data.roomUniqueId);
    }
  });

  socket.on("p2Choice", (data) => {
    let rpsValue = data.rpsValue;
    rooms[data.roomUniqueId].p2Choice = rpsValue;
    socket.to(data.roomUniqueId).emit("p2Choice", { rpsValue: data.rpsValue });
    if (rooms[data.roomUniqueId].p1Choice != null) {
      declareWinner(data.roomUniqueId);
    }
  });

  socket.on("restartGame", (data) => {
    try {
      const room = rooms[data.roomUniqueId];
      if (room) {
        room.p1Choice = null;
        room.p2Choice = null;
        io.to(data.roomUniqueId).emit("gameRestart");
      }
    } catch (error) {
      console.error("Error restarting game:", error);
    }
  });
});

function declareWinner(roomUniqueId) {
  let p1Choice = rooms[roomUniqueId].p1Choice;
  let p2Choice = rooms[roomUniqueId].p2Choice;
  let winner = null;
  if (p1Choice === p2Choice) {
    winner = "d";
  } else if (p1Choice == "Paper") {
    if (p2Choice == "Scissor") {
      winner = "p2";
    } else {
      winner = "p1";
    }
  } else if (p1Choice == "Rock") {
    if (p2Choice == "Paper") {
      winner = "p2";
    } else {
      winner = "p1";
    }
  } else if (p1Choice == "Scissor") {
    if (p2Choice == "Rock") {
      winner = "p2";
    } else {
      winner = "p1";
    }
  }
  io.sockets.to(roomUniqueId).emit("result", {
    winner: winner,
  });
  rooms[roomUniqueId].p1Choice = null;
  rooms[roomUniqueId].p2Choice = null;
}

// Dynamically listen on the provided PORT or fallback to 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Utility function to generate a unique ID
function makeid(length) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then((registration) => {
        console.log(
          "Service Worker registered with scope:",
          registration.scope
        );
      })
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
  });
}
