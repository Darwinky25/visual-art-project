const fs = require('fs');

let c = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add state for globals
c = c.replace(
  /const \[isFullscreen, setIsFullscreen\] = useState\(false\);/,
  `const [isFullscreen, setIsFullscreen] = useState(false);
  const [globalBlackout, setGlobalBlackout] = useState(false);
  const [globalScanlines, setGlobalScanlines] = useState(false);
  const [globalGlitch, setGlobalGlitch] = useState(false);
  
  // BPM State
  const [bpm, setBpm] = useState(120);
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  
  const handleTempoTap = () => {
    const now = Date.now();
    setTapTimes(prev => {
      const times = [...prev, now].filter(t => now - t < 3000); // keep last 3 seconds of taps
      if (times.length >= 2) {
        const diffs = [];
        for (let i = 1; i < times.length; i++) {
          diffs.push(times[i] - times[i-1]);
        }
        const avgMs = diffs.reduce((a,b) => a+b, 0) / diffs.length;
        const newBpm = Math.round(60000 / avgMs);
        if (newBpm > 40 && newBpm < 300) setBpm(newBpm);
      }
      return times;
    });
  };
`
);

// Add global keyboard panic button listener
c = c.replace(
  /useEffect\(\(\) => \{\n\s*navigator\.mediaDevices/,
  `useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Spacebar for panic button (if not typing in an input)
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault();
        setGlobalBlackout(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    navigator.mediaDevices`
);

fs.writeFileSync('src/App.tsx', c);

