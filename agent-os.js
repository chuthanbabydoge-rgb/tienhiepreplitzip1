/**
 * ╔══════════════════════════════════════════════════════════════════╗
 *  VƯƠNG ĐẾ AI — Agent Operating System v1
 *  ReAct-style (Reason → Act → Observe) runtime with Gemini
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 *  Architecture for multi-agent collaboration:
 *    Agent A can delegate sub-tasks to Agent B via the `delegate` tool.
 *    All inter-agent communication is logged in aos_task_executions.
 */

'use strict';

const { GoogleGenAI } = require('@google/genai');

// ─── Gemini factory ────────────────────────────────────────────────────────────
function getAI() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY chưa được thiết lập');
  return new GoogleGenAI({ apiKey });
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function jsonTry(str) {
  try { return JSON.parse(str); } catch { return null; }
}

/** Sanitize a raw JSON string that may have unescaped newlines inside string values */
function sanitizeJSON(str) {
  // Replace actual CR/LF inside JSON string values (between quotes) with \n / \r
  let result = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (escaped) { result += ch; escaped = false; continue; }
    if (ch === '\\' && inString) { result += ch; escaped = true; continue; }
    if (ch === '"') { inString = !inString; result += ch; continue; }
    if (inString && (ch === '\n')) { result += '\\n'; continue; }
    if (inString && (ch === '\r')) { result += '\\r'; continue; }
    if (inString && (ch === '\t')) { result += '\\t'; continue; }
    result += ch;
  }
  return result;
}

/** Extract structured {thought, action, action_input} from raw model text */
function extractJSON(text) {
  // 1. Code fence block
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) {
    const r = jsonTry(m[1].trim()) || jsonTry(sanitizeJSON(m[1].trim()));
    if (r) return r;
  }

  // 2. Outermost braces — try raw then sanitized
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  if (s !== -1 && e !== -1) {
    const chunk = text.slice(s, e + 1);
    const r = jsonTry(chunk) || jsonTry(sanitizeJSON(chunk));
    if (r) return r;
  }

  // 3. Regex fallback — extract action & action_input individually
  const actionM = text.match(/"action"\s*:\s*"([^"]+)"/);
  if (!actionM) return null;

  const thoughtM = text.match(/"thought"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/);

  // Find action_input JSON object — greedily match balanced braces
  let actionInput = {};
  const aiStart = text.indexOf('"action_input"');
  if (aiStart !== -1) {
    const bStart = text.indexOf('{', aiStart);
    if (bStart !== -1) {
      let depth = 0, bEnd = -1;
      for (let i = bStart; i < text.length; i++) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') { depth--; if (depth === 0) { bEnd = i; break; } }
      }
      if (bEnd !== -1) {
        const raw = text.slice(bStart, bEnd + 1);
        actionInput = jsonTry(raw) || jsonTry(sanitizeJSON(raw)) || {};
      }
    }
  }

  return {
    thought: thoughtM ? thoughtM[1].replace(/\\n/g, '\n') : text.slice(0, 300),
    action: actionM[1],
    action_input: actionInput,
  };
}

