import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeContext'; // Import ThemeProvider
import Chat from './components/Chat';
import Login from './components/Login';
import Signup from './components/Signup';
import Settings from './components/Settings';
import './App.css';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        setIsAuthenticated(!!token);
    }, []);

    const handleLogin = () => {
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
    };

    return (
        <ThemeProvider>
            <Router>
                <Routes>
                    <Route path="/" element={
                        isAuthenticated ? 
                        <Navigate to="/chat" /> : 
                        <Navigate to="/login" />
                    }/>
                    <Route path="/login" element={
                        isAuthenticated ? 
                        <Navigate to="/chat" /> : 
                        <Login onLogin={handleLogin} />
                    }/>
                    <Route path="/signup" element={
                        isAuthenticated ? 
                        <Navigate to="/chat" /> : 
                        <Signup onLogin={handleLogin} />
                    }/>
                    <Route path="/chat" element={
                        isAuthenticated ? 
                        <Chat handleLogout={handleLogout} /> : 
                        <Navigate to="/login" />
                    }/>
                    <Route path="/settings" element={
                        isAuthenticated ? 
                        <Settings handleLogout={handleLogout} /> : 
                        <Navigate to="/login" />
                    }/>
                </Routes>
            </Router>
        </ThemeProvider>
    );
}

export default App;