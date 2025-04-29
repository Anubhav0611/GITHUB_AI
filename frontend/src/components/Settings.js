import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { ThemeContext } from './ThemeContext'; // Import ThemeContext
import '../App.css';

const Settings = () => {
    const { theme, applyTheme } = useContext(ThemeContext); // Use ThemeContext

    return (
        <div className="settings-container">
            <h2>Settings</h2>
            <div className="theme-options">
                <label>Theme:</label>
                <button onClick={() => applyTheme('light')} className={theme === 'light' ? 'active' : ''} aria-label="Switch to Light theme">Light</button>
                <button onClick={() => applyTheme('dark')} className={theme === 'dark' ? 'active' : ''} aria-label="Switch to Dark theme">Dark</button>
                <button onClick={() => applyTheme('neon')} className={theme === 'neon' ? 'active' : ''} aria-label="Switch to Neon theme">Neon</button>
            </div>
            <Link to="/chat" className="back-button">Back</Link>
            <button onClick={() => { localStorage.removeItem('token'); window.location.href = '/'; }} className="logout-button" aria-label="Logout">Logout</button>
        </div>
    );
};

export default Settings;