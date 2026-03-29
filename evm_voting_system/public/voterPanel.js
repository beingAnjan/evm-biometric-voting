let selectedCandidate = null;

document.addEventListener("DOMContentLoaded", function () {

    // 🔐 Prevent direct access without login
    if (localStorage.getItem("voterLoggedIn") !== "true") {
        window.location.replace("page.html");
        return;
    }

    const voterName = localStorage.getItem("voterName");
    const state = localStorage.getItem("state");
    const district = localStorage.getItem("district");
    const constituency = localStorage.getItem("constituency");

    // Show logged in user
    if (voterName) {
        document.getElementById("voterName").innerText =
            "Logged in as " + voterName;
    }


    // 🚪 Logout button
    document.getElementById("logoutBtn").addEventListener("click", function () {

        localStorage.removeItem("voterLoggedIn");
        localStorage.removeItem("voterName");
        localStorage.removeItem("state");
        localStorage.removeItem("district");
        localStorage.removeItem("constituency");

        window.location.replace("page.html");

    });


    // 🗳️ Vote button
    document.getElementById("voteBtn").addEventListener("click", async function(){

        if(!selectedCandidate){
            alert("Please select a candidate before voting.");
            return;
        }

        const voterName = localStorage.getItem("voterName");

        try{

            const response = await fetch("/vote",{
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify({
                    voterName:voterName,
                    candidateId:selectedCandidate
                })
            });

            const data = await response.json();

            if(response.ok){

                // Show success message
                alert("Your vote has been recorded");

                // Clear login session
                localStorage.removeItem("voterLoggedIn");
                localStorage.removeItem("voterName");
                localStorage.removeItem("state");
                localStorage.removeItem("district");
                localStorage.removeItem("constituency");

                // Redirect to login page
                window.location.replace("page.html");

            }
            else{
                alert(data.message);
            }

        }
        catch(err){
            console.error(err);
            alert("Vote submission failed.");
        }

    });


    // Load candidates
    loadCandidates(state, district, constituency);

});



async function loadCandidates(state, district, constituency) {

    const grid = document.getElementById("candidateGrid");

    try {

        const response = await fetch(
            `/candidates?state=${state}&district=${district}&constituency=${constituency}`
        );

        const candidates = await response.json();

        grid.innerHTML = "";

        candidates.forEach(c => {

            const card = document.createElement("div");

            card.classList.add("card");
            card.dataset.id = c.candidateId;

            card.innerHTML = `
                <div class="selected-badge">✔ Selected</div>

                <div class="card-header">

                    <div class="avatar">${c.name.charAt(0)}</div>

                    <div>
                        <div class="candidate-name">${c.name}</div>
                        <div class="party">${c.party}</div>
                    </div>

                </div>

                <div class="candidate-id">
                    Candidate ID: ${c.candidateId}
                </div>
            `;

            grid.appendChild(card);

        });

        activateSelection();

    }
    catch(err){
        console.error("Failed to load candidates", err);
    }

}



function activateSelection(){

    const cards = document.querySelectorAll(".card");

    cards.forEach(card => {

        card.addEventListener("click", function(){

            cards.forEach(c=>{
                c.classList.remove("selected");
                c.classList.add("faded");
            });

            this.classList.remove("faded");
            this.classList.add("selected");

            selectedCandidate = this.dataset.id;

        });

    });

}