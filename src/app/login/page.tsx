'use client';

export default function LoginPage() {
  const obsCompanionUrl = 'https://github.com/Mtman1987/streamweaver-v2';

  return (
    <>
      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: system-ui, -apple-system, sans-serif;
        }
        
        .container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0d1117 0%, #1a1a2e 50%, #16213e 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        
        .card {
          background: rgba(26, 26, 26, 0.9);
          border: 2px solid #333;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(145, 70, 255, 0.3);
          max-width: 450px;
          width: 100%;
          backdrop-filter: blur(10px);
        }
        
        .title {
          font-size: 2.5rem;
          font-weight: bold;
          margin-bottom: 10px;
          background: linear-gradient(45deg, #9146FF, #00D4FF, #FFD700);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-align: center;
        }
        
        .subtitle {
          color: #8b949e;
          font-size: 1.2rem;
          text-align: center;
          margin-bottom: 40px;
        }
        
        .section-title {
          color: #58a6ff;
          margin-bottom: 25px;
          font-size: 1.4rem;
          text-align: center;
        }
        
        .button {
          background: linear-gradient(45deg, #9146FF, #7c3aed);
          color: white;
          padding: 15px 25px;
          border-radius: 10px;
          text-decoration: none;
          display: block;
          width: 100%;
          text-align: center;
          border: none;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 15px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(145, 70, 255, 0.4);
        }
        
        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(145, 70, 255, 0.6);
        }
        
        .button-discord {
          background: linear-gradient(45deg, #5865F2, #4752c4);
          box-shadow: 0 4px 15px rgba(88, 101, 242, 0.4);
        }
        
        .button-discord:hover {
          box-shadow: 0 8px 25px rgba(88, 101, 242, 0.6);
        }

        .help-text {
          color: #8b949e;
          font-size: 13px;
          line-height: 1.4;
          margin: 10px 0 20px;
          text-align: center;
        }
        
        .status-card {
          background: linear-gradient(135deg, #0f3460, #1e40af);
          padding: 25px;
          border-radius: 12px;
          border: 1px solid #1f6feb;
          margin-top: 30px;
        }
        
        .status-title {
          margin-bottom: 20px;
          color: #58a6ff;
          font-size: 1.2rem;
        }
        
        .status-item {
          color: #e2e8f0;
          margin-bottom: 10px;
          font-size: 15px;
        }
        
        .footer {
          text-align: center;
          margin-top: 25px;
          color: #8b949e;
          font-size: 13px;
        }
      `}</style>
      
      <div className="container">
        <div className="card">
          <h1 className="title">🚀 Space Mountain</h1>
          <p className="subtitle">StreamWeave Command Center</p>
          
          <h2 className="section-title">🌌 Cosmic Raid Access</h2>
          
          <a 
            href={`https://id.twitch.tv/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID}&redirect_uri=${typeof window !== 'undefined' ? window.location.origin : ''}/auth/twitch/callback&response_type=code&scope=chat%3Aread+chat%3Aedit+moderator%3Aread%3Achatters+channel%3Amanage%3Abroadcast+moderator%3Amanage%3Aannouncements+user%3Awrite%3Achat&state=broadcaster`}
            className="button"
          >
            🎮 Connect Twitch Account
          </a>
          
          <a href="/" className="button button-discord">
            🏠 Enter Command Center
          </a>

          <p className="help-text">
            Want OBS control in hosted mode? Install the optional OBS Companion (local bridge).
          </p>

          <a
            href={obsCompanionUrl}
            className="button"
            target="_blank"
            rel="noreferrer"
          >
            📦 Download OBS Companion (GitHub)
          </a>
          
          <div className="status-card">
            <h3 className="status-title">🛸 Mission Control Status</h3>
            <div className="status-item">✅ Raid Pile System Active</div>
            <div className="status-item">✅ Raid Train Operational</div>
            <div className="status-item">✅ Points System Online</div>
            <div className="status-item">✅ Auto-Updates Ready</div>
          </div>
          
          <div className="footer">
            Managed by Space Mountain • Cosmic Raid Division
          </div>
        </div>
      </div>
    </>
  );
}