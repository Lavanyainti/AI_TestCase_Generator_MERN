import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(cors({ origin: "http://localhost:5173", credentials: true }));

// Load env vars
const port=process.env.PORT || 5000;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const FRONTEND_URL =   'http://localhost:5173';

app.get('/login', (req, res) => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: `http://localhost:${process.env.PORT || 5000}/auth/callback`,
    scope: 'read:user repo', // access to private repos, for public repos you can change scope
    allow_signup: 'true'
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

app.get('/auth/callback', async (req, res) => {
  const code = req.query.code; // code from GitHub
  if (!code) return res.status(400).send('Missing code');

  try {
    // Exchange code for access token
    const tokenResp = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code
      },
      { headers: { Accept: 'application/json' } }
    );

    const access_token = tokenResp.data.access_token;
    if (!access_token) return res.status(500).send('No access token returned');

    // Fetch user info
    const userResp = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${access_token}` }
    });

    // Redirect back to frontend with token + login name
        // Store token in HTTP-only cookie
    res.cookie("github_token", access_token, {
      httpOnly: true,
      secure: false, // change to true if using HTTPS
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
   
    const redirectUrl = `${FRONTEND_URL}/login?login=${encodeURIComponent(userResp.data.login)}`;
    return res.redirect(redirectUrl);

  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).send('OAuth failed');
  }
});

app.get("/:user/repos", async (req, res) => {
  const {user}=req.params
  const token = req.cookies.github_token;
  if (!token) return res.status(401).send("No token found");

  try {
    const ghRes = await axios.get(`https://api.github.com/users/${user}/repos`, {
      headers: { Authorization: `token ${token}` }
    });
    res.json(ghRes.data);
  } catch (err) {
    res.status(500).send("Error fetching repos");
  }
});

async function getAllFiles(owner, repo, path = "", token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const res = await axios.get(url, {
    headers: { Authorization: `token ${token}` },
  });

  let files = [];

  for (const item of res.data) {
    if (item.type === "file") {
      // Get file content
      const fileContent = await axios.get(item.download_url);
      files.push({ name: item.path, content: fileContent.data });
    } else if (item.type === "dir") {
      const subFiles = await getAllFiles(owner, repo, item.path, token);
      files = files.concat(subFiles);
    }
  }
  return files;
}

app.get("/repo/:owner/:repo/files", async (req, res) => {
  const { owner, repo } = req.params;
  const token = req.cookies.github_token; // from auth
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const files = await getAllFiles(owner, repo, "", token);
    res.json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching files" });
  }
});

app.post("/ai/analyze",async(req,res)=>{
  const {filesArray}=req.body
  const token=req.cookies.github_token
  if (!token) return res.status(401).json({ error: "No token" });
  if (!Array.isArray(filesArray) || filesArray.length === 0) return res.status(400).json({ message: "No files" });

  // Basic validation & size check (protect cost and token limits)
  let totalChars = filesArray.reduce((s, f) => s + (f.content?.length || 0), 0);
  if (totalChars > 500000) return res.status(400).json({ message: "Selected files too large. Pick fewer files." });

  // Sanitize: ensure file objects are {name, content}
  const sanitized = filesArray.map(f => ({ name: String(f.name), content: String(f.content) }));

  // Compose prompt (example for "generate test cases")
  const combined = sanitized.map(f => `// File: ${f.name}\n${f.content}`).join("\n\n---\n\n");

  const prompt = `You are an expert developer who writes unit/integration test cases.\nOutput JSON: [{ "file": "filename", "tests": [ { "name": "...", "steps": "...", "assertions": "..." } ] }]\n\nCode:\n${combined}\n\nGenerate test cases.`;

   try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

   return res.json(response.data.choices[0].message);
  } catch (err) {
    console.error("AI call failed:", err.response?.data || err.message);
    return res.status(500).json({ message: "AI provider error" });
  }


})

app.post("/ai/generate-code", async (req, res) => {
  const { testCasesArray } = req.body;

  if (!testCasesArray || !Array.isArray(testCasesArray)) {
    return res.status(400).json({ error: "Invalid testCasesArray" });
  }

  const prompt = `
You are a test automation code generator.
Generate Playwright test code for the following cases.
Respond ONLY with valid JSON in this exact format:
[
  {
    "name": "Test case name",
    "code": "JavaScript code with \\n for newlines and escaped quotes"
  }
]

Here are the test cases:
${JSON.stringify(testCasesArray, null, 2)}
`;

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    let aiContent = response.data.choices[0].message.content.trim();

    // Extract JSON between ```json ... ```
    const jsonMatch = aiContent.match(/```json([\s\S]*?)```/);
    if (jsonMatch) {
      aiContent = jsonMatch[1];
    }

    // Parse safely
    let parsedData;
    try {
      const match = aiContent.match(/```json([\s\S]*?)```/);
      if (match && match[1]) {
        parsedData = JSON.parse(match[1]);
      } else {
        // If no triple backticks, parse directly
        parsedData = JSON.parse(aiContent);
      }
    } catch (parseErr) {
      console.error("Parse error. Raw AI output:", aiContent);
      return res.status(500).json({ error: "Invalid JSON from AI" });
    }

    res.json(parsedData);
  } catch (err) {
    console.error("AI call failed:", err.response?.data || err.message);
    res.status(500).json({ error: "AI request failed" });
  }
});

app.listen(port, ()=>{
    console.log(`Server listening at port ${port}`)
})