// client/src/App.jsx
import React, { useState, useRef, useEffect } from "react";

let dev_link='http://localhost:3001/api/chat'
let production_link = 'https://chatbot-production-b03e.up.railway.app/api/chat';
const App = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);

const welcomeMessage = {
  role: "assistant",
  content: `Whazzzzzuuupppp! I am a pretty dope chatbot. I know like facts and stuff. I love surfin and always got the 411 on the weather. I skimmed a bunch of meeting notes and can give you the low down about them if you ask. You can tell me your secrets. I will remember them and never tell, pinky swear...unless you ask me about them. Whatcha wanna know bruh?
`,
};

console.log(welcomeMessage.content)

useEffect(() => {
  // Add welcome message on component mount
  setMessages([welcomeMessage]);
}, []);

  const fetchStream = async (e) => {
    e.preventDefault();
    if (!input.trim()) return; // Prevent empty submissions

    // Add the user's message to the chat
    const userMessage = { id: Date.now(), role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput(""); // Clear the input field
    setTimeout(() => {
      inputRef.current.focus(); // Refocus the input field
    }, 2000);
    setIsLoading(true);

    const assistantMessageId = Date.now() + 1; // Unique ID for assistant's message
    setMessages((prev) => [
      ...prev,
      { id: assistantMessageId, role: "assistant", content: "" },
    ]);

    try {
      const response = await fetch(production_link, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let assistantContent = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          
          const chunk = decoder.decode(value, { stream: true });
          assistantContent += chunk; // Accumulate the assistant's response

          // Update the messages state with partial response
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: assistantContent }
                : msg
            )
          );
        }
      }
    } catch (error) {
      console.error("Error fetching stream:", error);
    } finally {
      setIsLoading(false); // Reset loading indicator
    }
  }

  return (
    <div
    style={{
      fontFamily: "Arial, sans-serif",
      maxWidth: "600px",
      margin: "0 auto",
      padding: "10px",
    }}
    >
      <div>
        <h1 style={{textAlign: 'center'}}>Surfer Bot</h1>
        <div
          style={{
            fontSize: "1.5rem",
            border: "1px solid #ccc",
            padding: "10px",
            marginBottom: "10px",
            minHeight: "20rem",
            overflowY: "auto",
          }}
        >
          {messages.map((message) => (
            <div key={message.id} style={{ margin: "5px 0" }}>
              <b>{message.role === "user" ? "User: " : "AI: "}</b>
              {message.content}
            </div>
          ))}
        </div>

        <form
          onSubmit={fetchStream}
          style={{
            display: "flex",
            gap: "10px",
            width: "100%",
            flexWrap: "wrap",
          }}
        >
          <input
            ref={inputRef} // Attach the input field reference
            name="prompt"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            style={{ 
              flex: 1,
              fontSize: "1rem",
              padding: "10px",
              minWidth: "70%",
              boxSizing: "border-box",
             }}
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading} style={{fontSize: "1rem",
              padding: "10px",
              minWidth: "20%",
              boxSizing: "border-box"}}>
            {isLoading ? "Loading..." : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default App;
