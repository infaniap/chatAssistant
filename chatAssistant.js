/**
 * ============================================================================
 * chatAssistant.js - AI Chat Assistant (Reusable across TCL)
 * ============================================================================
 */

class ChatAssistant {
  constructor(config = {}) {
    this.apiBase = config.apiBase || "http://localhost:3000";
    this.fileMap = config.fileMap || {};
    this.systemPrompt = config.systemPrompt || "You are a helpful coding assistant.";
    this.busy = false;

    this.init();
  }

  init() {
    // Create chatbot HTML if not exists
    let chatbot = document.getElementById("chatbot");
    if (!chatbot) {
      chatbot = document.createElement("div");
      chatbot.id = "chatbot";
      chatbot.innerHTML = `
        <button id="chatToggle">💬 AI Assistant</button>
        <div id="chatMessages"></div>
        <div id="chatInputRow">
          <input id="chatInput" placeholder="Ask about this project..." />
          <button id="sendChat">Send</button>
        </div>
      `;
      document.body.appendChild(chatbot);
    }

    this.chatbot = chatbot;
    this.chatMessages = document.getElementById("chatMessages");
    this.chatInput = document.getElementById("chatInput");
    this.sendBtn = document.getElementById("sendChat");
    this.toggleBtn = document.getElementById("chatToggle");

    // Event listeners
    this.sendBtn.onclick = () => this.sendMessage();
    this.chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.sendMessage();
    });

    // Toggle minimize/expand
    this.toggleBtn.onclick = () => {
      this.chatbot.classList.toggle("minimized");
    };

    // Start minimized
    this.chatbot.classList.add("minimized");
  }

  async sendMessage() {
    if (this.busy) return;
    this.busy = true;
    this.sendBtn.disabled = true;

    const text = this.chatInput.value.trim();
    if (!text) {
      this.busy = false;
      this.sendBtn.disabled = false;
      return;
    }

    this.chatInput.value = "";
    this.addMessage("user", text);

    // Auto-load relevant files based on keywords
    let fileContext = "";
    for (const [keyword, filename] of Object.entries(this.fileMap)) {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        const content = await this.loadFile(filename);
        if (content) {
          fileContext += `\n\n--- FILE: ${filename} ---\n${content}`;
        }
      }
    }

    // Send to backend
    try {
      const res = await fetch(`${this.apiBase}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          fileContext,
          systemPrompt: this.systemPrompt,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      this.addMessage("ai", data.reply);
    } catch (error) {
      this.addMessage("ai", "❌ Error connecting to AI assistant. Is the backend running?");
      console.error("Chat error:", error);
    }

    this.busy = false;
    this.sendBtn.disabled = false;
  }

  async loadFile(filename) {
    try {
      const res = await fetch(`${this.apiBase}/api/file/${filename}`);
      if (res.ok) {
        return await res.text();
      }
    } catch (error) {
      console.warn(`Could not load file: ${filename}`, error);
    }
    return null;
  }

  addMessage(type, text) {
    const label = type === "user" ? "You" : "AI";
    const p = document.createElement("p");
    p.className = type;
    p.innerHTML = `<strong>${label}:</strong> ${text}`;
    this.chatMessages.appendChild(p);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

    // Expand if minimized when new message arrives
    if (type === "ai") {
      this.chatbot.classList.remove("minimized");
    }
  }
}

// Export for module usage
export default ChatAssistant;