// ─── Database schema ───────────────────────────────────────────────────────────
async function initAOSTables(pool) {
  await pool.query(`
    -- Agents
    CREATE TABLE IF NOT EXISTS aos_agents (
      id               SERIAL PRIMARY KEY,
      name             TEXT NOT NULL,
      role             TEXT NOT NULL,
      goal             TEXT NOT NULL,
      backstory        TEXT NOT NULL DEFAULT '',
      model            TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
      tool_ids         JSONB NOT NULL DEFAULT '[]',
      collaborates_with JSONB NOT NULL DEFAULT '[]',
      max_iterations   INT  NOT NULL DEFAULT 8,
      status           TEXT NOT NULL DEFAULT 'idle',
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      updated_at       TIMESTAMPTZ DEFAULT NOW()
    );

    -- Tools registry
    CREATE TABLE IF NOT EXISTS aos_tools (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      type        TEXT NOT NULL DEFAULT 'builtin',
      config      JSONB NOT NULL DEFAULT '{}',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    -- Tasks
    CREATE TABLE IF NOT EXISTS aos_tasks (
      id               SERIAL PRIMARY KEY,
      title            TEXT NOT NULL,
      description      TEXT NOT NULL,
      expected_output  TEXT NOT NULL DEFAULT '',
      assigned_agent_id INT REFERENCES aos_agents(id) ON DELETE SET NULL,
      parent_task_id   INT REFERENCES aos_tasks(id) ON DELETE SET NULL,
      status           TEXT NOT NULL DEFAULT 'pending',
      priority         INT  NOT NULL DEFAULT 5,
      input            JSONB NOT NULL DEFAULT '{}',
      output           TEXT,
      error            TEXT,
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      updated_at       TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_aos_tasks_agent ON aos_tasks(assigned_agent_id);
    CREATE INDEX IF NOT EXISTS idx_aos_tasks_status ON aos_tasks(status);

    -- Task executions (one per agent run of a task)
    CREATE TABLE IF NOT EXISTS aos_task_executions (
      id           SERIAL PRIMARY KEY,
      task_id      INT NOT NULL REFERENCES aos_tasks(id) ON DELETE CASCADE,
      agent_id     INT NOT NULL REFERENCES aos_agents(id) ON DELETE CASCADE,
      status       TEXT NOT NULL DEFAULT 'running',
      steps        JSONB NOT NULL DEFAULT '[]',
      tokens_in    INT  NOT NULL DEFAULT 0,
      tokens_out   INT  NOT NULL DEFAULT 0,
      iterations   INT  NOT NULL DEFAULT 0,
      input        TEXT,
      output       TEXT,
      error        TEXT,
      started_at   TIMESTAMPTZ DEFAULT NOW(),
      finished_at  TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_aos_exec_task  ON aos_task_executions(task_id);
    CREATE INDEX IF NOT EXISTS idx_aos_exec_agent ON aos_task_executions(agent_id);

    -- Agent memory (episodic + semantic)
    CREATE TABLE IF NOT EXISTS aos_agent_memory (
      id           SERIAL PRIMARY KEY,
      agent_id     INT  NOT NULL REFERENCES aos_agents(id) ON DELETE CASCADE,
      task_id      INT  REFERENCES aos_tasks(id) ON DELETE SET NULL,
      exec_id      INT  REFERENCES aos_task_executions(id) ON DELETE SET NULL,
      type         TEXT NOT NULL DEFAULT 'result',
      content      TEXT NOT NULL,
      importance   INT  NOT NULL DEFAULT 5,
      tags         JSONB NOT NULL DEFAULT '[]',
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_aos_mem_agent ON aos_agent_memory(agent_id);
    CREATE INDEX IF NOT EXISTS idx_aos_mem_type  ON aos_agent_memory(type);
  `);

  // Seed built-in tools if not present
  await pool.query(`
    INSERT INTO aos_tools (name, description, type, config) VALUES
      ('memory_recall',    'Tìm kiếm trong bộ nhớ dài hạn của agent. Input: {"query":"..."} → trả về các ký ức liên quan.',      'builtin', '{}'),
      ('memory_save',      'Lưu thông tin quan trọng vào bộ nhớ dài hạn. Input: {"content":"...","importance":1-10}.',             'builtin', '{}'),
      ('calculate',        'Tính toán biểu thức toán học. Input: {"expression":"2+2*10"} → số kết quả.',                          'builtin', '{}'),
      ('summarize',        'Tóm tắt văn bản dài bằng Gemini. Input: {"text":"..."} → bản tóm tắt.',                               'builtin', '{}'),
      ('web_search',       'Tìm kiếm thông tin trên internet (stub — trả về gợi ý tìm kiếm). Input: {"query":"..."}.',            'builtin', '{}'),
      ('delegate',         'Uỷ quyền sub-task cho agent khác. Input: {"agent_id":N,"title":"...","description":"..."}.',          'builtin', '{}'),
      ('ask_user',         'Gửi câu hỏi làm rõ cho người dùng (ghi vào log). Input: {"question":"..."}.',                        'builtin', '{}'),
      ('final_answer',     'Kết thúc vòng lặp và trả về câu trả lời cuối cùng. Input: {"answer":"..."}.',                        'builtin', '{}')
    ON CONFLICT (name) DO NOTHING;
  `);

  console.log('✅ Agent OS tables ready');
}

// ─── Built-in Tool Executor ────────────────────────────────────────────────────
class ToolExecutor {
  constructor(pool, agentId, taskId, execId) {
    this.pool    = pool;
    this.agentId = agentId;
    this.taskId  = taskId;
    this.execId  = execId;
  }

