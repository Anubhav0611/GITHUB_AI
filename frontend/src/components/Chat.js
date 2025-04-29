import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import '../App.css';

// Helper function to format individual test case
const formatTestCase = (testCase, index) => `
Test Case ${index + 1}:
  Feature: ${testCase.feature}
  Given: ${testCase.given}
  When: ${testCase.when}
  Then: ${testCase.then}
  Scenario: ${testCase.scenario}
`;

// Helper function to format response into a conversational message
const formatResponse = (responseData) => {
    if (!responseData) return "I couldn't find any information. Please try again.";

    // Handle array responses (e.g., list of pull requests, files, etc.)
    if (Array.isArray(responseData)) {
        if (responseData.length === 0) return "No items found.";
        let formatted = `I found ${responseData.length} item${responseData.length > 1 ? 's' : ''}:\n`;
        responseData.forEach((item, index) => {
            if (item.title && item.number) {
                formatted += `${index + 1}. ${item.title} (PR #${item.number})\n`;
            } else {
                formatted += `${index + 1}. ${item}\n`;
            }
        });
        return formatted;
    }

    // Handle object responses (e.g., PR details, snapshots, etc.)
    if (typeof responseData === 'object') {
        if (responseData.snapshot) {
            return `Here’s the snapshot of the pull request:\n${responseData.snapshot}`;
        }
        if (responseData.pr_url) {
            return `I’ve created a pull request for you! You can view it here: ${responseData.pr_url}`;
        }
        if (responseData.pr1_diff && responseData.pr2_diff) {
            return `Here’s the comparison between the two pull requests:\n- PR1 Diff: ${responseData.pr1_diff}\n- PR2 Diff: ${responseData.pr2_diff}`;
        }
        if (responseData.title && responseData.body) {
            return `Here are the details of the pull request:\n- Title: ${responseData.title}\n- Body: ${responseData.body}\n- State: ${responseData.state}\n- Created by: ${responseData.user}`;
        }
        if (responseData.review) {
            const issues = responseData.review.issues || [];
            if (issues.length === 0) return "No issues found in the code review.";
            let formatted = "Here’s the code review:\n";
            issues.forEach((issue, index) => {
                formatted += `${index + 1}. In file "${issue.file}" at line ${issue.line_number}:\n   ${issue.comment}\n`;
            });
            return formatted;
        }
        if (responseData.bdd_tests) {
            let formatted = "Here are the BDD test cases:\n";
            if (responseData.bdd_tests.test_cases) { // For generate_bdd_test_cases (PR-based)
                formatted += responseData.bdd_tests.test_cases.map(formatTestCase).join('\n');
            } else { // For generate_bdd_from_repo (repo-based)
                for (const [file, tests] of Object.entries(responseData.bdd_tests)) {
                    if (tests.error) {
                        formatted += `Error in ${file}: ${tests.error}\n`;
                    } else if (tests.test_cases) {
                        formatted += `For file "${file}":\n`;
                        formatted += tests.test_cases.map(formatTestCase).join('\n');
                    }
                }
            }
            return formatted;
        }
    }

    // Fallback for unhandled formats
    return JSON.stringify(responseData, null, 2);
};

