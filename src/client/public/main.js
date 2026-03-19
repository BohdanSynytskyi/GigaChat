const URL = "http://localhost:8080";
async function getChatButtons(event) {
    const chatsContainer = document.getElementById("chats");
    chatsContainer.value = null;
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
            newButton.addEventListener('click', () => createChatRoom(chat.chat_id));
            chatsContainer.append(newButton);
        }
    } else {
        chatsContainer.value = "There are no chatrooms associated with you account";
    }   
}

async function createChatRoom(chatId) {
    const chatWindow = document.getElementById("chat-window");
    const messages = await getChatMessages(chatId);
    for(const message of messages) {
        chatWindow.innerHTML += `<div class="message received">${message.content}</div>`;
    }
    const ws = startWebSocketConnection(chatId);
    const messageInput = document.getElementById("message-input");
    document.getElementById("send-btn").addEventListener('click', () => {
        ws.send(messageInput.value);

    });

}

async function getChatMessages(chatId) {
    const res = await fetch(`${URL}/chats/${chatId}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
        }
    });
    const messages = await res.json();
    console.log(messages);
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


function startWebSocketConnection(chatId) {
    const URL = `ws://localhost:8080?chat_id=${chatId}&token=${localStorage.getItem("token")}`
    const ws = new WebSocket(URL);

     ws.addEventListener('open', (event) => {
        console.log("Connection established.");
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
    return ws;
}