  async run(toolName, args) {
    switch (toolName) {
      case 'memory_recall':   return this._memoryRecall(args);
      case 'memory_save':     return this._memorySave(args);
      case 'calculate':       return this._calculate(args);
      case 'summarize':       return this._summarize(args);
      case 'web_search':      return this._webSearch(args);
      case 'delegate':        return this._delegate(args);
      case 'ask_user':        return { result: `[Câu hỏi đã ghi lại]: ${args.question}` };
      case 'final_answer':    return { done: true, result: args.answer || '' };
      default:                return { error: `Công cụ '${toolName}' không tồn tại` };
    }
  }

  async _memoryRecall({ query = '' }) {
    const { rows } = await this.pool.query(
      `SELECT content, type, importance, created_at
       FROM aos_agent_memory
       WHERE agent_id=$1 AND content ILIKE $2
       ORDER BY importance DESC, created_at DESC LIMIT 5`,
      [this.agentId, `%${query}%`]
    );
    if (!rows.length) return { result: 'Không tìm thấy ký ức liên quan.' };
    return { result: rows.map(r => `[${r.type}] ${r.content}`).join('\n\n') };
  }

  async _memorySave({ content = '', importance = 5, tags = [] }) {
    await this.pool.query(
      `INSERT INTO aos_agent_memory (agent_id, task_id, exec_id, type, content, importance, tags)
       VALUES ($1,$2,$3,'observation',$4,$5,$6)`,
      [this.agentId, this.taskId, this.execId, content, Math.min(10, Math.max(1, importance)), JSON.stringify(tags)]
    );
    return { result: 'Đã lưu vào bộ nhớ.' };
  }

  async _calculate({ expression = '' }) {
    try {
      // Safe evaluation of simple math
      const result = Function(`"use strict"; return (${expression.replace(/[^0-9+\-*/().% ]/g, '')})`)();
      return { result: String(result) };
    } catch (e) {
      return { error: `Không thể tính: ${e.message}` };
    }
  }

  async _summarize({ text = '' }) {
    try {
      const ai = getAI();
      const r = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: `Tóm tắt ngắn gọn (3-5 câu) đoạn văn sau:\n\n${text.slice(0, 8000)}` }] }],
        config: { maxOutputTokens: 512 },
      });
      return { result: r.text || '' };
    } catch (e) { return { error: e.message }; }
  }

  async _webSearch({ query = '' }) {
    // Stub — returns guidance; wire to a real search API in v2
    return {
      result: `[Web Search Stub] Truy vấn: "${query}"\n` +
              `Gợi ý: Tìm kiếm thủ công tại https://www.google.com/search?q=${encodeURIComponent(query)}\n` +
              `(Tích hợp API tìm kiếm thực sẽ có trong v2)`,
    };
  }

  async _delegate({ agent_id, title = '', description = '' }) {
    try {
      const { rows: [agent] } = await this.pool.query('SELECT id,name FROM aos_agents WHERE id=$1', [agent_id]);
      if (!agent) return { error: `Agent ID ${agent_id} không tồn tại` };

      const { rows: [task] } = await this.pool.query(
        `INSERT INTO aos_tasks (title, description, assigned_agent_id, parent_task_id, status)
         VALUES ($1,$2,$3,$4,'pending') RETURNING id`,
        [title, description, agent_id, this.taskId]
      );
      return { result: `Đã uỷ quyền task #${task.id} ("${title}") cho ${agent.name}. Chạy task này để lấy kết quả.` };
    } catch (e) { return { error: e.message }; }
  }
}

// ─── ReAct Agent Runtime ───────────────────────────────────────────────────────
class AgentRuntime {
  constructor(pool) {
    this.pool = pool;
  }

  /** Build the system prompt for an agent */
  buildSystemPrompt(agent, tools) {
    const toolList = tools.map(t => `  • ${t.name}: ${t.description}`).join('\n');
    return `Bạn là ${agent.name}.
VAI TRÒ: ${agent.role}
MỤC TIÊU: ${agent.goal}
BỐI CẢNH: ${agent.backstory}

Bạn làm việc theo vòng lặp Reason→Act→Observe cho đến khi hoàn thành nhiệm vụ.
Mỗi lượt, bạn phải trả lời đúng định dạng JSON sau (KHÔNG thêm nội dung ngoài JSON):

{
  "thought": "Suy nghĩ nội tâm về tình huống hiện tại và bước tiếp theo",
  "action": "tên_công_cụ",
  "action_input": { ... tham số của công cụ ... }
}

Để kết thúc, dùng action "final_answer":
{
  "thought": "Tôi đã có đủ thông tin để trả lời",
  "action": "final_answer",
  "action_input": { "answer": "Câu trả lời đầy đủ và chính xác..." }
}

CÔNG CỤ CÓ SẴN:
${toolList}

QUY TẮC:
- Luôn suy nghĩ trước khi hành động (thought)
- Chỉ dùng một công cụ mỗi lượt
- Đọc kỹ kết quả observation trước khi quyết định bước tiếp
- Tối đa ${agent.max_iterations} vòng lặp — hãy hiệu quả
- Trả lời bằng tiếng Việt`;
  }

