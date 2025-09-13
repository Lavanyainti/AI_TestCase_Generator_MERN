Project: AI_TestCase_Generator

Explanation: This is a medium between user and AI which acts as a automatic test case generator with the help of Grok AI. In this app user can login with their github account and get their Repositeries. They can select required files under their required file. They get testcases from AI to their files. They can again select requires Testcases which will send back to ai to generate test code. 

## Features
- GitHub OAuth login for user authentication
- Fetch user repositories and files
- Select specific files to generate test cases
- AI-generated test cases using Grok AI
- Select and generate executable test code for selected test cases
- User-friendly interface built with React

## Tech Stack
- **Frontend:** React, Tailwind CSS
- **Backend:** Node.js, Express
- **Authentication:** GitHub OAuth
- **AI Integration:** Grok AI API
- **Other Libraries:** Axios, Cookie-Parser, CORS, dotenv

## How it Works
1. User logs in with GitHub OAuth.
2. Backend fetches the user’s repositories and files.
3. User selects files to generate AI-based test cases.
4. AI provides test cases in JSON format.
5. User selects specific test cases to generate executable code.
6. Generated test code is ready to use for testing automation.



## Setup Instructions
Create a `.env` file in the `Server` folder with the following:

CLIENT_ID=<YOUR_GITHUB_CLIENT_ID>
CLIENT_SECRET=<YOUR_GITHUB_CLIENT_SECRET>
GROQ_API_KEY=<YOUR_GROK_API_KEY>
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000

-**Frontend Folder**: Client
-**Backend Folder**: Server
-**Forntend & Backend Command** : npm run dev