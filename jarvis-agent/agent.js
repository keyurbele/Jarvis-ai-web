const express = require("express");
const { exec } = require("child_process");
const cors = require("cors"); // Critical for browser communication

const app = express();
app.use(express.json());
app.use(cors()); // Allows your Next.js app to talk to this local server

app.post("/command", (req, res) => {
  const { action } = req.body;
  console.log("⚡ Executing:", action);

  // Command mapping for Windows (Adjust strings for Mac/Linux)
  const commands = {
    "open_calculator": "calc",
    "open_notepad": "notepad",
    "open_code": "code", // Opens VS Code if installed
    "open_browser": "start chrome",
  };

  const command = commands[action];

  if (command) {
    exec(command, (error) => {
      if (error) return res.status(500).json({ error: error.message });
      res.json({ status: "Executed successfully" });
    });
  } else {
    res.status(400).json({ status: "Unknown Command" });
  }
});

app.listen(3001, () => {
  console.log("📡 Jarvis Local Agent active on http://localhost:3001");
});
