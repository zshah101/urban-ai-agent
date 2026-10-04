/* eslint-disable @typescript-eslint/no-require-imports -- Native CommonJS dependency integration test. */
const assert = require("node:assert/strict");
const test = require("node:test");
const net = require("node:net");
const { once } = require("node:events");
const path = require("node:path");
const fs = require("node:fs");
const { getUri } = require("get-uri");

test("get-uri's patched basic-ftp dependency reads a same-host loopback FTP fixture", { timeout: 5000 }, async () => {
  const ftpPath = require.resolve("basic-ftp", { paths: [path.dirname(require.resolve("get-uri"))] });
  const version = JSON.parse(fs.readFileSync(path.resolve(path.dirname(ftpPath), "../package.json"), "utf8")).version;
  assert.equal(version, "6.2.2");
  const payload = "function FindProxyForURL(){return 'DIRECT';}";
  const sockets = new Set();
  const dataServer = net.createServer(socket => { sockets.add(socket); socket.on("close", () => sockets.delete(socket)); });
  dataServer.listen(0, "127.0.0.1");
  await once(dataServer, "listening");
  let dataSocket;
  let retrRequested = false;
  let transferSent = false;
  let control;
  const sendTransfer = () => {
    if (!dataSocket || !retrRequested || transferSent) return;
    transferSent = true;
    control.write("150 Opening data connection\r\n");
    dataSocket.end(payload, () => { control.write("226 Transfer complete\r\n"); });
  };
  dataServer.on("connection", socket => { dataSocket = socket; sendTransfer(); });
  const server = net.createServer(socket => {
    control = socket;
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.write("220 Offline FTP fixture ready\r\n");
    let buffer = "";
    socket.on("data", chunk => {
      buffer += chunk.toString("utf8");
      while (buffer.includes("\r\n")) {
        const at = buffer.indexOf("\r\n");
        const command = buffer.slice(0, at);
        buffer = buffer.slice(at + 2);
        if (command.startsWith("USER")) socket.write("331 Password required\r\n");
        else if (command.startsWith("PASS")) socket.write("230 Logged in\r\n");
        else if (command === "FEAT") socket.write("211 No additional features\r\n");
        else if (command.startsWith("MDTM")) socket.write("213 20261004120000\r\n");
        else if (command === "EPSV") socket.write(`229 Entering Extended Passive Mode (|||${dataServer.address().port}|)\r\n`);
        else if (command.startsWith("RETR")) { retrRequested = true; sendTransfer(); }
        else if (command === "QUIT") socket.end("221 Goodbye\r\n");
        else socket.write("200 Command accepted\r\n");
      }
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const stream = await getUri(new URL(`ftp://127.0.0.1:${server.address().port}/fixture.pac`));
    let received = "";
    for await (const chunk of stream) received += chunk.toString("utf8");
    assert.equal(received, payload);
  } finally {
    for (const socket of sockets) socket.destroy();
    await Promise.all([new Promise(resolve => server.close(resolve)), new Promise(resolve => dataServer.close(resolve))]);
  }
});
