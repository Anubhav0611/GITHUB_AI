import os
import json
import google.generativeai as genai
from github import Github
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import re
import jwt
from datetime import datetime, timedelta
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {
    "origins": ["http://localhost:3000", "http://192.168.1.3:3000"],
    "methods": ["GET", "POST", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"]
}})

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
github_token = os.getenv("GITHUB_TOKEN")
g = Github(github_token)

app.config['SECRET_KEY'] = os.getenv("JWT_SECRET_KEY")
if not app.config['SECRET_KEY']:
    raise ValueError("JWT_SECRET_KEY is not set in the environment variables!")

users = {}

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        if not token:
            return jsonify({"error": "Token missing!"}), 401
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = data['username']
        except:
            return jsonify({"error": "Invalid token!"}), 401
        return f(current_user, *args, **kwargs)
    return decorated

def format_response(action, result):
    """Convert GitHub API responses to human-readable format"""
    if isinstance(result, dict) and 'error' in result:
        return f"❌ Error: {result['error']}"
    
    formatted = ""
    
    if action == "fetch_pull_requests":
        formatted = f"Found {len(result)} open pull requests:\n"
        formatted += "\n".join([f"• {pr['title']} (#{pr['number']})" for pr in result])
    
    elif action == "fetch_repo_files":
        formatted = f"Repository contains {len(result)} files:\n"
        formatted += "\n".join([f"• {file}" for file in result])
    
    elif action == "read_file":
        formatted = f"File content:\n```\n{result}\n```"
    
    elif action == "create_pr":
        formatted = f"✅ Pull request created!\nURL: {result['pr_url']}"
    
    elif action == "generate_code_review":
        issues = result.get('review', {}).get('issues', [])
        formatted = f"Code review found {len(issues)} issues:\n"
        formatted += "\n".join([f"• {issue['comment']} (Line {issue['line_number']})" for issue in issues])
    
    elif action == "generate_bdd_test_cases":
        formatted = "BDD Test Cases:\n"
        formatted += "\n".join([f"• {test_case}" for test_case in result.get('bdd_tests', [])])
    
    else:
        formatted = json.dumps(result, indent=2)
    
    return formatted

@app.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password required!"}), 400
    if len(username) < 4:
        return jsonify({"error": "Username must be at least 4 characters!"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters!"}), 400
    if username in users:
        return jsonify({"error": "Username already exists!"}), 400

    users[username] = generate_password_hash(password)
    return jsonify({"message": "User created successfully!"}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Credentials required!"}), 400
    if username not in users or not check_password_hash(users[username], password):
        return jsonify({"error": "Invalid credentials!"}), 401

    token = jwt.encode({
        'username': username,
        'exp': datetime.utcnow() + timedelta(hours=24)
    }, app.config['SECRET_KEY'], algorithm="HS256")

    return jsonify({"token": token})

def call_gemini(prompt):
    structured_prompt = f"""
    You are an AI assistant specializing in GitHub automation. 
    Return JSON in this format:
    {{
      "action": "<valid_action>",
      "repo": "<repository_name>",
      "additional_params": {{
        "file_path": "<if applicable>",
        "pr_number": "<if applicable>"
      }}
    }}
    User Request: {prompt}
    """
    try:
        model = genai.GenerativeModel("gemini-1.5-pro-latest")
        response = model.generate_content(structured_prompt)
        response_text = response.candidates[0].content.parts[0].text
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        return json.loads(json_match.group()) if json_match else {"error": "Invalid JSON format"}
    except Exception as e:
        return {"error": f"AI processing error: {str(e)}"}

@app.route('/github-action', methods=['POST'])
@token_required
def github_action(current_user):
    data = request.get_json()
    if not data or "prompt" not in data:
        return jsonify({"error": "Missing prompt"}), 400

    try:
        gemini_response = call_gemini(data["prompt"])
        if "error" in gemini_response:
            return jsonify(gemini_response), 400

        action = gemini_response["action"]
        repo_name = gemini_response["repo"]
        params = gemini_response.get("additional_params", {})

        result = None
        if action == "fetch_pull_requests":
            result = [{"title": pr.title, "number": pr.number} 
                     for pr in g.get_repo(repo_name).get_pulls(state='open')]
        
        elif action == "fetch_repo_files":
            contents = g.get_repo(repo_name).get_contents("")
            result = []
            while contents:
                fc = contents.pop(0)
                if fc.type == "file":
                    result.append(fc.path)
                else:
                    contents.extend(g.get_repo(repo_name).get_contents(fc.path))

        elif action == "read_file":
            result = g.get_repo(repo_name).get_contents(params["file_path"]).decoded_content.decode()
        
        elif action == "create_pr":
            repo = g.get_repo(repo_name)
            pr = repo.create_pull(
                title=data["title"],
                body=data["body"],
                head=data["branch_name"],
                base=repo.default_branch
            )
            result = {"pr_url": pr.html_url}
        
        elif action == "generate_code_review":
            pr_diff = requests.get(g.get_repo(repo_name).get_pull(params["pr_number"]).diff_url).text
            result = {"review": call_gemini(f"Review this diff:\n{pr_diff}")}
        
        else:
            return jsonify({"error": "Unsupported action"}), 400

        formatted_message = format_response(action, result)
        return jsonify({
            "result": result,
            "message": formatted_message
        })

    except Exception as e:
        return jsonify({
            "error": str(e),
            "message": f"❌ Error: {str(e)}"
        }), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)