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
from dotenv import load_dotenv  # Import python-dotenv to load .env file
from pymongo import MongoClient
from bson.objectid import ObjectId

# Load environment variables from .env file
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {
    "origins": ["http://localhost:3000", "http://192.168.1.3:3000"],
    "methods": ["GET", "POST", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"]
}})
# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))  # Load Gemini API key from environment

# Initialize GitHub API
github_token = os.getenv("GITHUB_TOKEN")  # Ensure this is set in your environment
g = Github(github_token)



# JWT Secret Key
app.config['SECRET_KEY'] = os.getenv("JWT_SECRET_KEY")
if not app.config['SECRET_KEY']:
    raise ValueError("JWT_SECRET_KEY is not set in the environment variables!")

# In-memory user store (replace with a database in production)
users = {
    "admin": generate_password_hash("password123")  # Username: admin, Password: password123
}

client = MongoClient('mongodb://localhost:27017')
db = client['Mydatabase_git']
collection = db['users']

# JWT token required decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]  # Bearer <token>
        if not token:
            return jsonify({"error": "Token is missing!"}), 401
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = data['username']
        except:
            return jsonify({"error": "Token is invalid!"}), 401
        return f(current_user, *args, **kwargs)
    return decorated



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
    
    user_1 = collection.find_one({"username": username})
    
    if user_1:
        return jsonify({"error": "Username already exists!"}), 400

    # users[username] = generate_password_hash(password)
    result = collection.insert_one(data)
    return jsonify({"message": "User created successfully!"}), 201
# Login endpoint
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password are required!"}), 400
    
    user_1 = collection.find_one({"username": username})
   
    if not user_1 or not user_1['password'] == password:
        return jsonify({"error": "Invalid username or password!"}), 401

    # Generate JWT token
    token = jwt.encode({
        'username': username,
        'exp': datetime.utcnow() + timedelta(hours=24)
    }, app.config['SECRET_KEY'], algorithm="HS256")

    return jsonify({"token": token})

# Gemini API call function
def call_gemini(prompt):
    """Force Gemini to return structured JSON instructions."""
    structured_prompt = f"""
    You are an AI assistant specializing in GitHub automation. 
    Your response **must be a JSON object**, with **no explanations**.

    User Request: {prompt}

    Return JSON in this format:
    {{
      "action": "<fetch_pull_requests | fetch_repo_files | read_file | create_pr | generate_snapshot | compare_snapshot | fetch_pr_details | fetch_all_repos | generate_code_review | generate_bdd_test_cases | generate_bdd_from_repo>",
      "repo": "<repository_name>",
      "additional_params": {{
        "file_path": "<if applicable>",
        "pr_number": "<if applicable>"
      }}
    }}

    If the request is unclear, return:
    {{
      "error": "I couldn't understand your request. Please try rephrasing or check the help section for examples."
    }}

    **DO NOT** generate test cases or other results here. Just provide the action and parameters.
    """

    model = genai.GenerativeModel("gemini-1.5-pro-latest")
    response = model.generate_content(structured_prompt)
    try:
        response_text = response.candidates[0].content.parts[0].text
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', response_text, re.DOTALL)
        json_string = json_match.group(1) if json_match else response_text.strip()
        return json.loads(json_string)
    except (json.JSONDecodeError, IndexError, AttributeError) as e:
        
        return {"error": f"Invalid response from Gemini: {str(e)}"}

# GitHub utility functions
def fetch_pull_requests(repo_name):
    repo = g.get_repo(repo_name)
    prs = repo.get_pulls(state='open')
    return [{"title": pr.title, "number": pr.number} for pr in prs]

def fetch_repo_files(repo_name):
    repo = g.get_repo(repo_name)
    contents = repo.get_contents("")
    files = []
    while contents:
        file_content = contents.pop(0)
        if file_content.type == "file":
            files.append(file_content.path)
        else:
            contents.extend(repo.get_contents(file_content.path))
    return files

def read_file(repo_name, file_path):
    repo = g.get_repo(repo_name)
    file_content = repo.get_contents(file_path)
    return file_content.decoded_content.decode()

def create_pr(repo_name, branch_name, title, body):
    repo = g.get_repo(repo_name)
    base_branch = repo.default_branch
    pr = repo.create_pull(title=title, body=body, head=branch_name, base=base_branch)
    return pr.html_url

def generate_snapshot(repo_name, pr_number):
    repo = g.get_repo(repo_name)
    pr = repo.get_pull(pr_number)
    diff_url = pr.diff_url
    response = requests.get(diff_url)
    return response.text if response.status_code == 200 else f"Error fetching PR diff: {response.status_code}"

def compare_snapshot(repo_name, pr_number1, pr_number2):
    diff1 = generate_snapshot(repo_name, pr_number1)
    diff2 = generate_snapshot(repo_name, pr_number2)
    return {"pr1_diff": diff1, "pr2_diff": diff2}

def fetch_pr_details(repo_name, pr_number):
    repo = g.get_repo(repo_name)
    pr = repo.get_pull(pr_number)
    return {"title": pr.title, "body": pr.body, "user": pr.user.login, "state": pr.state}

