import React, { useEffect, useState } from 'react';
import axios from "axios";
import { FaGithub } from "react-icons/fa";

const Login = () => {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [repos, setRepos] = useState([]);
  const [token, setToken] = useState("");
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [sending, setSending] = useState(false);
  const [testCases, setTestCases] = useState([]);
  const [selectedTestCase, setSelectedTestCase] = useState(new Set());
  const [generatedCode, setGeneratedCode] = useState([]);
  const [sendingTC,setSendingTC]=useState(false)

  const toggle = (name) => {
    const s = new Set(selected);
    s.has(name) ? s.delete(name) : s.add(name);
    setSelected(s);
  };

  const toggleTC = (name) => {
    const t = new Set(selectedTestCase);
    t.has(name) ? t.delete(name) : t.add(name);
    setSelectedTestCase(t);
  };

  const handleSendToAI = async () => {
    if (selected.size === 0) return alert("Select 1+ files");
    setSending(true);
    try {
      const chosen = files.filter(f => selected.has(f.name));
      const fileContents = await Promise.all(
        chosen.map(async (f) => ({
          name: f.name,
          content: f.content
        }))
      );
      const resp = await axios.post("http://localhost:5000/ai/analyze", { filesArray: fileContents }, { withCredentials: true });
      if (resp) {
        const jsonData = extractJson(resp.data.content);
        if (jsonData) setTestCases(jsonData);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to send to AI: " + (err?.response?.data?.message || err.message));
    } finally {
      setSending(false);
    }
  };

  function extractJson(content) {
    const match = content.match(/```json([\s\S]*?)```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (e) {
        console.error("Invalid JSON from AI", e);
      }
    }
    return null;
  }

  const handleSendTCAI = async () => {
    if (selectedTestCase.size === 0) return alert("Select 1+ files");
    setSendingTC(true);
    try {
      const chosenTC = [];
      testCases.forEach(fileData => {
        fileData.tests.forEach(test => {
          if (selectedTestCase.has(test.name)) {
            chosenTC.push({
              file: fileData.file,
              name: test.name,
              steps: test.steps
            });
          }
        });
      });

      const resp = await axios.post(
        "http://localhost:5000/ai/generate-code",
        { testCasesArray: chosenTC },
        { withCredentials: true }
      );

      if (resp && resp.data) {
        setGeneratedCode(resp.data);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setSendingTC(false);
    }
  };

  useEffect(() => {
    const queryString = window.location.search || window.location.hash.replace("#", "?");
    const urlParams = new URLSearchParams(queryString);
    const name = urlParams.get("login");
    if (name) {
      setUsername(name);
    }
  }, []);

  useEffect(() => {
    if (!username) return;
    axios.get(`http://localhost:5000/${username}/repos`, { withCredentials: true })
      .then(res => setRepos(res.data))
      .catch(err => console.error(err));
  }, [username]);

  const handleFetchRepoFiles = async (owner, repo) => {
    try {
      const res = await axios.get(
        `http://localhost:5000/repo/${owner}/${repo}/files`,
        { withCredentials: true }
      );
      setFiles(res.data);
    } catch (err) {
      console.error("Error fetching repo files:", err);
    }
  };

  const handleLogin = () => {
    window.location.href = "http://localhost:5000/login";
  };

  return (
    <div className="p-6 flex flex-col gap-6 mt-10 max-w-7xl mx-auto">
    <div className='w-full text-center'>
        <h1 className="font-bold sm:text-4xl text-2xl text-primary">GitHub OAuth App</h1>
    </div>
      {!username ? (
        <div className='flex justify-center'>
              <button
                  onClick={handleLogin}
                  className="rounded flex gap-2 items-center justify-center w-60 text-white px-4 py-2 bg-primary hover:bg-primary/90 hover:cursor-pointer"
                  >
                  <FaGithub size={20} /> Login with GitHub
              </button>
        </div>
        
      ) : (
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-4">{username}'s Repositories</h2>
          <div className="flex flex-wrap gap-3">
            {repos.map((repo) => (
              <div
                key={repo.id}
                onClick={() => handleFetchRepoFiles(username, repo.name)}
                className="cursor-pointer px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 transition"
              >
                {repo.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files */}
      {files.length > 0 && (
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-4">Files</h2>
          <div className="space-y-2">
            {files.map((file, index) => (
              <label key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded hover:bg-gray-100 hover:cursor-pointer">
                <input type="checkbox" className='hover:cursor-pointer' checked={selected.has(file.name)} onChange={() => toggle(file.name)} />
                {file.name}
              </label>
            ))}
          </div>
          <button
            onClick={handleSendToAI}
            disabled={selected.size === 0 || sending}
            className="mt-4 px-4 py-2  text-white rounded bg-primary/90 hover:bg-primary disabled:bg-gray-400 hover:cursor-pointer"
          >
            {sending ? "Sending..." : "Send Selected Files to AI"}
          </button>
        </div>
      )}

      <div className="flex gap-6 sm:flex-row flex-col" >
        {/* Test Cases */}
        
          {testCases.length > 0 ? (
            <div className="sm:w-1/2 bg-white p-4 rounded shadow h-120 overflow-y-auto hover:cursor-pointer" >
            {testCases.map((fileData, index) => (
              <div key={index} className="mb-6">
                <h3 className="font-bold text-lg mb-2">{fileData.file}</h3>
                <div className="space-y-3">
                  {fileData.tests.map((test, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded hover:cursor-pointer">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className='hover:cursor-pointer' checked={selectedTestCase.has(test.name)} onChange={() => toggleTC(test.name)} />
                        <span className="font-medium hover:cursor-pointer" >{test.name}</span>
                      </label>
                      <p className="text-sm text-gray-600"><strong>Steps:</strong> {test.steps}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleSendTCAI}
                  disabled={selectedTestCase.size === 0 || sendingTC}
                  className="mt-4 px-4 py-2  text-white rounded  bg-primary/90 hover:bg-primary disabled:bg-gray-400 hover:cursor-pointer"
                >
                  {sendingTC ? "Sending..." : "Generate Code"}
                </button>
              </div>
            ))}
            </div>
          ) : (
            ""
          )}
        

        {/* Generated Code */}
        
          {generatedCode.length > 0 ? (
            <div className="sm:w-1/2 bg-white p-4 rounded shadow h-120 overflow-y-auto">
            {generatedCode.map((tc, idx) => {
              const count=idx+1;
              return (
              <div key={idx} className="mb-4 border rounded p-3 bg-gray-50">
                <div className="mb-2"><h3 className='font-semibold'>{"Testcse-"+count+": "}</h3> <span>{tc.name}</span>  </div>
                <pre className="bg-black text-green-400 p-3 rounded overflow-x-auto text-sm">
                  <code>{tc.code}</code>
                </pre>
              </div>
            )})}
            </div>
          ) : (
            ""
          )}
      </div>
    </div>
  );
};

export default Login;
