require("dotenv").config();
const express = require("express");
const http = require("http");
// const socketio = require('socket.io');
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const auth = require("./middleware/auth");
const path = require("path")
const fs = require("fs");

//
const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: process.env.CLIENT_URL || "https://native-earn.onrender.com",
    methods: ["GET", "POST"]
  },
});
let users = [];

const addUser = (userId, socketId) => {
  !users.some((user) => user.id === userId) && users.push({ userId, socketId });
};

const removeUser = (socketId) => {
  users = users.filter((user) => user.socketId !== socketId);
};

const getUser = (userId) => {
  return users.find((user) => user.userId === userId);
};
//
io.on("connection", (socket) => {
  console.log("a user connected.");
  socket.on("addUser", (userId) => {
    addUser(userId, socket.id);
    io.emit("getUsers", users);
  });

  //send message
  socket.on("sendMessage", ({ senderId, receiverId, text }) => {
    console.log(receiverId);
    console.log(users);
    const user = getUser(receiverId);
    io.to(user?.socketId).emit("getMessage", {
      senderId,
      text,
    });
  });

  socket.on("disconnect", () => {
    console.log("a user disconnected");
    removeUser(socket.id);
    io.emit("getUsers", users);
  });
});

//
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_URL || "https://native-earn.onrender.com",
  credentials: true
}));

app.use(
  fileUpload({
    useTempFiles: true,
  })
);

//Routes
app.use("/user", require("./routes/user.route"));
app.use("/rooms", auth, require("./routes/chat.route"));
app.use("/api", require("./routes/category.route"));
app.use("/api", require("./routes/upload.route"));
app.use("/api", require("./routes/product.route"));
app.use("/api", require("./routes/ad.route"));


// Serve static files from React build
const buildPath = path.join(__dirname, 'client/build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  console.log("Build folder not found. Running in API-only mode.");
  app.get('/', (req, res) => {
    res.json({ 
      msg: "API is running",
      note: "Frontend build not found. Please run 'npm run build' to build the React app."
    });
  });

//
app.get("*", (req, res) => {
  return res.status(404).json({
    success: false,
    message: "API endpoint doesn't exist",
  });
})
//
const URI = process.env.MONGODB_URL;
const PORT = process.env.PORT || 5000;

//
mongoose
  .connect(URI)
  .then(() => console.log("connected to db successfully"))
  .catch((e) => console.log(e));
//
app.get("/", (req, res) => {
  res.json({ msg: "welcome" });
});

//
server.listen(PORT, () => {
  console.log("server is listening at", PORT);
});
