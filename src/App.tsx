import { useState, useEffect } from 'react';
import { initSDK, getAccelerationMode } from './runanywhere';
import { ChatTab } from './components/ChatTab';
import { VisionTab } from './components/VisionTab';
import { ToolsTab } from './components/ToolsTab';

type Tab = 'vision' | 'advisor' | 'more';

export function App() {
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('vision');

  useEffect(() => {
    initSDK()
      .then(() => setSdkReady(true))
      .catch((err) => setSdkError(err instanceof Error ? err.message : String(err)));
  }, []);

  if (sdkError) {
    return (
      <div className="app-loading" style={{ background: '#211915' }}>
        <h2 className="serif" style={{ color: '#E1D4C8' }}>Aethra: Critical SDK Error</h2>
        <p className="error-text" style={{ color: '#9C6A6A' }}>{sdkError}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Restart Engine</button>
      </div>
    );
  }

  if (!sdkReady) {
    return (
      <div className="app-loading" style={{ background: '#211915' }}>
        <div className="spinner" />
        <h2 className="serif" style={{ color: '#F1E4D8', fontSize: '32px' }}>Aethra</h2>
        <p style={{ color: '#A89586', letterSpacing: '0.1em' }}>Connecting Local Intelligence...</p>
      </div>
    );
  }

  const accel = getAccelerationMode();

  return (
    <div className="app">
      <aside className="app-sidebar">
        <nav style={{ flex: 1 }}>
          <div 
            className={`nav-item ${activeTab === 'vision' ? 'active' : ''}`} 
            onClick={() => setActiveTab('vision')}
          >
            🎨 Designer
          </div>
          <div 
            className={`nav-item ${activeTab === 'advisor' ? 'active' : ''}`} 
            onClick={() => setActiveTab('advisor')}
          >
            🛋️ Advisor
          </div>
          <div 
            className={`nav-item ${activeTab === 'more' ? 'active' : ''}`} 
            onClick={() => setActiveTab('more')}
          >
            ⚛️ Insights
          </div>
        </nav>
        
        <div style={{ padding: '20px 30px', borderTop: '1px solid var(--border)' }}>
             <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>© 2026 AETHRA</p>
        </div>
      </aside>

      <header className="app-header">
        <div className="logo serif">⛰️ AETHRA</div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
             <div className="subtitle" style={{ fontSize: '10px', opacity: 0.6 }}>Local Visionary Studio</div>
             <div style={{ display: 'flex', gap: '8px' }}>
                 {accel && <span className="badge">{accel.toUpperCase()} ACCEL</span>}
                 <span className="badge" style={{ background: 'var(--success)', color: 'white', borderColor: 'transparent' }}>PRIVATE / OFFLINE</span>
             </div>
        </div>
      </header>

      <main className="tab-content">
        {activeTab === 'vision' && <VisionTab />}
        {activeTab === 'advisor' && <ChatTab />}
        {activeTab === 'more' && <ToolsTab />}
      </main>

      <footer className="footer">
          <div>Local Privacy. Zero Server Uploads.</div>
          <div>🏔️ AI Designer Assistant</div>
      </footer>
    </div>
  );
}
