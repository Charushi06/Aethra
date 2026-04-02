import { ModelCategory } from '@runanywhere/web';
import {
  ToolCalling,
  ToolCallFormat,
  toToolValue,
  getStringArg,
  getNumberArg,
  type ToolDefinition,
  type ToolCall,
  type ToolResult,
  type ToolCallingResult,
  type ToolValue,
} from '@runanywhere/web-llamacpp';
import { useState, useRef, useEffect, useCallback } from 'react';

import { useModelLoader } from '../hooks/useModelLoader';
import { ModelBanner } from './ModelBanner';

const DEMO_TOOLS: { def: ToolDefinition; executor: Parameters<typeof ToolCalling.registerTool>[1] }[] = [
  {
    def: {
      name: 'get_weather',
      description: 'Gets the current weather for a city. Returns temperature in Fahrenheit and a short condition.',
      parameters: [
        { name: 'location', type: 'string', description: 'City name (e.g. "San Francisco")', required: true },
      ],
      category: 'Utility',
    },
    executor: async (args) => {
      const city = getStringArg(args, 'location') ?? 'Unknown';
      const conditions = ['Sunny', 'Partly Cloudy', 'Overcast', 'Rainy', 'Windy', 'Foggy'];
      const temp = Math.round(45 + Math.random() * 50);
      const condition = conditions[Math.floor(Math.random() * conditions.length)];
      return {
        location: toToolValue(city),
        temperature_f: toToolValue(temp),
        condition: toToolValue(condition),
        humidity_pct: toToolValue(Math.round(30 + Math.random() * 60)),
      };
    },
  },
  {
    def: {
      name: 'calculate',
      description: 'Evaluates a mathematical expression and returns the numeric result.',
      parameters: [
        { name: 'expression', type: 'string', description: 'Math expression (e.g. "2 + 3 * 4")', required: true },
      ],
      category: 'Math',
    },
    executor: async (args): Promise<Record<string, ToolValue>> => {
      const expr = getStringArg(args, 'expression') ?? '0';
      try {
        const sanitized = expr.replace(/[^0-9+\-*/().%\s^]/g, '');
        const val = Function(`"use strict"; return (${sanitized})`)();
        return { result: toToolValue(Number(val)), expression: toToolValue(expr) };
      } catch {
        return { error: toToolValue(`Invalid expression: ${expr}`) };
      }
    },
  },
];

interface TraceStep {
  type: 'user' | 'tool_call' | 'tool_result' | 'response';
  content: string;
  detail?: ToolCall | ToolResult;
}

interface ParamDraft {
  name: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
  required: boolean;
}

const EMPTY_PARAM: ParamDraft = { name: '', type: 'string', description: '', required: true };

export function ToolsTab() {
  const loader = useModelLoader(ModelCategory.Language);
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [autoExecute, setAutoExecute] = useState(true);
  const [trace, setTrace] = useState<TraceStep[]>([]);
  const [registeredTools, setRegisteredTools] = useState<ToolDefinition[]>([]);
  const [showToolForm, setShowToolForm] = useState(false);
  const [showRegistry, setShowRegistry] = useState(false);
  const traceRef = useRef<HTMLDivElement>(null);

  const [toolName, setToolName] = useState('');
  const [toolDesc, setToolDesc] = useState('');
  const [toolParams, setToolParams] = useState<ParamDraft[]>([{ ...EMPTY_PARAM }]);

  // AUTO-LOAD MODELS ON MOUNT
  useEffect(() => {
    if (loader.state === 'idle') {
      loader.ensure();
    }
  }, [loader]);

  useEffect(() => {
    ToolCalling.clearTools();
    for (const { def, executor } of DEMO_TOOLS) {
      ToolCalling.registerTool(def, executor);
    }
    setRegisteredTools(ToolCalling.getRegisteredTools());
    return () => { ToolCalling.clearTools(); };
  }, []);

  useEffect(() => {
    traceRef.current?.scrollTo({ top: traceRef.current.scrollHeight, behavior: 'smooth' });
  }, [trace]);

  const refreshRegistry = useCallback(() => {
    setRegisteredTools(ToolCalling.getRegisteredTools());
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || generating) return;

    if (loader.state !== 'ready') {
      const ok = await loader.ensure();
      if (!ok) return;
    }

    setInput('');
    setGenerating(true);
    setTrace([{ type: 'user', content: text }]);

    try {
      const result: ToolCallingResult = await ToolCalling.generateWithTools(text, {
        autoExecute,
        maxToolCalls: 5,
        temperature: 0.3,
        maxTokens: 512,
        format: ToolCallFormat.Default,
      });

      const steps: TraceStep[] = [{ type: 'user', content: text }];
      for (let i = 0; i < result.toolCalls.length; i++) {
        const call = result.toolCalls[i];
        steps.push({ type: 'tool_call', content: `${call.toolName}`, detail: call });
        if (result.toolResults[i]) {
          const res = result.toolResults[i];
          steps.push({ type: 'tool_result', content: JSON.stringify(res.result), detail: res });
        }
      }
      if (result.text) steps.push({ type: 'response', content: result.text });
      setTrace(steps);
    } catch (err) {
      setTrace((prev) => [...prev, { type: 'response', content: `Error: ${err}` }]);
    } finally {
      setGenerating(false);
    }
  }, [input, generating, autoExecute, loader]);

  return (
    <div className="tab-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="serif" style={{ fontSize: '32px' }}>Design Intelligence</h2>
        <ModelBanner state={loader.state} progress={loader.progress} error={loader.error} onLoad={loader.ensure} label="Insight LLM" />
      </div>

      <div className="vision-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
             <button className="btn btn-sm" onClick={() => setShowRegistry(!showRegistry)}>Tools ({registeredTools.length})</button>
             <button className="btn btn-sm" onClick={() => setShowToolForm(!showToolForm)}>+ Custom</button>
        </div>

        <div className="tools-trace" ref={traceRef} style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-deep)', borderRadius: '10px', padding: '20px' }}>
          {trace.length === 0 && (
            <div className="empty-state">
              <h3 className="serif">Smart Instruments</h3>
              <p>Ask questions that require calculations or live data.</p>
            </div>
          )}
          {trace.map((step, i) => (
            <div key={i} className={`trace-step trace-${step.type}`} style={{ marginBottom: '12px' }}>
              <strong>{step.type.toUpperCase()}:</strong> {step.content}
            </div>
          ))}
        </div>

        <form style={{ display: 'flex', gap: '12px' }} onSubmit={(e) => { e.preventDefault(); send(); }}>
           <input className="vision-prompt-box" placeholder="Ask for measurements or area calculations..." value={input} onChange={(e) => setInput(e.target.value)} style={{ border: 'none' }} />
           <button className="btn btn-primary" disabled={generating}>Send</button>
        </form>
      </div>
    </div>
  );
}
