function updateClock(){
    const now = new Date();
    let h = now.getHours().toString().padStart(2,'0');
    let m = now.getMinutes().toString().padStart(2,'0');
    let s = now.getSeconds().toString().padStart(2,'0');
    document.getElementById("clock").innerText = `${h}:${m}:${s}`;
}

setInterval(updateClock,1000);
updateClock();


async function login() {

    const userIdInput = document.getElementById("userId");
    const passwordInput = document.getElementById("password");
    const messageEl = document.getElementById("message");

    const userId = userIdInput.value.trim();
    const password = passwordInput.value.trim();

    if (messageEl) messageEl.innerText = "";

    // Basic validation
    if (!userId || !password) {

        if (messageEl) {
            messageEl.innerText = "Please enter both User ID and Password.";
        } else {
            alert("Please enter both User ID and Password.");
        }
        return;
    }

    console.log("Trying login:", userId);

    try {

        const response = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                userId: userId,
                password: password
            })
        });

        const data = await response.json();

        console.log("Server response:", data);

        if (response.ok) {

            // =============================
            // VOTER LOGIN
            // =============================
            if (data.alreadyVoted) {

                document.getElementById("message").innerText =
                    "YOUR VOTE IS ALREADY CASTED";

                return;
            }

            if (data.role === "voter") {

                localStorage.setItem("voterLoggedIn","true");
                localStorage.setItem("voterName",data.name);
                localStorage.setItem("state",data.state);
                localStorage.setItem("district",data.district);
                localStorage.setItem("constituency",data.constituency);

                window.location.href = "voterPanel.html";

            }

            // =============================
            // ADMIN LOGIN
            // =============================
            else if (data.role === "admin") {

                sessionStorage.setItem("adminLoggedIn", "true");
                sessionStorage.setItem("adminName", data.name);

                window.location.href = "adminPanel.html";
            }

            else {

                if (messageEl) {
                    messageEl.innerText = "Unknown role received from server.";
                }

            }

        } else {

            if (messageEl) {
                messageEl.innerText = data.message || "Login failed.";
            } else {
                alert(data.message || "Login failed.");
            }

        }

    } catch (error) {

        console.error("Login error:", error);

        if (messageEl) {
            messageEl.innerText = "Unable to connect to server.";
        } else {
            alert("Unable to connect to server.");
        }

    }

    userIdInput.value="";
    passwordInput.value="";
}