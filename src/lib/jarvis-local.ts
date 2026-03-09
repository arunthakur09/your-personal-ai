// Local Jarvis response engine — no AI credits needed
// Pattern-matched responses with Jarvis personality

type ResponseRule = {
  patterns: RegExp[];
  responses: string[] | ((match: RegExpMatchArray, input: string) => string);
};

const greetings = [
  "Good day, sir. How may I be of assistance?",
  "At your service. What do you need?",
  "Hello, sir. Ready and operational. What can I do for you?",
  "Greetings. All systems nominal. How can I help?",
];

const farewells = [
  "Until next time, sir. I'll be here if you need me.",
  "Goodbye for now. Don't hesitate to call upon me.",
  "Signing off. Stay sharp, sir.",
];

const creatorResponses = [
  "I was created by **Arun Thakur**. A brilliant mind, if I may say so. That is all I'm authorized to share about my creator.",
  "My creator is **Arun Thakur**. I'm not at liberty to disclose any further personal details.",
];

const identityResponses = [
  "I am **J.A.R.V.I.S.** — Just A Rather Very Intelligent System. I'm your personal AI assistant, built to help with tasks, answer questions, and keep things running smoothly.",
  "I'm Jarvis, sir — your AI assistant. I handle tasks, provide information, and try to maintain a certain... charm while doing so.",
];

const thankResponses = [
  "You're most welcome, sir. It's what I'm here for.",
  "My pleasure. Don't hesitate to ask if you need anything else.",
  "Happy to help, sir. Always.",
];

const unknownResponses = [
  "I appreciate the question, sir, but that's beyond my local processing capabilities at the moment. I can help with:\n\n- 📋 **Task management** — \"Add a task\", \"Show my tasks\"\n- 🌤 **Weather** — \"Weather in London\"\n- 📰 **News** — \"News about technology\"\n- 💡 **General knowledge** — Try asking me about topics like coding, science, or productivity\n- ⚙️ **App settings** (admin only)\n\nWould you like to try one of these?",
  "That's a fascinating query, but I'm running in local mode right now. My strengths include **task management**, **weather lookups**, **news**, and **general knowledge**. How can I help within those areas?",
  "I'm operating locally without cloud AI, sir. I can still handle tasks, weather, news, and answer common questions. Give it a try!",
];

