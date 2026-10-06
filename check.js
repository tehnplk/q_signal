// Self-check: boots the relay and walks a call the way q_caller and q_screen use it. No database needed.
// Stop the running q_signal first — the port is fixed at 19009.
require("./server");
const { io } = require("socket.io-client");
const assert = require("node:assert");

(async () => {
  const caller = io("http://localhost:19009");
  const screen = io("http://localhost:19009");
  const other = io("http://localhost:19009"); // a screen of another department

  assert.deepStrictEqual(await caller.emitWithAck("watch", "001"), { ok: true });
  await screen.emitWithAck("join", "001");
  await other.emitWithAck("join", "002");
  other.on("changed", () => assert.fail("department 002 must not hear department 001"));

  const called = new Promise((r) => screen.once("called", r));
  const screenChanged = new Promise((r) => screen.once("changed", r));
  const callerChanged = new Promise((r) => caller.once("changed", r));
  const entry = { q: "A001", name: "สมชาย", counter: "ช่อง 3" };
  await caller.emitWithAck("changed", { dept: "001", called: entry });
  assert.deepStrictEqual(await called, entry);
  await screenChanged;
  await callerChanged;

  // No `called`: both rooms still refresh (a transfer), but no screen is rung
  const noRing = () => assert.fail("a change without a call must not ring");
  screen.on("called", noRing);
  const again = new Promise((r) => screen.once("changed", r));
  await caller.emitWithAck("changed", { dept: "001" });
  await again;
  screen.off("called", noRing);

  // HTTP is /{event}/{q} only, GET only
  assert.strictEqual((await fetch("http://localhost:19009/001/a005", { method: "POST" })).status, 405);
  assert.strictEqual((await fetch("http://localhost:19009/001")).status, 404);
  assert.strictEqual((await fetch("http://localhost:19009/a/b/c")).status, 404);
  assert.strictEqual((await fetch("http://localhost:19009/sa1/%E0%A4%A")).status, 400);

  // Old-style channels: any name, nothing registered; every client hears it, over HTTP or socket
  const heard = new Promise((r) => other.once("sa1", r)); // `other` is in another department
  assert.strictEqual((await fetch("http://localhost:19009/sa1/A005")).status, 200);
  assert.strictEqual(await heard, "A005");
  const fromSocket = new Promise((r) => other.once("zz9", r));
  caller.emit("zz9", "B012");
  assert.strictEqual(await fromSocket, "B012");
  // Too short is ignored; internal names can't be broadcast as a channel
  other.on("sa1", (q) => assert.notStrictEqual(q, "ab"));
  other.on("called", () => assert.fail("`called` is internal"));
  await fetch("http://localhost:19009/sa1/ab");
  await fetch("http://localhost:19009/called/A005");
  // A screen rings off the channel named after its department
  const dept = new Promise((r) => screen.once("001", r));
  assert.deepStrictEqual(await (await fetch("http://localhost:19009/001/A006")).json(), { ok: true });
  assert.strictEqual(await dept, "A006");

  await new Promise((r) => setTimeout(r, 100));
  console.log("OK");
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
