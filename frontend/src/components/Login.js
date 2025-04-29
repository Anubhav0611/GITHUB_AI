import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const Login = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [showPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/login`,
        credentials
      );
      localStorage.setItem('token', response.data.token);
      onLogin();
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h2>Welcome to GitHub Automation</h2>
      </div>
      
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleLogin} className="auth-form">
        <div className="form-group">
          <label>Username</label>
          <input
            type="text"
            value={credentials.username}
            onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
            placeholder="Enter your username"
            className="auth-input"
            required
          />
        </div>
        
        <div className="form-group">
          <label>Password</label>
          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              placeholder="Enter your password"
              className="auth-input"
              required
            />
          </div>
        </div>

        <button type="submit" className="auth-button">
          Log In
        </button>
      </form>

      <p className="auth-links">
        New user? 
        <Link to="/signup" className="auth-link">
          Create account
        </Link>
      </p>
    </div>
  );
};

export default Login;