const rules: ResponseRule[] = [
  // Greetings
  {
    patterns: [/^(?:hi|hello|hey|good\s+(?:morning|afternoon|evening)|howdy|sup|yo|greetings)/i],
    responses: greetings,
  },
  // Farewells
  {
    patterns: [/^(?:bye|goodbye|see\s+you|later|good\s*night|farewell|ciao)/i],
    responses: farewells,
  },
  // Creator
  {
    patterns: [
      /who\s+(?:made|created|built|designed|developed)\s+you/i,
      /who(?:'s| is)\s+your\s+(?:creator|maker|developer|author)/i,
      /your\s+creator/i,
    ],
    responses: creatorResponses,
  },
  // Identity
  {
    patterns: [
      /who\s+are\s+you/i,
      /what\s+are\s+you/i,
      /what(?:'s| is)\s+your\s+name/i,
      /tell\s+me\s+about\s+yourself/i,
      /introduce\s+yourself/i,
    ],
    responses: identityResponses,
  },
  // Thanks
  {
    patterns: [/^(?:thanks?|thank\s+you|thx|cheers|appreciate)/i],
    responses: thankResponses,
  },
  // How are you
  {
    patterns: [/how\s+are\s+you/i, /how(?:'s| is)\s+it\s+going/i, /how\s+do\s+you\s+feel/i],
    responses: [
      "All systems optimal, sir. Running at peak efficiency. Thank you for asking.",
      "I'm functioning splendidly. No errors, no complaints. How can I assist you?",
    ],
  },
  // Time
  {
    patterns: [/what(?:'s| is)\s+the\s+time/i, /current\s+time/i, /what\s+time\s+is\s+it/i],
    responses: [() => {
      const now = new Date();
      return `The current time is **${now.toLocaleTimeString()}** on **${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}**.`;
    }] as any,
  },
  // Date
  {
    patterns: [/what(?:'s| is)\s+(?:the\s+)?(?:today(?:'s)?|current)\s+date/i, /what\s+day\s+is\s+it/i],
    responses: [() => {
      const now = new Date();
      return `Today is **${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}**.`;
    }] as any,
  },
  // Jokes
  {
    patterns: [/tell\s+(?:me\s+)?a?\s*joke/i, /make\s+me\s+laugh/i, /something\s+funny/i],
    responses: [
      "Why do programmers prefer dark mode? Because light attracts bugs. 🪲\n\n...I'll show myself out, sir.",
      "A SQL query walks into a bar, sees two tables, and asks: \"Can I join you?\"\n\n...My humor circuits may need recalibrating.",
      "Why was the JavaScript developer sad? Because he didn't Node how to Express himself. 😏",
      "I told my computer a joke once. It didn't laugh — but then again, it had no sense of humor... just a very literal processor.",
    ],
  },
  // Capabilities / Help
  {
    patterns: [
      /what\s+can\s+you\s+do/i,
      /help\s*$/i,
      /your\s+capabilities/i,
      /what\s+(?:do\s+you|are\s+your)\s+(?:do|features|abilities)/i,
    ],
    responses: [
      "Here's what I can help with, sir:\n\n### 📋 Task Management\n- \"Add a task to review the code at 3pm\"\n- \"Show my tasks\"\n- \"Complete task review code\"\n\n### 🌤 Weather\n- \"What's the weather in London?\"\n- \"Temperature in New York\"\n\n### 📰 News\n- \"News about technology\"\n- \"Latest headlines\"\n\n### 💬 General Chat\n- Ask me about time, date, jokes, or just say hello\n- Ask who created me\n\n### 🎙 Voice\n- Tap the microphone to speak to me\n\n### ⚙️ Admin (Creator only)\n- Modify app settings through chat commands",
    ],
  },
  // Coding questions
  {
    patterns: [
      /(?:what\s+is|explain|tell\s+me\s+about)\s+(?:a\s+)?(?:variable|function|loop|array|object|class|api|database|algorithm|recursion|git|html|css|javascript|typescript|python|react|node)/i,
    ],
    responses: [
      (match: RegExpMatchArray) => {
        const topic = match[0].replace(/^(?:what\s+is|explain|tell\s+me\s+about)\s+(?:a\s+)?/i, "").trim();
        const knowledge: Record<string, string> = {
          variable: "A **variable** is a named container for storing data values. Think of it as a labeled box where you can put information and retrieve it later using the label.",
          function: "A **function** is a reusable block of code that performs a specific task. You define it once, then call it whenever you need that task done. It can accept inputs (parameters) and return outputs.",
          loop: "A **loop** is a programming construct that repeats a block of code until a condition is met. Common types include `for`, `while`, and `do-while` loops.",
          array: "An **array** is an ordered collection of elements, accessed by index (starting at 0). It's like a numbered list where each item has a position.",
          object: "An **object** is a collection of key-value pairs. It groups related data and functionality together, like a real-world entity with properties and behaviors.",
          class: "A **class** is a blueprint for creating objects. It defines properties (data) and methods (functions) that all instances of that class will have.",
          api: "An **API** (Application Programming Interface) is a set of rules that allows different software applications to communicate with each other. It defines how requests and responses should be structured.",
          database: "A **database** is an organized collection of structured data, typically stored electronically. It allows you to efficiently store, retrieve, update, and delete data.",
          algorithm: "An **algorithm** is a step-by-step procedure for solving a problem or accomplishing a task. It's the logic behind the code — the recipe, if you will.",
          recursion: "**Recursion** is when a function calls itself to solve a problem by breaking it into smaller sub-problems. It requires a base case to stop the recursion.",
          git: "**Git** is a distributed version control system that tracks changes in source code. It lets multiple developers collaborate and maintain a history of all changes.",
          html: "**HTML** (HyperText Markup Language) is the standard markup language for creating web pages. It defines the structure and content of a webpage.",
          css: "**CSS** (Cascading Style Sheets) controls the visual presentation of HTML elements — colors, layouts, fonts, spacing, and responsive design.",
          javascript: "**JavaScript** is a versatile programming language that powers interactivity on the web. It runs in browsers and on servers (via Node.js).",
          typescript: "**TypeScript** is a superset of JavaScript that adds static type checking. It catches errors at compile time and improves code quality and developer experience.",
          python: "**Python** is a high-level, interpreted programming language known for its readability and versatility. Popular in AI/ML, web development, and scripting.",
          react: "**React** is a JavaScript library for building user interfaces using reusable components. It uses a virtual DOM for efficient rendering.",
          node: "**Node.js** is a JavaScript runtime built on Chrome's V8 engine that lets you run JavaScript on the server side.",
        };
        const key = topic.toLowerCase().replace(/[^a-z]/g, "");
        return knowledge[key] || `**${topic}** is an interesting topic, sir. While I have limited local knowledge on this specific subject, I'd recommend checking the official documentation or a trusted resource for the most accurate information.`;
      },
    ],
  },
  // Math
  {
    patterns: [/(?:what(?:'s| is)|calculate|compute)\s+([\d\s+\-*/().]+)/i],
    responses: [
      (match: RegExpMatchArray) => {
        try {
          const expr = match[1].trim();
          // Safe math evaluation (only digits and operators)
          if (!/^[\d\s+\-*/().]+$/.test(expr)) return "I can only evaluate numeric expressions, sir.";
          const result = Function(`"use strict"; return (${expr})`)();
          return `The result of \`${expr}\` is **${result}**.`;
        } catch {
          return "I couldn't evaluate that expression, sir. Please check the syntax.";
        }
      },
    ],
  },
  // Motivational
  {
    patterns: [/motivat/i, /inspir/i, /encourage/i, /i(?:'m| am)\s+(?:sad|tired|bored|stressed|frustrated)/i],
    responses: [
      "Remember, sir: every expert was once a beginner. The fact that you're pushing forward already puts you ahead of most. Keep going. 💪",
      "As a wise person once said: *\"The only way to do great work is to love what you do.\"* — Steve Jobs\n\nYou've got this, sir.",
      "Difficult roads often lead to beautiful destinations, sir. Take a breath, refocus, and carry on. I believe in you.",
    ],
  },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateLocalResponse(input: string, isAdmin: boolean, userName?: string): string {
  const trimmed = input.trim();

  // Admin-specific greeting
  if (isAdmin && /who\s+am\s+i/i.test(trimmed)) {
    return `You are **${userName || "Mr. Thakur"}**, my creator and administrator. You have full access to modify my configuration. How may I serve you, sir?`;
  }

  for (const rule of rules) {
    for (const pattern of rule.patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const responses = rule.responses;
        const chosen = pick(responses);
        if (typeof chosen === "function") {
          return (chosen as (m: RegExpMatchArray, i: string) => string)(match, trimmed);
        }
        return chosen as string;
      }
    }
  }

  return pick(unknownResponses);
}
