const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

if (!code.includes('useAudioFileAnalyzer')) {
  code = code.replace(
    /import \{ useMicrophoneAnalyzer \} from '\.\/hooks\/useMicrophoneAnalyzer';/,
    "import { useMicrophoneAnalyzer } from './hooks/useMicrophoneAnalyzer';\nimport { useAudioFileAnalyzer } from './hooks/useAudioFileAnalyzer';"
  );
  
  code = code.replace(
    /const \{ frame, start, stop, isRunning, status \} = useMicrophoneAnalyzer\(\);/,
    "const { frame: micFrame, start: micStart, stop: micStop, isRunning: micIsRunning, status: micStatus } = useMicrophoneAnalyzer();\n  const { metrics: fileMetrics, start: fileStart, stop: fileStop, isRunning: fileIsRunning, status: fileStatus } = useAudioFileAnalyzer();\n  const [activeSource, setActiveSource] = useState<'mic' | 'file'>('mic');"
  );
  
  code = code.replace(
    /const handleStart = async \(\) => \{[\s\S]*?\};/,
    "const handleStartMic = async () => {\n    fileStop();\n    setActiveSource('mic');\n    await micStart();\n  };\n\n  const handleStop = () => {\n    micStop();\n    fileStop();\n  };\n\n  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {\n    const file = e.target.files?.[0];\n    if (!file) return;\n    \n    micStop();\n    setActiveSource('file');\n    await fileStart(file);\n  };"
  );

  code = code.replace(/\{status === 'starting' \? 'Membuka Mic\.\.\.' : 'Start Microphone'\}/g, "{micStatus === 'starting' ? 'Membuka Mic...' : 'Start Microphone'}");
  code = code.replace(/disabled=\{status === 'starting'\}/g, "disabled={micStatus === 'starting'}");
  code = code.replace(/onClick=\{handleStart\}/g, "onClick={handleStartMic}");
  
  code = code.replace(/drawVisualizer\(\n\s*ctx,\n\s*canvas,\n\s*frame\.current/g, 
  "// Using proxy for file to match frame type\n        const currentData = activeSource === 'mic' ? micFrame.current : {\n            bass: fileMetrics.bass,\n            mids: fileMetrics.mid,\n            highs: fileMetrics.high,\n            level: fileMetrics.volume,\n            pulse: fileMetrics.bass,\n            peak: fileMetrics.volume,\n            bpmHint: 0,\n            frequency: new Uint8Array(256),\n            waveform: new Uint8Array(256)\n        };\n        \n        drawVisualizer(\n          ctx,\n          canvas,\n          currentData"
  );
          
  const btnReplacement = "<div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block', marginLeft: '10px' }}>\n             <button className=\"controls-btn primary\" disabled={fileStatus === 'starting'}>\n                {fileStatus === 'starting' ? 'Loading Audio...' : 'Play Audio File'}\n             </button>\n             <input \n               type=\"file\" \n               accept=\"audio/*\" \n               onChange={handleFileChange} \n               style={{ position: 'absolute', top: 0, left: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}\n             />\n           </div>\n           <button \n             className=\"controls-btn secondary\" \n             onClick={handleStop}\n           >";
           
  code = code.replace(/<button\s+className=\"controls-btn secondary\"\s+onClick=\{handleStop\}\s*>/, btnReplacement);
  
  fs.writeFileSync('src/App.tsx', code);
}
