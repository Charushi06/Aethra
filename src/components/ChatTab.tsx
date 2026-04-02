import { useState, useRef, useEffect, useCallback } from 'react';
import { ModelCategory } from '@runanywhere/web';
import { TextGeneration } from '@runanywhere/web-llamacpp';
import { useModelLoader } from '../hooks/useModelLoader';
import { ModelBanner } from './ModelBanner';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  stats?: { tokens: number; tokPerSec: number; latencyMs: number };
}

const DESIGN_PRESETS = [
  "Maximize natural light",
  "Home office palettes",
  "Industrial vs Modern",
  "Plant decor tips"
];

export function ChatTab() {
  const loader = useModelLoader(ModelCategory.Language);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // AUTO-LOAD MODELS ON MOUNT
  useEffect(() => {
    if (loader.state === 'idle') {
      loader.ensure();
    }
  }, [loader]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async (customText?: string) => {
    const text = (customText || input).trim();
    if (!text || generating) return;

    if (loader.state !== 'ready') {
      const ok = await loader.ensure();
      if (!ok) return;
    }

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setGenerating(true);

    setMessages((prev) => [...prev, { role: 'assistant', text: '' }]);

    const systemPrompt = "You are Aethra, an expert interior designer. Provide professional and creative design advice. Keep it under 100 words.";

    try {
      const { stream, result: resultPromise, cancel } = await TextGeneration.generateStream(
        systemPrompt + "\nUser: " + text + "\nAethra:", 
        { maxTokens: 400, temperature: 0.7 }
      );
      cancelRef.current = cancel;

      let accumulated = '';
      for await (const token of stream) {
        accumulated += token;
        setMessages((prev) => {
          const updated = [...prev];
          updated[prev.length - 1] = { role: 'assistant', text: accumulated };
          return updated;
        });
      }

      const result = await resultPromise;
      setMessages((prev) => {
        const updated = [...prev];
        updated[prev.length - 1] = {
          role: 'assistant',
          text: result.text || accumulated,
          stats: {
            tokens: result.tokensUsed,
            tokPerSec: result.tokensPerSecond,
            latencyMs: result.latencyMs,
          },
        };
        return updated;
      });
    } catch (err) {
      setMessages((prev) => [...prev.slice(0, -1), { role: 'assistant', text: `Connection Error: ${err}` }]);
    } finally {
      cancelRef.current = null;
      setGenerating(false);
    }
  }, [input, generating, messages.length, loader]);

  return (
    <div className="tab-panel advisor-container">
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="serif" style={{ fontSize: '32px' }}>Aethra Advisor</h2>
        <ModelBanner state={loader.state} progress={loader.progress} error={loader.error} onLoad={loader.ensure} label="LLM Advisor" />
      </div>

      <div className="message-list" ref={listRef} style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius)', padding: '30px' }}>
        {messages.length === 0 && (
          <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🛋️</div>
            <h3 className="serif" style={{ fontSize: '28px' }}>Ask Your Designer</h3>
            <p className="section-desc">Consult with Aethra about spatial planning, lighting, or materials.</p>
            
            <div className="aesthetic-grid" style={{ marginTop: '30px', justifyContent: 'center' }}>
               {DESIGN_PRESETS.map(preset => (
                 <div key={preset} className="aesthetic-item" onClick={() => send(preset)} style={{ minWidth: '160px' }}>
                   {preset}
                 </div>
               ))}
            </div>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`message-bubble ${msg.role === 'user' ? 'message-user' : 'message-assistant'}`} style={{ marginBottom: '16px', maxWidth: '80%', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
             <p style={{ fontWeight: msg.role === 'assistant' ? 400 : 600 }}>{msg.text || 'Thinking...'}</p>
             {msg.stats && <div className="badge" style={{ fontSize: '8px', opacity: 0.6, marginTop: '8px' }}>{msg.stats.tokPerSec.toFixed(1)} tokens/sec</div>}
          </div>
        ))}
      </div>

      <div className="vision-card" style={{ padding: '16px 24px' }}>
        <form style={{ display: 'flex', gap: '16px' }} onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input
            className="vision-prompt-box"
            placeholder="Describe your design challenge..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={generating}
            style={{ border: 'none', background: 'transparent' }}
          />
          <button type="submit" className="btn btn-primary" disabled={!input.trim() || generating}>
            {generating ? '...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
