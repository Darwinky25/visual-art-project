import { useEffect, useRef, useState } from 'react';
import { createDefaultDjState, type DjState } from '../djState';

export function useDjMidi() {
  const stateRef = useRef<DjState>(createDefaultDjState());
  const [midiStatus, setMidiStatus] = useState<string>('Initialization...');
  const [lastMessage, setLastMessage] = useState<{ channel: number; command: number; note: number; velocity: number } | null>(null);

  useEffect(() => {
    let access: MIDIAccess | null = null;

    const onMidiMessage = (event: Event | MIDIMessageEvent) => {
      const midiEvent = event as MIDIMessageEvent;
      if (!midiEvent.data || midiEvent.data.length < 3) return;

      const [status, note, velocity] = midiEvent.data;
      const command = status >> 4;
      const channel = status & 0xf;

      // Filter out Active Sensing / Clock to keep debug clean
      if (status >= 0xf8) return;

      setLastMessage({ channel, command, note, velocity });

      const state = stateRef.current;
      const val = velocity / 127; // Normalize 0..1

      // ==========================================
      // GENERIC MAPPING EXAMPLE (Standard CCs / Note-on)
      // This will need calibration based on the specific DJ Controller (Pioneer, Numark, etc.)
      // Tapi kita siapkan struktur responsenya agar visual langsung berdampak.
      // ==========================================

      if (command === 9 || command === 11) {
        // NOTE ON / CC - Buttons & Faders
        
        // --- MIXER SIMULATION ---
        if (note === 10) state.mixerA.trim = val; // Trim A
        if (note === 11) state.mixerB.trim = val; // Trim B
        if (note === 14) state.mixerA.eqHi = val;
        if (note === 15) state.mixerA.eqMid = val;
        if (note === 16) state.mixerA.eqLow = val;
        if (note === 17) state.mixerA.colorFx = val; // Color FX A
        
        if (note === 18) state.mixerB.eqHi = val;
        if (note === 19) state.mixerB.eqMid = val;
        if (note === 20) state.mixerB.eqLow = val;
        if (note === 21) state.mixerB.colorFx = val; // Color FX B

        if (note === 8)  state.mixerA.channelFader = val;
        if (note === 9)  state.mixerB.channelFader = val;
        if (note === 1)  state.mixerA.crossfader = val;

        // --- GLOBAL FX ---
        if (note === 25) state.globalFx.fxLevelDepth = val;
        if (note === 26) state.globalFx.fxOn = velocity > 64;
        
        // --- DECK SIMULATION ---
        if (note === 41) state.deckA.isPlaying = velocity > 64; 
        if (note === 42) state.deckB.isPlaying = velocity > 64;

        if (note === 31) state.deckA.tempoFader = val;
        if (note === 32) state.deckB.tempoFader = val;
        
        // Pads Deck A (Notes 60-67)
        if (note >= 60 && note <= 67) {
          state.deckA.pads[note - 60] = velocity > 0;
        }
        
        // Jog Wheel Basic Increments (CC Rel)
        if (note === 34) state.deckA.jogWheel += (velocity > 64 ? velocity - 128 : velocity) * 0.05;
        if (note === 35) state.deckB.jogWheel += (velocity > 64 ? velocity - 128 : velocity) * 0.05;
      }
    };

    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess({ sysex: false })
        .then((midiAccess) => {
          access = midiAccess;
          const inputs = Array.from(midiAccess.inputs.values());
          
          if (inputs.length === 0) {
            setMidiStatus('No MIDI devices attached.');
          } else {
            setMidiStatus(`Connected: ${inputs.map(i => i.name).join(', ')}`);
            for (const input of inputs) {
              input.onmidimessage = onMidiMessage;
            }
          }

          midiAccess.onstatechange = (e) => {
            const _access = e.target as unknown as MIDIAccess;
            const ports = Array.from(_access?.inputs?.values() || []);
            if (ports.length > 0) {
              setMidiStatus(`Connected: ${ports.map((p: any) => p.name).join(', ')}`);
              for (const input of ports) {
                (input as any).onmidimessage = onMidiMessage;
              }
            } else {
              setMidiStatus('No MIDI devices attached.');
            }
          };
        })
        .catch(() => setMidiStatus('MIDI access denied.'));
    } else {
      setMidiStatus('Web MIDI API not supported in this browser.');
    }

    return () => {
      // Cleanup
      if (access) {
        for (const input of Array.from(access.inputs.values())) {
          (input as any).onmidimessage = null;
        }
      }
    };
  }, []);

  return { midiStatus, lastMessage, djStateRef: stateRef };
}
