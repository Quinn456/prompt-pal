import { useMemo, useState } from "react";
import {
  EXAMPLE_GOAL,
  EXAMPLE_ROUGH,
  formatPrompt,
  shapePrompt,
  type Tone,
} from "./lib/shapePrompt";
import "./App.css";

const TONES: Tone[] = ["Concise", "Detailed", "Step-by-step", "Creative"];

export default function App() {
  const [rough, setRough] = useState("");
  const [goalHint, setGoalHint] = useState("");
  const [tone, setTone] = useState<Tone>("Concise");
  const [output, setOutput] = useState("");
  const [hasShaped, setHasShaped] = useState(false);
  const [copied, setCopied] = useState(false);

  const canShape = useMemo(
    () => rough.trim().length > 0 || goalHint.trim().length > 0,
    [rough, goalHint],
  );

  function handleShape() {
    if (!canShape) return;
    const structured = shapePrompt({
      roughThoughts: rough,
      goalHint,
      tone,
    });
    setOutput(formatPrompt(structured));
    setHasShaped(true);
    setCopied(false);
  }

  function handleExample() {
    setRough(EXAMPLE_ROUGH);
    setGoalHint(EXAMPLE_GOAL);
    setTone("Concise");
    setCopied(false);
    const structured = shapePrompt({
      roughThoughts: EXAMPLE_ROUGH,
      goalHint: EXAMPLE_GOAL,
      tone: "Concise",
    });
    setOutput(formatPrompt(structured));
    setHasShaped(true);
  }

  async function handleCopy() {
    if (!output.trim()) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Fallback for older environments
      const ta = document.createElement("textarea");
      ta.value = output;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ✦
          </span>
          <h1>Prompt Pal</h1>
        </div>
        <p className="tagline">
          Turn messy thoughts into clear, structured prompts for AI agents.
        </p>
      </header>

      <main className="layout">
        <section className="panel input-panel" aria-labelledby="input-heading">
          <div className="panel-head">
            <h2 id="input-heading">Your thoughts</h2>
            <button type="button" className="linkish" onClick={handleExample}>
              Try example
            </button>
          </div>

          <label className="field">
            <span className="label">Rough thoughts</span>
            <textarea
              className="textarea"
              rows={8}
              placeholder="Dump the messy, incomplete idea here — fillers and all."
              value={rough}
              onChange={(e) => setRough(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="label">
              What you&apos;re trying to get done{" "}
              <span className="optional">(optional)</span>
            </span>
            <input
              className="input"
              type="text"
              placeholder="e.g. Draft a launch checklist for the team"
              value={goalHint}
              onChange={(e) => setGoalHint(e.target.value)}
            />
          </label>

          <fieldset className="field chips-field">
            <legend className="label">Tone</legend>
            <div className="chips" role="group" aria-label="Tone">
              {TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`chip${tone === t ? " chip-active" : ""}`}
                  aria-pressed={tone === t}
                  onClick={() => setTone(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </fieldset>

          <button
            type="button"
            className="primary"
            disabled={!canShape}
            onClick={handleShape}
          >
            Shape into prompt
          </button>
        </section>

        <section className="panel output-panel" aria-labelledby="output-heading">
          <div className="panel-head">
            <h2 id="output-heading">Structured prompt</h2>
            <button
              type="button"
              className="secondary"
              disabled={!output.trim()}
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {hasShaped ? (
            <textarea
              className="textarea output-textarea"
              rows={16}
              aria-label="Editable structured prompt"
              value={output}
              onChange={(e) => {
                setOutput(e.target.value);
                setCopied(false);
              }}
            />
          ) : (
            <div className="placeholder" role="status">
              <p>
                Your shaped prompt will appear here with Goal, Context,
                Constraints, Desired output format, and a Clear ask.
              </p>
              <p className="muted">
                Everything runs in your browser — no accounts, no API keys.
              </p>
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>Prompt Pal shapes prompts locally. It keeps your intent and does not invent facts.</p>
      </footer>
    </div>
  );
}
