const express = require("express");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });
const { chats } = require("./data/data");
const ConnectDB = require("./config/db");
const userRouters = require("./routers/userRouters");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const chatRouters = require("./routers/chatRouters");
const messageRouters = require("./routers/messageRouters");
const app = express();
ConnectDB();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("API is running..");
});
// app.get("/api/chat", (req, res) => {
//   res.send(chats);
// });
app.use("/api/user", userRouters);
// app.get("/api/chat/:id", (req, res) => {
//   const singlechat = chats.find((c) => c._id === req.params.id);
//   res.send(singlechat);
// });
app.use("/api/chat", chatRouters);
app.use("/api/message", messageRouters);
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, console.log(`server started on port ${PORT}`));
const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:3000",
  },
});
io.on("connection", (socket) => {
  console.log("connected to socket.io");
  socket.on("setup", (userData) => {
    socket.join(userData._id);
    socket.emit("connected");
  });

  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User Joined Room: " + room);
  });
  socket.on("new message", (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;
    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id === newMessageRecieved.sender._id) return;
      socket.in(user._id).emit("message recieved", newMessageRecieved);
    });
  });
  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
    socket.leave(userData._id);
  });
});
