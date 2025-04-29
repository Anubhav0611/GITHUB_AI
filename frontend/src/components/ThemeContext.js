import React, { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    const applyTheme = (newTheme) => {
        const root = document.documentElement;
        if (newTheme === 'light') {
            root.style.setProperty('--background-color', '#ffffff');
            root.style.setProperty('--text-color', '#333333');
            root.style.setProperty('--container-bg', '#ffffff');
            root.style.setProperty('--sidebar-bg', '#f4f4f5');
            root.style.setProperty('--chat-bg', '#ffffff');
            root.style.setProperty('--input-bg', '#e5e7eb');
            root.style.setProperty('--ai-message-bg', '#e5e7eb');
            root.style.setProperty('--user-message-bg', '#4fd1c5');
            root.style.setProperty('--accent-color', '#14b8a6');
            root.style.setProperty('--border-color', '#d1d5db');
            root.style.setProperty('--hover-bg', '#d1d5db');
        } else if (newTheme === 'neon') {
            root.style.setProperty('--background-color', '#1a1a1a');
            root.style.setProperty('--text-color', '#00ffcc');
            root.style.setProperty('--container-bg', '#2a2a3c');
            root.style.setProperty('--sidebar-bg', '#2a2a3c');
            root.style.setProperty('--chat-bg', '#35354d');
            root.style.setProperty('--input-bg', '#40405a');
            root.style.setProperty('--ai-message-bg', '#40405a');
            root.style.setProperty('--user-message-bg', '#00ffcc');
            root.style.setProperty('--accent-color', '#00ffcc');
            root.style.setProperty('--border-color', '#4a4a6a');
            root.style.setProperty('--hover-bg', '#50507a');
        } else { // Dark theme
            root.style.setProperty('--background-color', '#0a0a0a');
            root.style.setProperty('--text-color', '#e0e0e0'); // Light text for contrast
            root.style.setProperty('--container-bg', '#1e1e2f');
            root.style.setProperty('--sidebar-bg', '#1e1e2f');
            root.style.setProperty('--chat-bg', '#252537');
            root.style.setProperty('--input-bg', '#35354d');
            root.style.setProperty('--ai-message-bg', '#35354d');
            root.style.setProperty('--user-message-bg', '#00ffcc');
            root.style.setProperty('--accent-color', '#00ffcc');
            root.style.setProperty('--border-color', '#35354d');
            root.style.setProperty('--hover-bg', '#40405a');
        }
        localStorage.setItem('theme', newTheme);
        setTheme(newTheme);
    };

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, applyTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};