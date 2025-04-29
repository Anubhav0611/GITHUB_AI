
# GitHub Automation Project

A web application that simplifies GitHub repository management with the power of AI. It integrates the GitHub API and Google Gemini AI to perform tasks like pull request fetching, code review generation, and BDD test creation via an interactive UI.

## 🚀 Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Motivation](#motivation)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Setup Instructions](#setup-instructions)
- [Backend Implementation](#backend-implementation)
- [Frontend Implementation](#frontend-implementation)
- [Usage](#usage)
- [Challenges and Solutions](#challenges-and-solutions)
- [Future Enhancements](#future-enhancements)
- [Conclusion](#conclusion)

---

## 🧾 Overview

The **GitHub Automation** project streamlines repository tasks with the help of Flask (backend), React (frontend), and Gemini AI. Features include GitHub integration, JWT-based authentication, and AI-powered insights.

---

## ❓ Problem Statement

Manually managing GitHub tasks is repetitive and inefficient, especially across multiple projects. Current tools lack AI-driven automation and intuitive UIs. This project bridges that gap.

---

## 💡 Motivation

- Save developers’ time through automation
- Leverage Google Gemini AI for insights
- Provide a responsive and themeable UI
- Ensure secure access via JWT
- Open-source contribution to benefit the developer community

---

## ✨ Features

- 🔐 **Authentication**: JWT-based secure login/signup
- 🔧 **GitHub Automation**: Fetch, create PRs; analyze code
- 🤖 **AI-Powered**: Use Gemini to generate reviews & BDD tests
- 💬 **Chat UI**: Real-time prompt handling
- 🎨 **Themes**: Light, dark, and neon
- 📂 **Sidebar**: History and help panel

---

## 🛠️ Tech Stack

### Backend

- Flask 3.0.2
- Flask-CORS, PyJWT, Werkzeug
- PyGithub, google-generativeai
- Python-dotenv, Requests

### Frontend

- React 18
- React Router, Axios
- CSS with theme variables

---

## 🏗️ Architecture

- **Client-Server Model**
- React Frontend ↔ Flask Backend
- Prompts processed via Gemini and returned as JSON
- RESTful communication

---

## 🧰 Setup Instructions

### Prerequisites

- Python 3.9+
- Node.js 16+
- GitHub Token & Gemini API Key

### Backend

```bash
git clone <repository-url>
cd <repo>/backend
pip install -r requirements.txt
```

Create `.env`:

```
GEMINI_API_KEY=<your-key>
GITHUB_TOKEN=<your-token>
JWT_SECRET_KEY=<secret>
```

Run server:

```bash
python app.py
```

### Frontend

```bash
cd <repo>/frontend
npm install
```

Set API URL in `.env`:

```
REACT_APP_API_URL=http://localhost:5000
```

Start frontend:

```bash
npm start
```

---

## 🔌 Backend Implementation

### Key Endpoints

- `POST /signup`: Register
- `POST /login`: Login & get token
- `POST /github-action`: Perform GitHub tasks (auth required)

### Example: JWT Login

```python
@app.route('/login', methods=['POST'])
def login():
    ...
    token = jwt.encode({...}, app.config['SECRET_KEY'], algorithm="HS256")
    return jsonify({"token": token})
```

### Example: Gemini Integration

```python
def call_gemini(prompt):
    ...
    model = genai.GenerativeModel("gemini-1.5-pro-latest")
    response = model.generate_content(structured_prompt)
    return json.loads(response.candidates[0].content.parts[0].text)
```

---

## 🎨 Frontend Implementation

### Components

- `App.js`: Root with routes
- `Login.js` & `Signup.js`: Auth forms (dark mode)
- `Chat.js`: Main interface
- `Settings.js`: Theme switcher

### Theme Management Example

```js
if (newTheme === 'light') {
  root.style.setProperty('--background-color', '#ffffff');
  ...
}
```

---

## 💻 Usage

1. **Sign Up/Login** to get a JWT token.
2. **Enter Prompts** like:
   - "Show open PRs for username/repo"
   - "Generate BDD tests for username/repo PR #123"
3. **Switch Themes** in settings.
4. **Browse History** in sidebar.

---

## 🧩 Challenges and Solutions

| Challenge | Solution |
|----------|----------|
| Ensuring JSON-only Gemini output | Used structured prompts + regex |
| GitHub API rate limits | Retry with exponential backoff |
| Responsive sidebar | React hooks + media queries |
| API key security | `.env` file with validation |

---

## 🔮 Future Enhancements

- Add SQLite/PostgreSQL DB
- Enhance Gemini NLU features
- Add WebSocket for live GitHub events
- Improve mobile responsiveness

---

## ✅ Conclusion

This project effectively automates GitHub workflows with AI, wrapped in a modern UI and secure architecture. It’s an open-source step toward making developer tooling smarter and more efficient.



