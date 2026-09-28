(function () {
    const NAVY = "#0A1F44";
    const NAVY_LIGHT = "#13315C";
    const SKY = "#2E86AB";
    const GOLD = "#F0A500";
    const CLOUD = "#F7F9FC";
    const SLATE = "#44506B";

    const token = localStorage.getItem("token");
    if (!token) return; // only show the assistant to logged-in users

    // ---- Inject styles ----
    const style = document.createElement("style");
    style.textContent = `
        #aw-bubble {
            position: fixed; bottom: 24px; right: 24px;
            width: 58px; height: 58px; border-radius: 50%;
            background: ${GOLD}; color: ${NAVY};
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; box-shadow: 0 10px 30px rgba(10,31,68,0.35);
            z-index: 9999; border: none; font-size: 24px;
            transition: transform 0.15s ease;
        }
        #aw-bubble:hover { transform: scale(1.06); }
        #aw-panel {
            position: fixed; bottom: 96px; right: 24px;
            width: 340px; max-width: 90vw; height: 460px; max-height: 70vh;
            background: white; border-radius: 14px;
            box-shadow: 0 20px 60px rgba(10,31,68,0.35);
            display: none; flex-direction: column; overflow: hidden;
            z-index: 9999; font-family: 'Inter', sans-serif;
        }
        #aw-panel.open { display: flex; }
        #aw-header {
            background: linear-gradient(135deg, ${NAVY} 0%, ${SKY} 130%);
            color: white; padding: 16px 18px;
            font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 14.5px;
        }
        #aw-header span { display:block; font-weight: 400; font-size: 11.5px; opacity: 0.8; margin-top: 2px; }
        #aw-messages {
            flex: 1; overflow-y: auto; padding: 14px; background: ${CLOUD};
        }
        .aw-msg { margin-bottom: 12px; max-width: 85%; font-size: 13.3px; line-height: 1.45; }
        .aw-msg.user { margin-left: auto; }
        .aw-msg .bubble { padding: 9px 13px; border-radius: 12px; display: inline-block; }
        .aw-msg.user .bubble { background: ${NAVY}; color: white; border-bottom-right-radius: 3px; }
        .aw-msg.ai .bubble { background: white; color: ${NAVY}; border: 1px solid #e2e6ed; border-bottom-left-radius: 3px; white-space: pre-wrap; }
        #aw-inputrow { display: flex; padding: 10px; gap: 8px; border-top: 1px solid #eef1f5; background: white; }
        #aw-input {
            flex: 1; border: 1.5px solid #e2e6ed; border-radius: 8px;
            padding: 9px 12px; font-size: 13px; font-family: inherit; outline: none;
        }
        #aw-input:focus { border-color: ${SKY}; }
        #aw-send {
            background: ${GOLD}; color: ${NAVY}; border: none; border-radius: 8px;
            padding: 0 16px; font-weight: 700; cursor: pointer; font-size: 13px;
        }
        #aw-send:disabled { opacity: 0.5; cursor: default; }
    `;
    document.head.appendChild(style);

    // ---- Inject markup ----
    const bubble = document.createElement("button");
    bubble.id = "aw-bubble";
    bubble.innerHTML = "&#9992;&#65039;";
    bubble.title = "Ask the Aerowing Assistant";
    document.body.appendChild(bubble);

    const panel = document.createElement("div");
    panel.id = "aw-panel";
    panel.innerHTML = `
        <div id="aw-header">
            Aerowing Assistant
            <span>Ask about flights, prices, or routes</span>
        </div>
        <div id="aw-messages"></div>
        <div id="aw-inputrow">
            <input id="aw-input" type="text" placeholder="e.g. flights to Dubai under $500">
            <button id="aw-send">Send</button>
        </div>
    `;
    document.body.appendChild(panel);

    const messagesDiv = panel.querySelector("#aw-messages");
    const input = panel.querySelector("#aw-input");
    const sendBtn = panel.querySelector("#aw-send");

    addMessage("ai", "Hi! I'm your Aerowing travel assistant. Ask me things like \"cheapest flight\" or \"any flights this weekend?\"");

    bubble.addEventListener("click", () => {
        panel.classList.toggle("open");
        if (panel.classList.contains("open")) input.focus();
    });

    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") sendMessage();
    });

    function addMessage(role, text) {
        const msg = document.createElement("div");
        msg.className = "aw-msg " + role;
        msg.innerHTML = `<div class="bubble"></div>`;
        msg.querySelector(".bubble").innerText = text;
        messagesDiv.appendChild(msg);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        addMessage("user", text);
        input.value = "";
        sendBtn.disabled = true;
        addMessage("ai", "Thinking...");

        try {
            const response = await fetch("/api/assistant/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },
                body: JSON.stringify({ message: text })
            });

            const reply = await response.text();

            // remove the "Thinking..." placeholder
            messagesDiv.removeChild(messagesDiv.lastChild);

            if (response.ok) {
                addMessage("ai", reply);
            } else {
                addMessage("ai", "Sorry, something went wrong. Please try again.");
            }
        } catch (error) {
            messagesDiv.removeChild(messagesDiv.lastChild);
            addMessage("ai", "Could not reach the server. Is the backend running?");
            console.error(error);
        } finally {
            sendBtn.disabled = false;
        }
    }
})();