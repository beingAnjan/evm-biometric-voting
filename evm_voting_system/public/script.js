function updateClock(){
    const now = new Date();
    let h = now.getHours().toString().padStart(2,'0');
    let m = now.getMinutes().toString().padStart(2,'0');
    let s = now.getSeconds().toString().padStart(2,'0');
    document.getElementById("clock").innerText = `${h}:${m}:${s}`;
}

setInterval(updateClock,1000);
updateClock();

async function loadElectionAvailability() {
    const statusElement = document.getElementById("electionAvailability");
    if (!statusElement) return;

    try {
        const response = await fetch("/election-status");
        const data = await response.json();
        const messages = {
            not_configured: "Voting is not available yet.",
            scheduled: `Voting is scheduled to open ${new Date(data.startAt).toLocaleString()} (local time).`,
            open: `Voting is open for ${data.title}.`,
            closed: "Voting is currently closed."
        };
        const message = messages[data.status] || messages.closed;
        const messageSpan = statusElement.querySelector("span:last-child");
        if (messageSpan) messageSpan.textContent = message;
        else statusElement.textContent = message;
        statusElement.dataset.status = data.status || "closed";
    } catch (error) {
        const messageSpan = statusElement.querySelector("span:last-child");
        if (messageSpan) messageSpan.textContent = "Election status is unavailable.";
        else statusElement.textContent = "Election status is unavailable.";
        statusElement.dataset.status = "closed";
    }
}

loadElectionAvailability();


async function login(event) {

    if (event) event.preventDefault();

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

                // A new login always starts a fresh ballot and fingerprint check.
                ["fingerVerified", "pendingCandidate"].forEach(function (key) {
                    localStorage.removeItem(key);
                });
                localStorage.setItem("voterLoggedIn","true");
                localStorage.setItem("voterName",data.name);
                localStorage.setItem("state",data.state);
                localStorage.setItem("district",data.district);
                localStorage.setItem("constituency",data.constituency);
                localStorage.setItem("voterId", userId);
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

}
