import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaUserPlus } from 'react-icons/fa';

const Signup = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/signup`,
                formData
            );
            
            if (response.status === 201) {
                setSuccess(true);
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        }
    };

    if (success) {
        return (
            <div className="auth-container success-message">
                <div className="success-check">✓</div>
                <h2>Account Created Successfully!</h2>
                <p>Redirecting to login page...</p>
            </div>
        );
    }

    return (
        <div className="auth-container signup-container">
            <div className="auth-header">
                <FaUserPlus className="auth-icon" />
                <h2>Create New Account</h2>
            </div>
            
            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                    <label>Username</label>
                    <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="Choose a username"
                        className="auth-input"
                        required
                        minLength="4"
                    />
                </div>

                <div className="form-group">
                    <label>Password</label>
                    <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Create a password"
                        className="auth-input"
                        required
                        minLength="6"
                    />
                </div>

                <button type="submit" className="auth-button">
                    Sign Up
                </button>
            </form>

            <p className="auth-link">
                Already have an account?{' '}
                <button 
                    className="link-button" 
                    onClick={() => navigate('/login')}
                >
                    Log in here
                </button>
            </p>
        </div>
    );
};

export default Signup;