const Chat = () => {
    const getCurrentTime = () => {
        const now = new Date();
        return `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}, ${now.toLocaleTimeString()}`;
    };

    const [messages, setMessages] = useState([
        { text: "Hello! I'm your GitHub automation assistant. How can I help you today? Try asking about pull requests, code reviews, or BDD test cases!", sender: 'ai', time: getCurrentTime() }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(250);
    const [isDragging, setIsDragging] = useState(false);
    const [forceRepaint, setForceRepaint] = useState(false);

    useEffect(() => {
        const chatBox = document.getElementById('chat-box');
        chatBox.scrollTop = chatBox.scrollHeight;
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;
    
        const userMessage = { text: input, sender: 'user', time: getCurrentTime() };
        setMessages([...messages, userMessage]);
        setInput('');
        setIsLoading(true);
    
        try {
            const token = localStorage.getItem('token');
    
            // Parse the prompt to extract parameters for create_pr action
            let requestBody = { prompt: input };
            const createPrMatch = input.match(/create a pr in (\S+) with branch "([^"]+)", title "([^"]+)", and body "([^"]+)"/i);
            if (createPrMatch) {
                const [, , branch_name, title, body] = createPrMatch; // Removed unused 'repo'
                requestBody = {
                    prompt: input,
                    branch_name,
                    title,
                    body
                };
            }
    
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/github-action`,
                requestBody,
                { headers: { Authorization: `Bearer ${token}` } }
            );
    
            const formattedResponse = formatResponse(response.data.result);
            const aiMessage = { text: formattedResponse, sender: 'ai', time: getCurrentTime() };
            setMessages(prev => [...prev, aiMessage]);
    
            const event = new CustomEvent('newMessage', { detail: { prompt: input, response: formattedResponse, time: aiMessage.time } });
            window.dispatchEvent(event);
        } catch (error) {
            const errorMessage = { text: `Oops! Something went wrong: ${error.response?.data?.error || 'Please try again later.'}`, sender: 'ai', time: getCurrentTime() };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    // Draggable functionality
    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = useCallback((e) => {
        if (isDragging) {
            const newWidth = e.clientX;
            if (newWidth >= 150 && newWidth <= 500) {
                setSidebarWidth(newWidth);
                setForceRepaint(prev => !prev);
            }
        }
    }, [isDragging]);

    const handleTouchStart = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    const handleTouchMove = useCallback((e) => {
        if (isDragging) {
            const touch = e.touches[0];
            const newWidth = touch.clientX;
            if (newWidth >= 150 && newWidth <= 500) {
                setSidebarWidth(newWidth);
                setForceRepaint(prev => !prev);
            }
        }
    }, [isDragging]);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleTouchMove);
            window.addEventListener('touchend', handleTouchEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isDragging, handleMouseMove, handleTouchMove]);

    return (
        <div className="app-container">
            <div className={`sidebar ${forceRepaint ? 'repaint' : ''}`} style={{ width: `${sidebarWidth}px` }}>
                <Sidebar />
                <div
                    className="resize-handle"
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                ></div>
            </div>
            <div className="chat-container">
                <div className="chat-header">
                    <h2>GitHub Automation Chat</h2>
                    <div className="chat-buttons">
                        <Link to="/settings" className="settings-button">Settings</Link>
                        <button onClick={() => { localStorage.removeItem('token'); window.location.href = '/'; }} className="logout-button" aria-label="Logout">Logout</button>
                    </div>
                </div>
                <div id="chat-box" className="chat-box">
                    {messages.map((msg, index) => (
                        <div key={index} className={`chat-message ${msg.sender}`}>
                            <div className="message-content">
                                {/* Use pre tag to preserve formatting */}
                                <pre style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</pre>
                                <div className="message-time">{msg.time}</div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="chat-message ai loading">
                            <div className="message-content">
                                <span>Thinking...</span>
                                <div className="message-time">{getCurrentTime()}</div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="chat-input">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your prompt here..."
                        aria-label="Type your prompt"
                    />
                    <button onClick={handleSend} disabled={isLoading} aria-label="Send message">
                        {isLoading ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const Sidebar = () => {
    const [activeTab, setActiveTab] = useState('response');
    const [history, setHistory] = useState([]);
    const [response, setResponse] = useState('');

    useEffect(() => {
        const handleNewMessage = (e) => {
            const { prompt, response, time } = e.detail;
            setHistory(prev => [...prev, { prompt, time, response }]);
            if (activeTab === 'response') {
                setResponse(response);
            }
        };

        window.addEventListener('newMessage', handleNewMessage);
        return () => window.removeEventListener('newMessage', handleNewMessage);
    }, [activeTab]);

    const handleTabClick = (tab) => {
        setActiveTab(tab);
        if (tab === 'response') {
            setResponse(history.length > 0 ? history[history.length - 1].response : '');
        }
    };

    const handleHistoryClick = (index) => {
        setActiveTab('response');
        setResponse(history[index].response);
    };

    return (
        <div className="sidebar-content-wrapper">
            <div className="sidebar-header">
                <h3>Details</h3>
            </div>
            <div className="sidebar-tabs">
                <div className={`tab ${activeTab === 'response' ? 'active' : ''}`} onClick={() => handleTabClick('response')}>
                    Response
                </div>
                <div className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => handleTabClick('history')}>
                    History
                </div>
                <div className={`tab ${activeTab === 'help' ? 'active' : ''}`} onClick={() => handleTabClick('help')}>
                    Help
                </div>
            </div>
            <div className="sidebar-content">
                {activeTab === 'response' && (
                    <div className="response-content">
                        <pre style={{ whiteSpace: 'pre-wrap' }}>{response || 'No response yet.'}</pre>
                    </div>
                )}
                {activeTab === 'history' && (
                    <div className="history-content">
                        {history.map((item, index) => (
                            <div key={index} className="history-item" onClick={() => handleHistoryClick(index)}>
                                <p>{item.prompt}</p>
                                <small>{item.time}</small>
                            </div>
                        ))}
                    </div>
                )}
                {activeTab === 'help' && (
                    <div className="help-content">
                        <div className="help-item">
                            <h4>Show open pull requests</h4>
                            <p>Show open pull requests for username/repo</p>
                        </div>
                        <div className="help-item">
                            <h4>Review a pull request</h4>
                            <p>Review PR #123 in username/repo</p>
                        </div>
                        <div className="help-item">
                            <h4>Generate BDD tests</h4>
                            <p>Generate BDD tests for username/repo</p>
                        </div>
                        <div className="help-item">
                            <h4>Fetch repository files</h4>
                            <p>Fetch all files from username/repo</p>
                        </div>
                        <div className="help-item">
                            <h4>Create a pull request</h4>
                            <p>Create a PR in username/repo with branch "feature-branch", title "New Feature", and body "Added new feature."</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Chat;