  /** Run one agent on one task — returns { output, steps, tokensIn, tokensOut } */
  async runAgent(agentId, taskId, inputOverride = null) {
    const pool = this.pool;

    // Load agent
    const { rows: [agent] } = await pool.query('SELECT * FROM aos_agents WHERE id=$1', [agentId]);
    if (!agent) throw new Error(`Agent ID ${agentId} không tồn tại`);

    // Load task
    const { rows: [task] } = await pool.query('SELECT * FROM aos_tasks WHERE id=$1', [taskId]);
    if (!task) throw new Error(`Task ID ${taskId} không tồn tại`);

    // Load tools for this agent
    const toolIds = Array.isArray(agent.tool_ids) ? agent.tool_ids : [];
    let tools;
    if (toolIds.length > 0) {
      const { rows } = await pool.query('SELECT * FROM aos_tools WHERE id = ANY($1)', [toolIds]);
      tools = rows;
    } else {
      // Default: give all builtin tools
      const { rows } = await pool.query("SELECT * FROM aos_tools WHERE type='builtin'");
      tools = rows;
    }

    // Load recent agent memory for context
    const { rows: recentMemory } = await pool.query(
      `SELECT content, type, created_at FROM aos_agent_memory
       WHERE agent_id=$1 ORDER BY importance DESC, created_at DESC LIMIT 5`,
      [agentId]
    );
    const memoryContext = recentMemory.length
      ? '\n\nBỘ NHỚ GẦN ĐÂY:\n' + recentMemory.map(m => `[${m.type}] ${m.content}`).join('\n')
      : '';

    // Create execution record
    const taskInput = inputOverride || (task.input?.input || task.description);
    const { rows: [exec] } = await pool.query(
      `INSERT INTO aos_task_executions (task_id, agent_id, status, input)
       VALUES ($1,$2,'running',$3) RETURNING id`,
      [taskId, agentId, taskInput]
    );
    const execId = exec.id;

    // Update task + agent status
    await pool.query("UPDATE aos_tasks   SET status='running', updated_at=NOW() WHERE id=$1", [taskId]);
    await pool.query("UPDATE aos_agents  SET status='busy',    updated_at=NOW() WHERE id=$1", [agentId]);

    const toolExec = new ToolExecutor(pool, agentId, taskId, execId);
    const ai = getAI();
    const systemPrompt = this.buildSystemPrompt(agent, tools) + memoryContext;

    // Conversation history for ReAct loop
    const conversation = [
      { role: 'user',  parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: '{"thought":"Tôi đã hiểu nhiệm vụ. Bắt đầu thực hiện.","action":"memory_recall","action_input":{"query":"thông tin liên quan"}}' }] },
      { role: 'user',  parts: [{ text: `NHIỆM VỤ: ${task.title}\nMÔ TẢ: ${task.description}\nĐẦU VÀO: ${taskInput}\nĐẦU RA KỲ VỌNG: ${task.expected_output || 'Kết quả chất lượng cao'}` }] },
    ];

    const steps = [];
    let tokensIn = 0, tokensOut = 0;
    let finalOutput = null;
    const maxIter = agent.max_iterations || 8;

    try {
      for (let iter = 1; iter <= maxIter; iter++) {
        // Call Gemini
        const response = await ai.models.generateContent({
          model: agent.model || 'gemini-2.5-flash',
          contents: conversation,
          config: { maxOutputTokens: 2048, temperature: 0.3 },
        });

        const raw = response.text || '';
        tokensIn  += Math.ceil((conversation.map(m => m.parts[0].text).join('').length) / 4);
        tokensOut += Math.ceil(raw.length / 4);

        // Parse model output
        const parsed = extractJSON(raw);
        const thought = parsed?.thought || raw.slice(0, 200);
        const action  = parsed?.action  || 'final_answer';
        const actionInput = parsed?.action_input || { answer: raw };

        const step = { iter, thought, action, action_input: actionInput, observation: null, ts: Date.now() };

        // Execute tool
        let observation;
        try {
          observation = await toolExec.run(action, actionInput);
        } catch (e) {
          observation = { error: e.message };
        }
        step.observation = observation;
        steps.push(step);

        // Add to conversation
        conversation.push({ role: 'model', parts: [{ text: raw }] });
        conversation.push({ role: 'user',  parts: [{ text: `OBSERVATION: ${JSON.stringify(observation)}` }] });

        // Check if done
        if (action === 'final_answer' || observation?.done) {
          finalOutput = observation?.result || actionInput?.answer || raw;
          break;
        }

        // Brief pause to avoid hammering the API
        await sleep(300);
      }

      // If no final_answer reached, use last observation as output
      if (!finalOutput) {
        finalOutput = steps.length ? JSON.stringify(steps[steps.length - 1].observation) : 'Không có kết quả';
      }

      // Save result to agent memory
      await pool.query(
        `INSERT INTO aos_agent_memory (agent_id, task_id, exec_id, type, content, importance, tags)
         VALUES ($1,$2,$3,'result',$4,8,$5)`,
        [agentId, taskId, execId, `Task: ${task.title}\nKết quả: ${finalOutput.slice(0, 1000)}`, JSON.stringify(['result', 'task'])]
      );

      // Update execution record
      await pool.query(
        `UPDATE aos_task_executions
         SET status='completed', steps=$1, tokens_in=$2, tokens_out=$3, iterations=$4, output=$5, finished_at=NOW()
         WHERE id=$6`,
        [JSON.stringify(steps), tokensIn, tokensOut, steps.length, finalOutput, execId]
      );

      // Update task
      await pool.query(
        "UPDATE aos_tasks SET status='completed', output=$1, updated_at=NOW() WHERE id=$2",
        [finalOutput, taskId]
      );

      return { execId, output: finalOutput, steps, tokensIn, tokensOut, iterations: steps.length };

    } catch (err) {
      await pool.query(
        "UPDATE aos_task_executions SET status='failed', error=$1, steps=$2, finished_at=NOW() WHERE id=$3",
        [err.message, JSON.stringify(steps), execId]
      );
      await pool.query(
        "UPDATE aos_tasks SET status='failed', error=$1, updated_at=NOW() WHERE id=$2",
        [err.message, taskId]
      );
      throw err;
    } finally {
      await pool.query("UPDATE aos_agents SET status='idle', updated_at=NOW() WHERE id=$1", [agentId]);
    }
  }
}