def fetch_all_repos():
    repos = g.get_user().get_repos()
    return [repo.full_name for repo in repos]

def generate_code_review(repo_name, pr_number):
    pr_diff = generate_snapshot(repo_name, pr_number)
    review_prompt = f"""
    You are a professional code reviewer. Analyze the following GitHub pull request diff 
    and provide a structured code review. Return JSON:
    {{
      "issues": [
        {{
          "line_number": <line_number>,
          "file": "<file_name>",
          "comment": "<feedback_comment>"
        }}
      ]
    }}
    Diff:
    {pr_diff}
    """
    return call_gemini(review_prompt)

def generate_bdd_test_cases(repo_name, pr_number):
    pr_diff = generate_snapshot(repo_name, pr_number)
    bdd_prompt = f"""
    Based on the following GitHub pull request diff, generate BDD-style test cases.
    Return JSON in this format:
    {{
      "test_cases": [
        {{
          "feature": "<feature_name>",
          "given": "<precondition>",
          "when": "<action>",
          "then": "<expected_outcome>",
          "scenario": "<scenario_description>"
        }}
      ]
    }}
    Diff:
    {pr_diff}
    """
    model = genai.GenerativeModel("gemini-1.5-pro-latest")
    response = model.generate_content(bdd_prompt)
    try:
        response_text = response.candidates[0].content.parts[0].text
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', response_text, re.DOTALL)
        json_string = json_match.group(1) if json_match else response_text.strip()
        return json.loads(json_string)
    except (json.JSONDecodeError, IndexError, AttributeError) as e:
       
        return {"error": f"Failed to generate BDD test cases: {str(e)}"}

def generate_bdd_from_repo(repo_name):
    files = fetch_repo_files(repo_name)
    test_cases = {}
    for file_path in files:
        try:
            file_content = read_file(repo_name, file_path)
            bdd_prompt = f"""
            Analyze the following code and generate BDD-style test cases.
            Return JSON in this format:
            {{
              "test_cases": [
                {{
                  "feature": "<feature_name>",
                  "given": "<precondition>",
                  "when": "<action>",
                  "then": "<expected_outcome>",
                  "scenario": "<scenario_description>"
                }}
              ]
            }}
            Code:
            {file_content}
            """
            model = genai.GenerativeModel("gemini-1.5-pro-latest")
            response = model.generate_content(bdd_prompt)
            response_text = response.candidates[0].content.parts[0].text
            json_match = re.search(r'```json\s*(\{.*?\})\s*```', response_text, re.DOTALL)
            json_string = json_match.group(1) if json_match else response_text.strip()
            test_cases[file_path] = json.loads(json_string)
        except Exception as e:
            
            test_cases[file_path] = {"error": str(e)}
    return test_cases

# Main GitHub action endpoint
@app.route('/github-action', methods=['POST'])
@token_required
def github_action(current_user):
    data = request.get_json()
    if not data or "prompt" not in data:
        return jsonify({"error": "Please provide a prompt to proceed."}), 400

    user_prompt = data["prompt"]
    gemini_response = call_gemini(user_prompt)

    if "error" in gemini_response:
        return jsonify({"error": gemini_response["error"]}), 400

    action = gemini_response.get("action")
    repo_name = gemini_response.get("repo")
    additional_params = gemini_response.get("additional_params", {})
    pr_number = additional_params.get("pr_number")

    try:
        if action == "fetch_pull_requests":
            result = fetch_pull_requests(repo_name)
        elif action == "fetch_repo_files":
            result = fetch_repo_files(repo_name)
        elif action == "read_file" and additional_params.get("file_path"):
            result = read_file(repo_name, additional_params["file_path"])
        elif action == "create_pr":
            branch_name = data.get("branch_name")
            title = data.get("title")
            body = data.get("body")
            if not (branch_name and title and body):
                return jsonify({"error": "Missing required parameters for creating a PR."}), 400
            result = {"pr_url": create_pr(repo_name, branch_name, title, body)}
        elif action == "generate_snapshot" and pr_number:
            result = {"snapshot": generate_snapshot(repo_name, pr_number)}
        elif action == "compare_snapshot" and pr_number and data.get("pr_number2"):
            result = compare_snapshot(repo_name, pr_number, data["pr_number2"])
        elif action == "fetch_pr_details" and pr_number:
            result = fetch_pr_details(repo_name, pr_number)
        elif action == "fetch_all_repos":
            result = fetch_all_repos()
        elif action == "generate_code_review" and pr_number:
            result = {"review": generate_code_review(repo_name, pr_number)}
        elif action == "generate_bdd_test_cases" and pr_number:
            result = {"bdd_tests": generate_bdd_test_cases(repo_name, pr_number)}
        elif action == "generate_bdd_from_repo":
            result = {"bdd_tests": generate_bdd_from_repo(repo_name)}
        else:
            return jsonify({"error": "I couldn't understand your request. Please try rephrasing or check the help section for examples."}), 400

        return jsonify({"result": result})
    except Exception as e:
        # logger.error(f"Error processing action {action}: {str(e)}", exc_info=True)
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)


