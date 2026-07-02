import { useState, useEffect } from 'react';
import StudentApp from './components/StudentApp';
import CaretakerWeb from './components/CaretakerWeb';
import AdminConsole from './components/AdminConsole';
import { 
  Laptop, Smartphone, Database, RefreshCw, Sparkles,
  Sun, Moon
} from 'lucide-react';
import futminnaLogo from './assets/images/futminna_logo_1782173784907.jpg';

// Crisp, high-end 100% vector SVG representation of the LODGA logo badges
export function LodgaLogo({ isDark, className = "h-8" }: { isDark: boolean; className?: string }) {
  const bgColor = isDark ? '#1A1A1A' : '#E2E1DA';
  const textColor = isDark ? '#E2E1DA' : '#1A1A1A';

  return (
    <svg 
      viewBox="0 0 400 400" 
      className={className}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="400" height="400" rx="80" fill={bgColor} />
      <text
        x="51%"
        y="52%"
        dominantBaseline="central"
        textAnchor="middle"
        fill={textColor}
        style={{
          fontFamily: '"Inter", "Arial Black", "Montserrat", sans-serif',
          fontWeight: 900,
          fontSize: '94px',
          letterSpacing: '-0.035em',
        }}
      >
        LODGA
      </text>
    </svg>
  );
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('lodga-theme');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  const [apiState, setApiState] = useState<any>({
    users: [],
    contacts: [],
    properties: [],
    verification_checks: [],
    transactions: [],
    caretaker_renewal_pings: []
  });

  // Authentic user tokens & profiles shared by student and caretaker
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchDatabaseState = async () => {
    try {
      const res = await fetch('/api/simulator/db');
      if (res.ok) {
        const data = await res.json();
        setApiState(data);
      }
    } catch (err) {
      console.error('Failed to sync UI with Express backend state:', err);
    }
  };

  useEffect(() => {
    localStorage.setItem('lodga-theme', theme);
  }, [theme]);

  // Seed on bootstrap
  useEffect(() => {
    fetchDatabaseState();
    
    // Automatically register a default test token session representing our seed user
    // "Sodiq Adesanya" (student) to make direct immediate testing super sleek!
    const defaultSecudentPayload = {
      user_id: 'a0000000-0000-0000-0000-000000000001',
      email: 'student1@futminna.edu.ng',
      phone: '08123456789',
      full_name: 'Sodiq Adesanya',
      user_type: 'student'
    };
    
    // Quick sign jwt mockup or local placeholder token for direct client use
    const simulatedToken = 'MOCK_TOKEN_INITIAL';
    setToken(simulatedToken);
    setCurrentUser(defaultSecudentPayload);
  }, []);

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#1A1A1A] text-[#E2E1DA]' : 'bg-[#E2E1DA] text-[#1A1A1A]'} font-sans transition-colors duration-300 flex flex-col justify-between`}>
      
      {/* 1. Global Navigation Bar */}
      <header className={`${isDark ? 'bg-[#242423] border-[#383837]/60 text-[#E2E1DA]' : 'bg-[#FCFBF8] border-[#C5C4BA]/60 text-[#1A1A1A]'} border-b px-6 py-4 sticky top-0 z-40 shadow-xs transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <LodgaLogo isDark={isDark} className="w-10 h-10 shadow-xs rounded-xl shrink-0" />
            <div className={`h-6 w-px shrink-0 ${isDark ? 'bg-[#383837]' : 'bg-[#C5C4BA]'}`} />
            <img 
              src={futminnaLogo} 
              alt="FUTMINNA Seal" 
              className="w-10 h-10 object-contain rounded-full bg-white p-0.5 shadow-xs shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <p className={`text-xs font-semibold leading-tight ${isDark ? 'text-[#E2E1DA]' : 'text-[#1A1A1A]'}`}>
                Verified Student Accommodation Marketplace
              </p>
              <p className={`text-[11px] ${isDark ? 'text-[#A3A29B]' : 'text-[#5C5B54]'}`}>
                Federal University of Technology Minna (FUTMINNA), Nigeria
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs w-full md:w-auto justify-between md:justify-end flex-wrap">
            {/* Sun/Moon Theme Toggle */}
            <div className={`flex items-center p-1 rounded-xl border ${isDark ? 'bg-[#1E1E1D] border-[#383837]' : 'bg-[#ECEAE2] border-[#C5C4BA]'}`}>
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 cursor-pointer ${
                  theme === 'light'
                    ? 'bg-[#FCFBF8] text-[#1A1A1A] shadow-xs'
                    : 'text-[#828178] hover:text-[#1A1A1A]'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-[#2D2D2C] text-[#E2E1DA] shadow-xs'
                    : 'text-[#A3A29B] hover:text-[#E2E1DA]'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>
            </div>

            <div className={`border ${isDark ? 'bg-[#2D2D2C] border-[#383837] text-[#E2E1DA]' : 'bg-[#ECEAE2] border-[#C5C4BA] text-[#1A1A1A]'} px-3 py-1.5 rounded-lg flex items-center gap-2 font-medium`}>
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="font-mono text-[11px]">Server: Active</span>
            </div>

            <button 
              onClick={fetchDatabaseState}
              className={`${isDark ? 'bg-[#E2E1DA] hover:bg-[#D2D1C9] text-[#1A1A1A]' : 'bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#E2E1DA]'} font-bold py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 transition-all text-xs cursor-pointer shadow-xs`}
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" /> Synchronize Catalog
            </button>
          </div>
        </div>
      </header>

      {/* 2. Unified Split Workspace */}
      <main className="max-w-7xl w-full mx-auto p-4 md:p-6 flex-1 space-y-6">
        
        {/* Core informational banner */}
        <div className={`border p-5 rounded-2xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-xs transition-colors duration-300 ${
          isDark ? 'bg-[#242423] border-[#383837]/80' : 'bg-[#FCFBF8] border-[#C5C4BA]/80'
        }`}>
          <div className="space-y-1">
            <h4 className={`text-sm font-bold flex items-center gap-1.5 ${isDark ? 'text-[#E2E1DA]' : 'text-[#1A1A1A]'}`}>
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              Lodga Proof-of-Concept Workspace
            </h4>
            <p className={`text-xs leading-normal max-w-4xl ${isDark ? 'text-[#A3A29B]' : 'text-[#5C5B54]'}`}>
              This sandbox displays a synchronized simulation of student and caretaker flows. Experience mobile-first student booking on the <strong>Left</strong>, and listing updates on the <strong>Right</strong>.
            </p>
          </div>
          
          <div className={`${isDark ? 'bg-[#2D2D2C] border-[#383837] text-[#E2E1DA]' : 'bg-[#ECEAE2] border-[#C5C4BA] text-[#1A1A1A]'} text-[11px] border px-3 py-1.5 rounded-xl font-mono shrink-0`}>
            Active Session: <strong>{currentUser?.full_name || 'Anonymous Student'}</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT SIDE - Mock smartphone housing the React Native Client */}
          <div className="lg:col-span-12 xl:col-span-4 flex flex-col items-center">
            <div className={`flex items-center gap-1.5 mb-2.5 font-bold text-xs uppercase self-start px-2 ${
              isDark ? 'text-[#E2E1DA]/80' : 'text-[#1A1A1A]/80'
            }`}>
              <Smartphone className="w-4 h-4" />
              <span>Student Mobile Interface</span>
            </div>
            
            <StudentApp 
              apiState={apiState}
              onRefresh={fetchDatabaseState}
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              token={token}
              setToken={setToken}
              theme={theme}
            />
          </div>

          {/* RIGHT SIDE - Caretaker Web Portal */}
          <div className="lg:col-span-12 xl:col-span-8 flex flex-col">
            <div className={`flex items-center gap-1.5 mb-2.5 font-bold text-xs uppercase px-2 ${
              isDark ? 'text-[#E2E1DA]/80' : 'text-[#1A1A1A]/80'
            }`}>
              <Laptop className="w-4 h-4" />
              <span>Caretaker Dashboard</span>
            </div>

            <CaretakerWeb 
              apiState={apiState}
              onRefresh={fetchDatabaseState}
              currentUser={currentUser}
              token={token}
              theme={theme}
            />
          </div>

        </div>

        {/* 3. Administrative Center (Verification Checklists, Splitting, Escrow release and raw JSON database check) */}
        <div className={`mt-8 border-t pt-6 ${isDark ? 'border-[#383837]/80' : 'border-[#C5C4BA]/80'}`}>
          <div className={`flex items-center gap-1.5 font-bold text-xs uppercase px-2 mb-2 ${
            isDark ? 'text-[#E2E1DA]/80' : 'text-[#1A1A1A]/80'
          }`}>
            <Database className="w-4 h-4" />
            <span>Administrative Audit Desk & Sandbox State explorer</span>
          </div>

          <AdminConsole 
            apiState={apiState}
            onRefresh={fetchDatabaseState}
            token={token}
            theme={theme}
          />
        </div>

      </main>

      {/* 4. Footer credits bar */}
      <footer className={`${isDark ? 'bg-[#242423] border-[#383837]/60 text-[#A3A29B]' : 'bg-[#FCFBF8] border-[#C5C4BA]/60 text-[#5C5B54]'} border-t py-4 text-center mt-12 text-xs font-mono transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-6">
          <span>Lodga Accommodation Portal • Dedicated verified listings for FUTMINNA, Nigeria. All values denominated in Nigerian Naira (₦).</span>
        </div>
      </footer>

    </div>
  );
}
