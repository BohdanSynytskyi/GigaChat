const URL = "ws://localhost:8080"
const ws = new WebSocket(URL);

ws.addEventListener('open', (event) => {
    console.log("Connection established.");
    ws.send("Hello server");
});


ws.addEventListener('message', (event) => {
    console.log(`Message received: ${event.data}`);
});


ws.addEventListener('close', (event) => {
    console.log(`Websocket connection closed.`);
});

document.addEventListener('DOMContentLoaded', (event) => {
  const button = document.getElementById('submit');
  button.onclick = function() {
      const inputField = document.getElementById("input");
      ws.send(inputField.value);
  };
});