// ─── REST API ──────────────────────────────────────────────────────────────────
function registerAOSRoutes(app, pool) {
  const runtime = new AgentRuntime(pool);

  // ── Agents ──────────────────────────────────────────────────────────────────

  /** POST /api/aos/agents — Create agent */
  app.post('/api/aos/agents', async (req, res) => {
    const {
      name, role, goal,
      backstory = '',
      model = 'gemini-2.5-flash',
      tool_ids = [],
      collaborates_with = [],
      max_iterations = 8,
    } = req.body;
    if (!name || !role || !goal) return res.status(400).json({ error: 'Thiếu name, role hoặc goal' });
    try {
      const { rows: [agent] } = await pool.query(
        `INSERT INTO aos_agents (name, role, goal, backstory, model, tool_ids, collaborates_with, max_iterations)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [name, role, goal, backstory, model, JSON.stringify(tool_ids), JSON.stringify(collaborates_with), max_iterations]
      );
      res.status(201).json({ success: true, agent });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  /** GET /api/aos/agents — List agents */
  app.get('/api/aos/agents', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT a.*, COUNT(t.id) AS total_tasks,
                COUNT(t.id) FILTER (WHERE t.status='completed') AS completed_tasks
         FROM aos_agents a
         LEFT JOIN aos_tasks t ON t.assigned_agent_id=a.id
         GROUP BY a.id ORDER BY a.created_at DESC`
      );
      res.json({ agents: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  /** GET /api/aos/agents/:id — Single agent detail */
  app.get('/api/aos/agents/:id', async (req, res) => {
    try {
      const { rows: [agent] } = await pool.query('SELECT * FROM aos_agents WHERE id=$1', [req.params.id]);
      if (!agent) return res.status(404).json({ error: 'Agent không tồn tại' });
      const { rows: memory } = await pool.query(
        'SELECT * FROM aos_agent_memory WHERE agent_id=$1 ORDER BY created_at DESC LIMIT 20',
        [req.params.id]
      );
      res.json({ agent, recent_memory: memory });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  /** DELETE /api/aos/agents/:id */
  app.delete('/api/aos/agents/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM aos_agents WHERE id=$1', [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Tools ────────────────────────────────────────────────────────────────────

  /** GET /api/aos/tools — List all tools */
  app.get('/api/aos/tools', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM aos_tools ORDER BY id');
      res.json({ tools: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  /** POST /api/aos/tools — Register custom tool */
  app.post('/api/aos/tools', async (req, res) => {
    const { name, description, type = 'custom', config = {} } = req.body;
    if (!name || !description) return res.status(400).json({ error: 'Thiếu name hoặc description' });
    try {
      const { rows: [tool] } = await pool.query(
        'INSERT INTO aos_tools (name, description, type, config) VALUES ($1,$2,$3,$4) RETURNING *',
        [name, description, type, JSON.stringify(config)]
      );
      res.status(201).json({ success: true, tool });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Tasks ────────────────────────────────────────────────────────────────────

  /** POST /api/aos/tasks — Create task */
  app.post('/api/aos/tasks', async (req, res) => {
    const {
      title, description,
      expected_output = '',
      assigned_agent_id = null,
      priority = 5,
      input = {},
    } = req.body;
    if (!title || !description) return res.status(400).json({ error: 'Thiếu title hoặc description' });
    try {
      const { rows: [task] } = await pool.query(
        `INSERT INTO aos_tasks (title, description, expected_output, assigned_agent_id, priority, input)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [title, description, expected_output, assigned_agent_id, priority, JSON.stringify(input)]
      );
      res.status(201).json({ success: true, task });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  /** GET /api/aos/tasks — List tasks */
  app.get('/api/aos/tasks', async (req, res) => {
    const { agent_id, status } = req.query;
    try {
      let q = `SELECT t.*, a.name AS agent_name FROM aos_tasks t LEFT JOIN aos_agents a ON a.id=t.assigned_agent_id WHERE 1=1`;
      const params = [];
      if (agent_id) { params.push(agent_id); q += ` AND t.assigned_agent_id=$${params.length}`; }
      if (status)   { params.push(status);   q += ` AND t.status=$${params.length}`; }
      q += ' ORDER BY t.priority DESC, t.created_at DESC LIMIT 50';
      const { rows } = await pool.query(q, params);
      res.json({ tasks: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  /** GET /api/aos/tasks/:id — Task detail with executions */
  app.get('/api/aos/tasks/:id', async (req, res) => {
    try {
      const { rows: [task] } = await pool.query(
        'SELECT t.*, a.name AS agent_name FROM aos_tasks t LEFT JOIN aos_agents a ON a.id=t.assigned_agent_id WHERE t.id=$1',
        [req.params.id]
      );
      if (!task) return res.status(404).json({ error: 'Task không tồn tại' });
      const { rows: executions } = await pool.query(
        'SELECT * FROM aos_task_executions WHERE task_id=$1 ORDER BY started_at DESC',
        [req.params.id]
      );
      res.json({ task, executions });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Agent Run ────────────────────────────────────────────────────────────────

  /**
   * POST /api/aos/agent/run
   * Body: { agent_id, task_id, input? }
   * Runs async — returns execution_id immediately.
   */
  app.post('/api/aos/agent/run', async (req, res) => {
    const { agent_id, task_id, input } = req.body;
    if (!agent_id || !task_id) return res.status(400).json({ error: 'Thiếu agent_id hoặc task_id' });

    try {
      // Verify agent & task exist
      const { rows: [agent] } = await pool.query('SELECT id, name, status FROM aos_agents WHERE id=$1', [agent_id]);
      if (!agent) return res.status(404).json({ error: 'Agent không tồn tại' });
      if (agent.status === 'busy') return res.status(409).json({ error: `Agent "${agent.name}" đang bận. Hãy thử lại sau.` });

      const { rows: [task] } = await pool.query('SELECT id FROM aos_tasks WHERE id=$1', [task_id]);
      if (!task) return res.status(404).json({ error: 'Task không tồn tại' });

      // Fire and forget — run in background
      runtime.runAgent(agent_id, task_id, input || null).catch(err => {
        console.error(`[AOS] Agent ${agent_id} task ${task_id} failed:`, err.message);
      });

      res.status(202).json({
        success: true,
        message: `Agent "${agent.name}" đang xử lý task. Dùng GET /api/aos/agent/logs?agent_id=${agent_id} để theo dõi.`,
        agent_id,
        task_id,
      });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  /**
   * POST /api/aos/agent/run/sync
   * Same as above but waits for completion (max 120s).
   */
  app.post('/api/aos/agent/run/sync', async (req, res) => {
    const { agent_id, task_id, input } = req.body;
    if (!agent_id || !task_id) return res.status(400).json({ error: 'Thiếu agent_id hoặc task_id' });

    try {
      const result = await runtime.runAgent(agent_id, task_id, input || null);
      res.json({ success: true, ...result });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Memory ───────────────────────────────────────────────────────────────────

  /**
   * GET /api/aos/agent/memory?agent_id=&type=&limit=
   */
  app.get('/api/aos/agent/memory', async (req, res) => {
    const { agent_id, type, limit = 20 } = req.query;
    if (!agent_id) return res.status(400).json({ error: 'Thiếu agent_id' });
    try {
      let q = 'SELECT m.*, t.title AS task_title FROM aos_agent_memory m LEFT JOIN aos_tasks t ON t.id=m.task_id WHERE m.agent_id=$1';
      const params = [agent_id];
      if (type) { params.push(type); q += ` AND m.type=$${params.length}`; }
      q += ` ORDER BY m.importance DESC, m.created_at DESC LIMIT ${Math.min(Number(limit), 100)}`;
      const { rows } = await pool.query(q, params);
      res.json({ agent_id: Number(agent_id), memory: rows, total: rows.length });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  /** DELETE /api/aos/agent/memory/:agent_id — Clear agent memory */
  app.delete('/api/aos/agent/memory/:agent_id', async (req, res) => {
    try {
      const { rowCount } = await pool.query('DELETE FROM aos_agent_memory WHERE agent_id=$1', [req.params.agent_id]);
      res.json({ success: true, deleted: rowCount });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Logs ─────────────────────────────────────────────────────────────────────

  /**
   * GET /api/aos/agent/logs?agent_id=&task_id=&limit=
   */
  app.get('/api/aos/agent/logs', async (req, res) => {
    const { agent_id, task_id, limit = 10 } = req.query;
    try {
      let q = `
        SELECT e.*, a.name AS agent_name, t.title AS task_title
        FROM aos_task_executions e
        JOIN aos_agents a ON a.id=e.agent_id
        JOIN aos_tasks  t ON t.id=e.task_id
        WHERE 1=1
      `;
      const params = [];
      if (agent_id) { params.push(agent_id); q += ` AND e.agent_id=$${params.length}`; }
      if (task_id)  { params.push(task_id);  q += ` AND e.task_id=$${params.length}`; }
      q += ` ORDER BY e.started_at DESC LIMIT ${Math.min(Number(limit), 50)}`;
      const { rows } = await pool.query(q, params);

      // Parse steps JSON for readability
      const logs = rows.map(r => ({
        ...r,
        steps: typeof r.steps === 'string' ? JSON.parse(r.steps) : r.steps,
      }));
      res.json({ logs, total: logs.length });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── System overview ──────────────────────────────────────────────────────────

  /** GET /api/aos/status — OS-level dashboard */
  app.get('/api/aos/status', async (req, res) => {
    try {
      const [agents, tasks, memory, tools] = await Promise.all([
        pool.query(`SELECT status, COUNT(*) FROM aos_agents GROUP BY status`),
        pool.query(`SELECT status, COUNT(*) FROM aos_tasks  GROUP BY status`),
        pool.query(`SELECT COUNT(*) FROM aos_agent_memory`),
        pool.query(`SELECT COUNT(*) FROM aos_tools`),
      ]);
      res.json({
        agents:  Object.fromEntries(agents.rows.map(r => [r.status, Number(r.count)])),
        tasks:   Object.fromEntries(tasks.rows.map(r => [r.status,  Number(r.count)])),
        memory_entries: Number(memory.rows[0].count),
        tools:   Number(tools.rows[0].count),
      });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  console.log('✅ Agent OS API routes registered');
}

module.exports = { initAOSTables, registerAOSRoutes };
