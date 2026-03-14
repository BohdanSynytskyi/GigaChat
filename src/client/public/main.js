const URL = "http://localhost:8080";
async function getChatButtons(event) {
    const chatsContainer = document.getElementById("chats");
    const res = await fetch(`${URL}/chats`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
        }
    });
    console.log(`Bearer  ${localStorage.getItem("token")}`);
    const chats = await res.json();
    if(res.ok && chats){
        for(const chat of chats) {
            const newButton = document.createElement("button")
            newButton.textContent = chat.name;
            newButton.onclick = (event) => {
                window.location.href = `/chats/${chat.id}`;
            };
            chatsContainer.append(newButton);
        }
    } else {
        chatsContainer.innerText = "There are no chatrooms associated with you account";
    }   
}

document.addEventListener("DOMContentLoaded", getChatButtons);

document.getElementById("create_chat").addEventListener("click", async (event) => {
    const chatName = document.getElementById("chat_name").value.trim();
    await fetch(`${URL}/chats`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ name: chatName})
    });
    getChatButtons();
});



//const URL = "ws://localhost:8080"
//const ws = new WebSocket(URL);

// ws.addEventListener('open', (event) => {
//    console.log("Connection established.");
//    ws.send("Hello server");
//});
//
//
//ws.addEventListener('message', (event) => {
//    console.log(`Message received: ${event.data}`);
//});
//
//
//ws.addEventListener('close', (event) => {
//    console.log(`Websocket connection closed.`);
//});

//document.addEventListener('DOMContentLoaded', (event) => {
//  const button = document.getElementById('submit');
//  button.onclick = function() {
//      const inputField = document.getElementById("input");
//      ws.send(inputField.value);
//  };
//});

