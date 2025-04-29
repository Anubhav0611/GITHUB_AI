import React, { useState, useEffect } from 'react';

const Sidebar = () => {
  const [activeTab, setActiveTab] = useState('response');
  const [response, setResponse] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const handleNewMessage = (e) => {
      setResponse(e.detail.response);
      setHistory(prev => [...prev, { prompt: e.detail.prompt, response: e.detail.response, timestamp: e.detail.timestamp }]);
    };

    window.addEventListener('newMessage', handleNewMessage);
    return () => window.removeEventListener('newMessage', handleNewMessage);
  }, []);

  return (
    <div className="sidebar">
      <div className="sidebar-header">Details</div>
      <div className="sidebar-tabs">
        <button className={activeTab === 'response' ? 'active' : ''} onClick={() => setActiveTab('response')}>Response</button>
        <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>History</button>
        <button className={activeTab === 'help' ? 'active' : ''} onClick={() => setActiveTab('help')}>Help</button>
      </div>
      <div className="sidebar-content">
        {activeTab === 'response' && <div dangerouslySetInnerHTML={{ __html: response }} />}
        {activeTab === 'history' && (
          <div>
            {history.map((item, index) => (
              <div key={index} className="history-item" onClick={() => { setResponse(item.response); setActiveTab('response'); }}>
                <div>{item.prompt}</div>
                <div className="timestamp">{item.timestamp}</div>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'help' && (
          <div>
            <div className="example">
              <h4>Show open pull requests</h4>
              <p>Show open pull requests for username/repo</p>
            </div>
            <div className="example">
              <h4>Review a pull request</h4>
              <p>Review PR #123 in username/repo</p>
            </div>
            <div className="example">
              <h4>Generate BDD tests</h4>
              <p>Generate BDD tests for username/repo</p>
            </div>
            <div className="example">
              <h4>Fetch repository files</h4>
              <p>Fetch all files from username/repo</p>
            </div>
            <div className="example">
              <h4>Create a pull request</h4>
              <p>Create a PR in username/repo with branch "feature-branch", title "New Feature", and body "Added new feature."</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;