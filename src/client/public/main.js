const URL = "http://localhost:8080";
async function getChatButtons(event) {
    const chatsContainer = document.getElementById("chats");
    chatsContainer.value = null;
    const res = await fetch(`${URL}/chats`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${sessionStorage.getItem("token")}`,
        }
    });
    console.log(`Bearer  ${sessionStorage.getItem("token")}`);
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
    chatWindow.innerHTML = null;
    const messages = await getChatMessages(chatId);
    if(messages.length > 0) {
        for(const message of messages) {
            const msgDiv = document.createElement('div');
            console.log(`Sender_id: ${message.sender_id}, User_id: ${sessionStorage.getItem("user_id")}`);
            msgDiv.className =  message.sender_id === sessionStorage.getItem("user_id") 
                                                ? 'message sent' : 'message received';
            msgDiv.textContent = message.content;
            chatWindow.appendChild(msgDiv);
        }
    }
    const ws = startWebSocketConnection(chatId, chatWindow);
    const messageInput = document.getElementById("message-input");
    document.getElementById("send-btn").addEventListener('click', () => {
        ws.send(messageInput.value);
    });
}

async function getChatMessages(chatId) {
    const res = await fetch(`${URL}/chats/${chatId}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${sessionStorage.getItem("token")}`,
        }
    });
    const messages = await res.json();
    return messages;
}



function startWebSocketConnection(chatId, chatWindow) {
    const URL = `ws://localhost:8080?chat_id=${chatId}&token=${sessionStorage.getItem("token")}`
    const ws = new WebSocket(URL);
    
    ws.addEventListener('open', (event) => {
        console.log("Connection established.");
    });


    ws.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        console.log(`Message received: ${message.content}`);
        const msgDiv = document.createElement('div');
        console.log(`Sender_id: ${message.sender_id}, User_id: ${sessionStorage.getItem("user_id")}`)
        msgDiv.className =  message.sender_id === sessionStorage.getItem("user_id") 
                                              ? 'message sent' 
                                              : 'message received';
        msgDiv.textContent = message.content;
        chatWindow.appendChild(msgDiv);
    });


    ws.addEventListener('close', (event) => {
        console.log(`Websocket connection closed.`);
    });

    return ws;
}

document.addEventListener("DOMContentLoaded", getChatButtons);

document.getElementById("create_chat").addEventListener("click", async (event) => {
    const chatName = document.getElementById("chat_name").value.trim();
    await fetch(`${URL}/chats`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionStorage.getItem("token")}`,
        },
        body: JSON.stringify({ name: chatName})
    });
    getChatButtons();
});
