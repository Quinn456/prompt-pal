export type Tone = "Concise" | "Detailed" | "Step-by-step" | "Creative";

export interface ShapeInput {
  roughThoughts: string;
  goalHint: string;
  tone: Tone;
}

export interface StructuredPrompt {
  goal: string;
  context: string;
  constraints: string;
  outputFormat: string;
  clearAsk: string;
}

const FILLER_START =
  /^(um+|uh+|so+|like+|well+|okay+|ok+|anyway+|basically+|honestly+|i mean|you know)\b[,.\s-]*/i;

const FILLER_INLINE =
  /\b(um+|uh+|like,?|you know,?|i mean,?|kinda|sort of|sorta)\b/gi;

const HEDGE =
  /\b(maybe|perhaps|i guess|i think|i'm not sure but|not sure but)\b/gi;

function cleanText(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) return "";

  text = text
    .split("\n")
    .map((line) => line.replace(FILLER_START, "").trim())
    .join("\n");

  text = text.replace(FILLER_INLINE, " ");
  text = text.replace(HEDGE, " ");
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.replace(/ ([,.!?;:])/g, "$1");
  text = text.trim();

  // Light sentence-case / capitalize first letter of each paragraph
  text = text
    .split(/\n+/)
    .map((para) => {
      const p = para.trim();
      if (!p) return "";
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .filter(Boolean)
    .join("\n");

  // Ensure terminal punctuation on last sentence-ish chunk if it looks like a sentence
  if (text.length > 20 && !/[.!?]$/.test(text) && !/\n/.test(text)) {
    text += ".";
  }

  return text;
}

function firstSentence(text: string): string {
  const match = text.match(/^(.+?[.!?])(?:\s|$)/);
  if (match) return match[1].trim();
  const clause = text.split(/[,;\n]/)[0]?.trim() ?? text;
  return clause.length > 120 ? clause.slice(0, 117).trim() + "…" : clause;
}

function extractConstraints(text: string): string {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const cues =
    /\b(don't|do not|avoid|without|no |not |except|instead of|rather than|can't|cannot|shouldn't|must not|non-?goal|constraint)\b/i;
  const found = lines.filter((l) => cues.test(l));
  if (found.length) {
    return found.map((l) => (l.startsWith("-") ? l : `- ${l}`)).join("\n");
  }
  return "None stated — keep the response faithful to the request and do not invent details the user did not provide.";
}

function inferOutputFormat(text: string, tone: Tone): string {
  const lower = text.toLowerCase();
  if (/\b(table|spreadsheet|csv)\b/.test(lower)) return "A clear table or structured list.";
  if (/\b(bullet|list|checklist)\b/.test(lower)) return "A bulleted list.";
  if (/\b(code|function|script|component)\b/.test(lower)) return "Working code with brief comments where helpful.";
  if (/\b(email|message|reply)\b/.test(lower)) return "A ready-to-send message.";
  if (/\b(outline|plan|steps|roadmap)\b/.test(lower)) return "A numbered outline of steps.";
  if (/\b(summary|summarize|tldr)\b/.test(lower)) return "A short summary with key points.";

  switch (tone) {
    case "Concise":
      return "A short, direct response — prefer bullets over long paragraphs.";
    case "Detailed":
      return "A thorough response with clear sections and enough context to act on.";
    case "Step-by-step":
      return "A numbered sequence of steps, each actionable and concrete.";
    case "Creative":
      return "An engaging response with room for vivid examples, while staying on-topic.";
  }
}

function toneDirective(tone: Tone): string {
  switch (tone) {
    case "Concise":
      return "Be concise. Prefer short sentences and bullets. Skip fluff.";
    case "Detailed":
      return "Be thorough. Explain reasoning and cover edge cases the request implies.";
    case "Step-by-step":
      return "Break the work into clear, ordered steps. One action per step.";
    case "Creative":
      return "Use a creative, engaging voice. Offer imaginative options when useful, without changing the goal.";
  }
}

function buildClearAsk(goal: string, tone: Tone): string {
  const base = goal.replace(/\.$/, "");
  switch (tone) {
    case "Concise":
      return `Please ${base.charAt(0).toLowerCase()}${base.slice(1)} — keep it brief and actionable.`;
    case "Detailed":
      return `Please ${base.charAt(0).toLowerCase()}${base.slice(1)}. Include enough detail that I can use the answer immediately.`;
    case "Step-by-step":
      return `Please ${base.charAt(0).toLowerCase()}${base.slice(1)}, presented as a clear step-by-step guide.`;
    case "Creative":
      return `Please ${base.charAt(0).toLowerCase()}${base.slice(1)}, with a creative approach and a couple of strong options if relevant.`;
  }
}

export function shapePrompt(input: ShapeInput): StructuredPrompt {
  const cleaned = cleanText(input.roughThoughts);
  const goalHint = cleanText(input.goalHint);

  const goal = goalHint
    ? goalHint.endsWith(".")
      ? goalHint
      : goalHint + "."
    : cleaned
      ? firstSentence(cleaned)
      : "Clarify and complete the user's request.";

  const context = cleaned
    ? cleaned
    : goalHint
      ? "No additional context provided beyond the goal."
      : "No input provided.";

  const constraints = cleaned
    ? extractConstraints(cleaned)
    : "None stated — keep the response faithful to the request and do not invent details the user did not provide.";

  const outputFormat = inferOutputFormat(`${cleaned}\n${goalHint}`, input.tone);
  const clearAsk = buildClearAsk(goal, input.tone);

  // Attach tone as a soft constraint line when useful
  const constraintsWithTone =
    constraints + `\n- Tone: ${toneDirective(input.tone)}`;

  return {
    goal,
    context,
    constraints: constraintsWithTone,
    outputFormat,
    clearAsk,
  };
}

export function formatPrompt(p: StructuredPrompt): string {
  return [
    `## Goal`,
    p.goal,
    ``,
    `## Context`,
    p.context,
    ``,
    `## Constraints / non-goals`,
    p.constraints,
    ``,
    `## Desired output format`,
    p.outputFormat,
    ``,
    `## Clear ask`,
    p.clearAsk,
  ].join("\n");
}

export const EXAMPLE_ROUGH = `um so like i have this mess of notes from a meeting and i need the AI to turn them into something useful? we talked about the launch timeline, who owns what, and some risks but its all jumbled. maybe a checklist? dont invent deadlines we didnt agree on. i guess just help me make it clear for the team`;

export const EXAMPLE_GOAL = `Turn messy meeting notes into a clear team checklist.`;
