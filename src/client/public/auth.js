const URL = "http://localhost:8080";
let token;

const form = document.getElementById("form");
form.onsubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const endpoint = window.location.pathname;
    const payload = JSON.stringify(Object.fromEntries(formData));
    console.log("Sending to the server: ", payload);
    const response = await fetch(URL + endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: payload,
    });
    const result = await response.json();
    if(response.ok && result.token){
        token = result.token;
        localStorage.setItem("token", token)
        window.location.href = "/home";
    } else {
        console.error("Login failed: ", result);
    }
};
