// Queue signal server: a Socket.IO relay between q_caller (staff desktops) and q_screen (department
// displays). It knows nothing about queues or the database and holds no state; whoever changes q_db
// tells it, and it tells everyone else to look again.
//
// 1. Channels, as in the old q_signal — nothing is listed anywhere, any name works:
//      GET /<channel>/<q>        every connected client gets event <channel> with payload <q>
//      socket.emit("<channel>", q)   the same, from a Socket.IO client
//    A <q> shorter than 3 characters is ignored. e.g. /sa1/A005 -> io.emit("sa1", "A005").
//
// 2. Departments (q_screen and q_caller) use rooms on top of that. `dept` is a dep_code.
//    Rooms: "<dep_code>" for screens, "staff:<dep_code>" for q_caller.
//    Events (client -> server; each takes an ack callback and answers {ok: true}):
//      join    dept                  (screen)    enter the department's room
//      watch   dept                  (q_caller)  enter the department's staff room
//      changed {dept, called?}       (q_caller)  q_db changed; `called` = {q, name, counter} if a call was made
//    Server -> clients:
//      "<dep>":       changed, called {q, name, counter}
//      "staff:<dep>": changed
//    A screen also listens on the channel named after its dep_code, so GET /001/A005 rings department 001.//
// Like the socket events, this only relays; the caller has already written the change to q_db.
const http = require("node:http");
const { Server } = require("socket.io");

const PORT = 19009; // fixed: the old q_signal's port, so its clients keep working; q_screen and q_caller expect it too

// Names with a meaning of their own: a client must not be able to broadcast them as a channel
const INTERNAL = new Set(["join", "watch", "changed", "called"]);

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  const m = url.pathname.match(/^\/([^/]+)\/([^/]+)$/);
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.writeHead(405, { Allow: "GET" }).end(); // as the old q_signal: GET only
  if (!m) return res.writeHead(404).end();
  let channel, q;
  try {
    [channel, q] = m.slice(1).map(decodeURIComponent);
  } catch {
    return res.writeHead(400).end(); // malformed %-escape
  }
  relay(channel, q);
  res.writeHead(200, { "Content-Type": "application/json" }).end('{"ok":true}');
});
const io = new Server(server, { cors: { origin: "*" } }); // LAN only; q_caller loads from file://
server.listen(PORT, () => console.log(`q_signal on :${PORT}`));

function relay(channel, q) {
  if (INTERNAL.has(channel) || String(q).length < 3) return;
  try {
    io.emit(channel, q);
  } catch (e) {
    console.error("relay:", e.message); // a name socket.io reserves ("connect", ...)
  }
}

function notify(dept, called) {
  if (called) io.to(dept).emit("called", called);
  io.to(dept).to(`staff:${dept}`).emit("changed");
}

function enter(socket, room) {
  for (const r of socket.rooms) if (r !== socket.id) socket.leave(r);
  socket.join(room);
}

io.on("connection", (socket) => {
  const handle = (event, fn) =>
    socket.on(event, (data, ack) => {
      fn(data ?? {});
      if (typeof ack === "function") ack({ ok: true });
    });

  handle("join", (dept) => enter(socket, String(dept)));
  handle("watch", (dept) => enter(socket, `staff:${dept}`));
  handle("changed", ({ dept, called }) => notify(String(dept), called));

  // Any other event is a channel: pass its payload on to everyone
  socket.onAny((channel, q) => relay(channel, q));
});
