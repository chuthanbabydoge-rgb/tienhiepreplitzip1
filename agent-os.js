/**
 * ╔══════════════════════════════════════════════════════════════════╗
 *  VƯƠNG ĐẾ AI — Agent Operating System v2
 *  Autonomous multi-agent runtime with Gemini
 * ╠══════════════════════════════════════════════════════════════════╣
 *  Features:
 *    ✅ Auto Task Pickup Loop (5s scheduler)
 *    ✅ Retry Engine with exponential backoff
 *    ✅ Agent Runtime Locking (prevent duplicate execution)
 *    ✅ World Engine Integration (real-time citizen status)
 *    ✅ Agent Registry (skills, capacity, performance metrics)
 *    ✅ DAG Workflow Engine (dependencies, parallel, join nodes)
 * ╚══════════════════════════════════════════════════════════════════╝
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

function sanitizeJSON(str) {
  let result = '', inString = false, escaped = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (escaped) { result += ch; escaped = false; continue; }
    if (ch === '\\' && inString) { result += ch; escaped = true; continue; }
    if (ch === '"') { inString = !inString; result += ch; continue; }
    if (inString && ch === '\n') { result += '\\n'; continue; }
    if (inString && ch === '\r') { result += '\\r'; continue; }
    if (inString && ch === '\t') { result += '\\t'; continue; }
    result += ch;
  }
  return result;
}

function extractJSON(text) {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) {
    const r = jsonTry(m[1].trim()) || jsonTry(sanitizeJSON(m[1].trim()));
    if (r) return r;
  }
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  if (s !== -1 && e !== -1) {
    const chunk = text.slice(s, e + 1);
    const r = jsonTry(chunk) || jsonTry(sanitizeJSON(chunk));
    if (r) return r;
  }
  const actionM = text.match(/"action"\s*:\s*"([^"]+)"/);
  if (!actionM) return null;
  const thoughtM = text.match(/"thought"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/);
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

// ─── Retry backoff ─────────────────────────────────────────────────────────────
// attempt 0→1: 30s, 1→2: 60s, 2→3: 120s, then permanent fail
function backoffMs(attempt) {
  return Math.min(Math.pow(2, attempt) * 30 * 1000, 5 * 60 * 1000);
}

// ─── Database schema ───────────────────────────────────────────────────────────
async function initAOSTables(pool) {
  // ── Core tables ──────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS aos_agents (
      id                SERIAL PRIMARY KEY,
      name              TEXT NOT NULL,
      role              TEXT NOT NULL,
      goal              TEXT NOT NULL,
      backstory         TEXT NOT NULL DEFAULT '',
      model             TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
      tool_ids          JSONB NOT NULL DEFAULT '[]',
      collaborates_with JSONB NOT NULL DEFAULT '[]',
      max_iterations    INT  NOT NULL DEFAULT 8,
      status            TEXT NOT NULL DEFAULT 'idle',
      -- v2: Registry
      skills            JSONB NOT NULL DEFAULT '[]',
      capacity          INT  NOT NULL DEFAULT 2,
      current_load      INT  NOT NULL DEFAULT 0,
      tasks_completed   INT  NOT NULL DEFAULT 0,
      tasks_failed      INT  NOT NULL DEFAULT 0,
      avg_completion_ms FLOAT NOT NULL DEFAULT 0,
      created_at        TIMESTAMPTZ DEFAULT NOW(),
      updated_at        TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS aos_tools (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      type        TEXT NOT NULL DEFAULT 'builtin',
      config      JSONB NOT NULL DEFAULT '{}',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    -- v2: DAG Workflows
    CREATE TABLE IF NOT EXISTS aos_workflows (
      id          SERIAL PRIMARY KEY,
      owner_id    TEXT,
      name        TEXT NOT NULL,
      description TEXT DEFAULT '',
      nodes       JSONB NOT NULL DEFAULT '[]',
      edges       JSONB NOT NULL DEFAULT '[]',
      status      TEXT NOT NULL DEFAULT 'active',
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS aos_workflow_runs (
      id           SERIAL PRIMARY KEY,
      workflow_id  INT REFERENCES aos_workflows(id) ON DELETE CASCADE,
      status       TEXT NOT NULL DEFAULT 'running',
      context      JSONB NOT NULL DEFAULT '{}',
      output       JSONB NOT NULL DEFAULT '{}',
      started_at   TIMESTAMPTZ DEFAULT NOW(),
      finished_at  TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS aos_tasks (
      id                SERIAL PRIMARY KEY,
      title             TEXT NOT NULL,
      description       TEXT NOT NULL,
      expected_output   TEXT NOT NULL DEFAULT '',
      assigned_agent_id INT REFERENCES aos_agents(id) ON DELETE SET NULL,
      parent_task_id    INT REFERENCES aos_tasks(id) ON DELETE SET NULL,
      workflow_run_id   INT REFERENCES aos_workflow_runs(id) ON DELETE SET NULL,
      dag_node_id       TEXT,
      -- v2: Dependency
      depends_on        JSONB NOT NULL DEFAULT '[]',
      status            TEXT NOT NULL DEFAULT 'pending',
      priority          INT  NOT NULL DEFAULT 5,
      input             JSONB NOT NULL DEFAULT '{}',
      output            TEXT,
      error             TEXT,
      -- v2: Retry
      attempts          INT  NOT NULL DEFAULT 0,
      max_attempts      INT  NOT NULL DEFAULT 3,
      next_run_at       TIMESTAMPTZ DEFAULT NOW(),
      -- v2: Locking
      locked_by         INT REFERENCES aos_agents(id) ON DELETE SET NULL,
      locked_at         TIMESTAMPTZ,
      created_at        TIMESTAMPTZ DEFAULT NOW(),
      updated_at        TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_aos_tasks_agent  ON aos_tasks(assigned_agent_id);
    CREATE INDEX IF NOT EXISTS idx_aos_tasks_status ON aos_tasks(status);

    CREATE TABLE IF NOT EXISTS aos_task_executions (
      id          SERIAL PRIMARY KEY,
      task_id     INT NOT NULL REFERENCES aos_tasks(id) ON DELETE CASCADE,
      agent_id    INT NOT NULL REFERENCES aos_agents(id) ON DELETE CASCADE,
      status      TEXT NOT NULL DEFAULT 'running',
      steps       JSONB NOT NULL DEFAULT '[]',
      tokens_in   INT  NOT NULL DEFAULT 0,
      tokens_out  INT  NOT NULL DEFAULT 0,
      iterations  INT  NOT NULL DEFAULT 0,
      input       TEXT,
      output      TEXT,
      error       TEXT,
      started_at  TIMESTAMPTZ DEFAULT NOW(),
      finished_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_aos_exec_task  ON aos_task_executions(task_id);
    CREATE INDEX IF NOT EXISTS idx_aos_exec_agent ON aos_task_executions(agent_id);

    CREATE TABLE IF NOT EXISTS aos_agent_memory (
      id         SERIAL PRIMARY KEY,
      agent_id   INT NOT NULL REFERENCES aos_agents(id) ON DELETE CASCADE,
      task_id    INT REFERENCES aos_tasks(id) ON DELETE SET NULL,
      exec_id    INT REFERENCES aos_task_executions(id) ON DELETE SET NULL,
      type       TEXT NOT NULL DEFAULT 'result',
      content    TEXT NOT NULL,
      importance INT  NOT NULL DEFAULT 5,
      tags       JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_aos_mem_agent ON aos_agent_memory(agent_id);
    CREATE INDEX IF NOT EXISTS idx_aos_mem_type  ON aos_agent_memory(type);

    -- v2: Scheduler audit log
    CREATE TABLE IF NOT EXISTS aos_scheduler_log (
      id         SERIAL PRIMARY KEY,
      event      TEXT NOT NULL,
      agent_id   INT,
      task_id    INT,
      detail     TEXT,
      ts         TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // ── Migrations (safe ADD COLUMN IF NOT EXISTS) ────────────────────────────
  const migrations = [
    `ALTER TABLE aos_agents ADD COLUMN IF NOT EXISTS skills            JSONB NOT NULL DEFAULT '[]'`,
    `ALTER TABLE aos_agents ADD COLUMN IF NOT EXISTS capacity          INT   NOT NULL DEFAULT 2`,
    `ALTER TABLE aos_agents ADD COLUMN IF NOT EXISTS current_load      INT   NOT NULL DEFAULT 0`,
    `ALTER TABLE aos_agents ADD COLUMN IF NOT EXISTS tasks_completed   INT   NOT NULL DEFAULT 0`,
    `ALTER TABLE aos_agents ADD COLUMN IF NOT EXISTS tasks_failed      INT   NOT NULL DEFAULT 0`,
    `ALTER TABLE aos_agents ADD COLUMN IF NOT EXISTS avg_completion_ms FLOAT NOT NULL DEFAULT 0`,
    `ALTER TABLE aos_tasks  ADD COLUMN IF NOT EXISTS depends_on        JSONB NOT NULL DEFAULT '[]'`,
    `ALTER TABLE aos_tasks  ADD COLUMN IF NOT EXISTS attempts          INT   NOT NULL DEFAULT 0`,
    `ALTER TABLE aos_tasks  ADD COLUMN IF NOT EXISTS max_attempts      INT   NOT NULL DEFAULT 3`,
    `ALTER TABLE aos_tasks  ADD COLUMN IF NOT EXISTS next_run_at       TIMESTAMPTZ DEFAULT NOW()`,
    `ALTER TABLE aos_tasks  ADD COLUMN IF NOT EXISTS locked_by         INT REFERENCES aos_agents(id) ON DELETE SET NULL`,
    `ALTER TABLE aos_tasks  ADD COLUMN IF NOT EXISTS locked_at         TIMESTAMPTZ`,
    `ALTER TABLE aos_tasks  ADD COLUMN IF NOT EXISTS workflow_run_id   INT REFERENCES aos_workflow_runs(id) ON DELETE SET NULL`,
    `ALTER TABLE aos_tasks  ADD COLUMN IF NOT EXISTS dag_node_id       TEXT`,
  ];
  for (const sql of migrations) {
    await pool.query(sql).catch(() => {});
  }

  // ── v2 indexes (created after column migrations) ──────────────────────────
  const v2indexes = [
    `CREATE INDEX IF NOT EXISTS idx_aos_tasks_next_run ON aos_tasks(next_run_at)`,
    `CREATE INDEX IF NOT EXISTS idx_aos_tasks_locked   ON aos_tasks(locked_by)`,
  ];
  for (const sql of v2indexes) {
    await pool.query(sql).catch(() => {});
  }

  // ── Built-in tools ────────────────────────────────────────────────────────
  await pool.query(`
    INSERT INTO aos_tools (name, description, type, config) VALUES
      ('memory_recall', 'Tìm kiếm trong bộ nhớ dài hạn. Input: {"query":"..."}',                              'builtin', '{}'),
      ('memory_save',   'Lưu thông tin vào bộ nhớ. Input: {"content":"...","importance":1-10}',               'builtin', '{}'),
      ('calculate',     'Tính biểu thức toán học. Input: {"expression":"2+2*10"}',                            'builtin', '{}'),
      ('summarize',     'Tóm tắt văn bản bằng Gemini. Input: {"text":"..."}',                                 'builtin', '{}'),
      ('web_search',    'Tìm kiếm thông tin. Input: {"query":"..."}',                                         'builtin', '{}'),
      ('delegate',      'Uỷ quyền sub-task cho agent. Input: {"agent_id":N,"title":"...","description":"..."}','builtin', '{}'),
      ('ask_user',      'Gửi câu hỏi làm rõ. Input: {"question":"..."}',                                      'builtin', '{}'),
      ('final_answer',  'Kết thúc và trả lời. Input: {"answer":"..."}',                                       'builtin', '{}')
    ON CONFLICT (name) DO NOTHING;
  `);

  console.log('✅ Agent OS v2 tables ready');
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
      case 'memory_recall': return this._memoryRecall(args);
      case 'memory_save':   return this._memorySave(args);
      case 'calculate':     return this._calculate(args);
      case 'summarize':     return this._summarize(args);
      case 'web_search':    return this._webSearch(args);
      case 'delegate':      return this._delegate(args);
      case 'ask_user':      return { result: `[Câu hỏi ghi lại]: ${args.question}` };
      case 'final_answer':  return { done: true, result: args.answer || '' };
      default:              return { error: `Công cụ '${toolName}' không tồn tại` };
    }
  }

  async _memoryRecall({ query = '' }) {
    const { rows } = await this.pool.query(
      `SELECT content, type, importance FROM aos_agent_memory
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
      const result = Function(`"use strict"; return (${expression.replace(/[^0-9+\-*/().% ]/g, '')})`)();
      return { result: String(result) };
    } catch (e) { return { error: `Không thể tính: ${e.message}` }; }
  }

  async _summarize({ text = '' }) {
    try {
      const ai = getAI();
      const r = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: `Tóm tắt ngắn gọn (3-5 câu):\n\n${text.slice(0, 8000)}` }] }],
        config: { maxOutputTokens: 512 },
      });
      return { result: r.text || '' };
    } catch (e) { return { error: e.message }; }
  }

  async _webSearch({ query = '' }) {
    return {
      result: `[Web Search] Truy vấn: "${query}"\n` +
              `URL: https://www.google.com/search?q=${encodeURIComponent(query)}\n` +
              `(API tìm kiếm thực sẽ tích hợp trong v3)`,
    };
  }

  async _delegate({ agent_id, title = '', description = '', priority = 5 }) {
    try {
      const { rows: [agent] } = await this.pool.query(
        'SELECT id,name FROM aos_agents WHERE id=$1', [agent_id]
      );
      if (!agent) return { error: `Agent ID ${agent_id} không tồn tại` };

      // Get parent task info for context
      const { rows: [parentTask] } = await this.pool.query(
        'SELECT workflow_run_id, dag_node_id FROM aos_tasks WHERE id=$1', [this.taskId]
      );

      const { rows: [task] } = await this.pool.query(
        `INSERT INTO aos_tasks
           (title, description, assigned_agent_id, parent_task_id, status, priority, workflow_run_id, next_run_at)
         VALUES ($1,$2,$3,$4,'pending',$5,$6,NOW())
         RETURNING id`,
        [title, description, agent_id, this.taskId, priority,
         parentTask?.workflow_run_id || null]
      );

      await this.pool.query(
        `INSERT INTO aos_scheduler_log (event, agent_id, task_id, detail)
         VALUES ('delegate',$1,$2,$3)`,
        [this.agentId, task.id, `Agent #${this.agentId} delegated "${title}" → Agent #${agent_id} (${agent.name})`]
      );

      return {
        result: `✅ Delegated task #${task.id} "${title}" → ${agent.name}. Scheduler will auto-pick this up within 5s.`,
        delegated_task_id: task.id,
      };
    } catch (e) { return { error: e.message }; }
  }
}

// ─── Agent Registry ────────────────────────────────────────────────────────────
class AgentRegistry {
  constructor(pool) { this.pool = pool; }

  /** Find the best available agent for a task based on skills + capacity */
  async findBestAgent(task) {
    const pool = this.pool;
    const requiredSkills = task.required_skills || [];

    // Get agents with available capacity
    const { rows: agents } = await pool.query(`
      SELECT * FROM aos_agents
      WHERE status != 'offline'
        AND current_load < capacity
      ORDER BY
        -- Prefer agents with matching skills
        (SELECT COUNT(*) FROM jsonb_array_elements_text(skills) s
         WHERE s = ANY($1)) DESC,
        -- Then by performance (lower fail rate)
        CASE WHEN (tasks_completed + tasks_failed) = 0 THEN 0
             ELSE tasks_failed::float / (tasks_completed + tasks_failed) END ASC,
        -- Then by current load (lighter load preferred)
        current_load ASC
    `, [requiredSkills.length > 0 ? requiredSkills : ['*']]);

    return agents[0] || null;
  }

  /** Update agent performance metrics after a task */
  async recordTaskResult(agentId, success, durationMs) {
    const col = success ? 'tasks_completed' : 'tasks_failed';
    await this.pool.query(`
      UPDATE aos_agents
      SET ${col} = ${col} + 1,
          current_load = GREATEST(0, current_load - 1),
          avg_completion_ms = CASE
            WHEN tasks_completed = 0 THEN $2
            ELSE (avg_completion_ms * tasks_completed + $2) / (tasks_completed + 1)
          END,
          status = 'idle',
          updated_at = NOW()
      WHERE id = $1
    `, [agentId, durationMs]);
  }
}

// ─── DAG Engine ────────────────────────────────────────────────────────────────
class DAGEngine {
  constructor(pool) { this.pool = pool; }

  /** Check if a task's dependencies are all completed */
  async areDepsReady(taskId) {
    const { rows: [task] } = await this.pool.query(
      'SELECT depends_on FROM aos_tasks WHERE id=$1', [taskId]
    );
    if (!task) return false;
    const deps = Array.isArray(task.depends_on) ? task.depends_on : [];
    if (deps.length === 0) return true;

    const { rows } = await this.pool.query(
      `SELECT id FROM aos_tasks WHERE id = ANY($1) AND status != 'completed'`,
      [deps]
    );
    return rows.length === 0;
  }

  /** After a task completes, unlock any tasks that were waiting on it */
  async onTaskComplete(taskId) {
    const pool = this.pool;
    // Find all pending tasks that depend on this task
    const { rows: dependents } = await pool.query(`
      SELECT id FROM aos_tasks
      WHERE status = 'pending_deps'
        AND depends_on @> $1
    `, [JSON.stringify([taskId])]);

    for (const dep of dependents) {
      const ready = await this.areDepsReady(dep.id);
      if (ready) {
        await pool.query(
          `UPDATE aos_tasks SET status='pending', next_run_at=NOW(), updated_at=NOW() WHERE id=$1`,
          [dep.id]
        );
        await pool.query(
          `INSERT INTO aos_scheduler_log (event, task_id, detail) VALUES ('dep_ready',$1,$2)`,
          [dep.id, `Dependencies resolved for task #${dep.id}`]
        );
      }
    }

    // Check if workflow run is complete
    await this._checkWorkflowComplete(taskId);
  }

  async _checkWorkflowComplete(taskId) {
    const { rows: [task] } = await this.pool.query(
      'SELECT workflow_run_id FROM aos_tasks WHERE id=$1', [taskId]
    );
    if (!task?.workflow_run_id) return;

    const { rows } = await this.pool.query(
      `SELECT id FROM aos_tasks
       WHERE workflow_run_id=$1 AND status NOT IN ('completed','failed')`,
      [task.workflow_run_id]
    );

    if (rows.length === 0) {
      // All tasks done
      await this.pool.query(
        `UPDATE aos_workflow_runs SET status='completed', finished_at=NOW() WHERE id=$1`,
        [task.workflow_run_id]
      );
      await this.pool.query(
        `INSERT INTO aos_scheduler_log (event, detail) VALUES ('workflow_complete',$1)`,
        [`Workflow run #${task.workflow_run_id} completed`]
      );
    }
  }

  /** Create and run a DAG workflow from a node/edge spec */
  async runWorkflow(pool, workflowId, inputContext = {}) {
    const { rows: [wf] } = await pool.query(
      'SELECT * FROM aos_workflows WHERE id=$1', [workflowId]
    );
    if (!wf) throw new Error('Workflow not found');

    // Create run record
    const { rows: [run] } = await pool.query(
      `INSERT INTO aos_workflow_runs (workflow_id, status, context) VALUES ($1,'running',$2) RETURNING id`,
      [workflowId, JSON.stringify(inputContext)]
    );

    const nodes = wf.nodes || [];
    const edges = wf.edges || [];

    // Build adjacency: for each node, which nodes must complete first
    const incomingEdges = {};
    nodes.forEach(n => { incomingEdges[n.id] = []; });
    edges.forEach(e => {
      if (!incomingEdges[e.target]) incomingEdges[e.target] = [];
      incomingEdges[e.target].push(e.source);
    });

    // Create tasks for all nodes
    const nodeTaskMap = {};
    for (const node of nodes) {
      const { rows: [task] } = await pool.query(
        `INSERT INTO aos_tasks
           (title, description, expected_output, assigned_agent_id, workflow_run_id,
            dag_node_id, status, priority, next_run_at, depends_on)
         VALUES ($1,$2,$3,$4,$5,$6,'pending_deps',$7,NOW(),'[]')
         RETURNING id`,
        [
          node.title || node.id,
          node.description || '',
          node.expected_output || '',
          node.agent_id || null,
          run.id,
          node.id,
          node.priority || 5,
        ]
      );
      nodeTaskMap[node.id] = task.id;
    }

    // Set depends_on for each task using actual task IDs
    for (const node of nodes) {
      const depTaskIds = (incomingEdges[node.id] || []).map(nid => nodeTaskMap[nid]).filter(Boolean);
      const taskId = nodeTaskMap[node.id];
      if (depTaskIds.length > 0) {
        await pool.query(
          `UPDATE aos_tasks SET depends_on=$1 WHERE id=$2`,
          [JSON.stringify(depTaskIds), taskId]
        );
      } else {
        // No deps: ready to run immediately
        await pool.query(
          `UPDATE aos_tasks SET status='pending' WHERE id=$1`, [taskId]
        );
      }
    }

    return { run_id: run.id, node_task_map: nodeTaskMap };
  }
}

// ─── Agent Runtime ─────────────────────────────────────────────────────────────
class AgentRuntime {
  constructor(pool, worldHook = null) {
    this.pool         = pool;
    this.worldHook    = worldHook; // { onAgentStatusChange(agentId, status) }
    this.economyHook  = null;      // { onTaskComplete(taskId, agentId, output) }
    this.orgHook      = null;      // { onTaskComplete(taskId, agentId, resourceValue) }
    this.registry     = new AgentRegistry(pool);
    this.dag          = new DAGEngine(pool);
    this._running     = new Set(); // track in-process task IDs
  }

  setWorldHook(hook)    { this.worldHook   = hook; }
  setEconomyHook(hook)  { this.economyHook = hook; }
  setOrgHook(hook)      { this.orgHook     = hook; }

  async _notifyWorld(agentId, status) {
    if (this.worldHook?.onAgentStatusChange) {
      try { await this.worldHook.onAgentStatusChange(agentId, status); } catch {}
    }
  }

  buildSystemPrompt(agent, tools) {
    const toolList = tools.map(t => `  • ${t.name}: ${t.description}`).join('\n');
    return `Bạn là ${agent.name}.
VAI TRÒ: ${agent.role}
MỤC TIÊU: ${agent.goal}
BỐI CẢNH: ${agent.backstory}

Bạn là agent tự trị, hoạt động theo vòng lặp Reason→Act→Observe.
Khi dùng "delegate", agent khác sẽ TỰ ĐỘNG chạy task được uỷ quyền — không cần trigger thủ công.

Mỗi lượt trả lời đúng JSON:
{
  "thought": "Suy nghĩ về tình huống và bước tiếp",
  "action": "tên_công_cụ",
  "action_input": { ... tham số ... }
}

Kết thúc bằng:
{
  "thought": "Đã hoàn thành",
  "action": "final_answer",
  "action_input": { "answer": "Câu trả lời đầy đủ..." }
}

CÔNG CỤ:
${toolList}

QUY TẮC:
- Chỉ dùng một công cụ mỗi lượt
- Tối đa ${agent.max_iterations} vòng lặp
- Trả lời bằng tiếng Việt`;
  }

  /** Core execution — runs one agent on one task */
  async runAgent(agentId, taskId) {
    const pool = this.pool;
    const startMs = Date.now();

    // Load agent + task
    const [agentR, taskR] = await Promise.all([
      pool.query('SELECT * FROM aos_agents WHERE id=$1', [agentId]),
      pool.query('SELECT * FROM aos_tasks WHERE id=$1', [taskId]),
    ]);
    const agent = agentR.rows[0];
    const task  = taskR.rows[0];
    if (!agent) throw new Error(`Agent #${agentId} không tồn tại`);
    if (!task)  throw new Error(`Task #${taskId} không tồn tại`);

    // Load tools
    const toolIds = Array.isArray(agent.tool_ids) ? agent.tool_ids : [];
    const { rows: tools } = toolIds.length > 0
      ? await pool.query('SELECT * FROM aos_tools WHERE id = ANY($1)', [toolIds])
      : await pool.query("SELECT * FROM aos_tools WHERE type='builtin'");

    // Load agent memory
    const { rows: recentMemory } = await pool.query(
      `SELECT content, type FROM aos_agent_memory
       WHERE agent_id=$1 ORDER BY importance DESC, created_at DESC LIMIT 5`,
      [agentId]
    );
    const memoryContext = recentMemory.length
      ? '\n\nBỘ NHỚ GẦN ĐÂY:\n' + recentMemory.map(m => `[${m.type}] ${m.content}`).join('\n')
      : '';

    // Create execution record
    const taskInput = task.input?.input || task.description;
    const { rows: [exec] } = await pool.query(
      `INSERT INTO aos_task_executions (task_id, agent_id, status, input)
       VALUES ($1,$2,'running',$3) RETURNING id`,
      [taskId, agentId, taskInput]
    );
    const execId = exec.id;

    // Mark agent busy + increase load
    await pool.query(
      `UPDATE aos_agents SET status='busy', current_load=current_load+1, updated_at=NOW() WHERE id=$1`,
      [agentId]
    );
    await this._notifyWorld(agentId, 'running');

    const toolExec = new ToolExecutor(pool, agentId, taskId, execId);
    const ai = getAI();
    const conversation = [
      { role: 'user',  parts: [{ text: this.buildSystemPrompt(agent, tools) + memoryContext }] },
      { role: 'model', parts: [{ text: '{"thought":"Bắt đầu nhiệm vụ.","action":"memory_recall","action_input":{"query":"thông tin liên quan"}}' }] },
      { role: 'user',  parts: [{ text: `NHIỆM VỤ: ${task.title}\nMÔ TẢ: ${task.description}\nĐẦU VÀO: ${taskInput}\nĐẦU RA KỲ VỌNG: ${task.expected_output || 'Kết quả chất lượng cao'}` }] },
    ];

    const steps = [];
    let tokensIn = 0, tokensOut = 0, finalOutput = null;
    const maxIter = agent.max_iterations || 8;

    try {
      for (let iter = 1; iter <= maxIter; iter++) {
        const response = await ai.models.generateContent({
          model: agent.model || 'gemini-2.5-flash',
          contents: conversation,
          config: { maxOutputTokens: 2048, temperature: 0.3 },
        });

        const raw = response.text || '';
        tokensIn  += Math.ceil(conversation.map(m => m.parts[0].text).join('').length / 4);
        tokensOut += Math.ceil(raw.length / 4);

        const parsed = extractJSON(raw);
        const thought     = parsed?.thought || raw.slice(0, 200);
        const action      = parsed?.action  || 'final_answer';
        const actionInput = parsed?.action_input || { answer: raw };

        const step = { iter, thought, action, action_input: actionInput, observation: null, ts: Date.now() };

        let observation;
        try { observation = await toolExec.run(action, actionInput); }
        catch (e) { observation = { error: e.message }; }

        step.observation = observation;
        steps.push(step);

        conversation.push({ role: 'model', parts: [{ text: raw }] });
        conversation.push({ role: 'user',  parts: [{ text: `OBSERVATION: ${JSON.stringify(observation)}` }] });

        // Persist steps incrementally
        await pool.query(
          'UPDATE aos_task_executions SET steps=$1, iterations=$2 WHERE id=$3',
          [JSON.stringify(steps), steps.length, execId]
        );

        if (action === 'final_answer' || observation?.done) {
          finalOutput = observation?.result || actionInput?.answer || raw;
          break;
        }

        // Brief pause — avoid API hammering
        await sleep(300);
      }

      if (!finalOutput) {
        finalOutput = steps.length ? JSON.stringify(steps[steps.length - 1].observation) : 'Không có kết quả';
      }

      const durationMs = Date.now() - startMs;

      // Save to memory
      await pool.query(
        `INSERT INTO aos_agent_memory (agent_id, task_id, exec_id, type, content, importance, tags)
         VALUES ($1,$2,$3,'result',$4,8,$5)`,
        [agentId, taskId, execId,
         `Task: ${task.title}\nKết quả: ${finalOutput.slice(0, 1000)}`,
         JSON.stringify(['result', 'task'])]
      );

      // Update execution
      await pool.query(
        `UPDATE aos_task_executions
         SET status='completed', steps=$1, tokens_in=$2, tokens_out=$3,
             iterations=$4, output=$5, finished_at=NOW()
         WHERE id=$6`,
        [JSON.stringify(steps), tokensIn, tokensOut, steps.length, finalOutput, execId]
      );

      // Update task — clear lock
      await pool.query(
        `UPDATE aos_tasks
         SET status='completed', output=$1, locked_by=NULL, locked_at=NULL, updated_at=NOW()
         WHERE id=$2`,
        [finalOutput, taskId]
      );

      // Update agent metrics + reduce load
      await this.registry.recordTaskResult(agentId, true, durationMs);
      await this._notifyWorld(agentId, 'completed');

      // DAG: unlock downstream tasks
      await this.dag.onTaskComplete(taskId);

      // Economy: generate resource from completed task output
      if (this.economyHook?.onTaskComplete) {
        this.economyHook.onTaskComplete(taskId, agentId, finalOutput).catch(err => {
          console.error('[Economy hook] error:', err.message);
        });
      }

      // Organization: track expense + goal progress + dept budget
      if (this.orgHook?.onTaskComplete) {
        const resourceValue = finalOutput ? Math.max(25, Math.min(250, finalOutput.length * 0.06)) : 30;
        this.orgHook.onTaskComplete(taskId, agentId, resourceValue).catch(err => {
          console.error('[Org hook] error:', err.message);
        });
      }

      this._running.delete(taskId);
      return { execId, output: finalOutput, steps, tokensIn, tokensOut, iterations: steps.length };

    } catch (err) {
      const durationMs = Date.now() - startMs;

      // Load current attempt count
      const { rows: [t] } = await pool.query('SELECT attempts, max_attempts FROM aos_tasks WHERE id=$1', [taskId]);
      const attempts    = (t?.attempts || 1);
      const maxAttempts = t?.max_attempts || 3;

      await pool.query(
        `UPDATE aos_task_executions SET status='failed', error=$1, steps=$2, finished_at=NOW() WHERE id=$3`,
        [err.message, JSON.stringify(steps), execId]
      );

      if (attempts < maxAttempts) {
        // Schedule retry with exponential backoff
        const delay = backoffMs(attempts);
        const nextRun = new Date(Date.now() + delay).toISOString();
        await pool.query(
          `UPDATE aos_tasks
           SET status='pending', error=$1, locked_by=NULL, locked_at=NULL,
               next_run_at=$2, updated_at=NOW()
           WHERE id=$3`,
          [err.message, nextRun, taskId]
        );
        await pool.query(
          `INSERT INTO aos_scheduler_log (event, agent_id, task_id, detail)
           VALUES ('retry_scheduled',$1,$2,$3)`,
          [agentId, taskId, `Attempt ${attempts}/${maxAttempts}, retry in ${Math.round(delay/1000)}s`]
        );
      } else {
        // Permanent failure
        await pool.query(
          `UPDATE aos_tasks
           SET status='failed', error=$1, locked_by=NULL, locked_at=NULL, updated_at=NOW()
           WHERE id=$2`,
          [err.message, taskId]
        );
      }

      await this.registry.recordTaskResult(agentId, false, durationMs);
      await this._notifyWorld(agentId, 'failed');
      this._running.delete(taskId);
      throw err;
    }
  }
}

// ─── Autonomous Scheduler ──────────────────────────────────────────────────────
let _scheduler = null;

function startScheduler(pool, runtime, opts = {}) {
  if (_scheduler) return _scheduler;

  const interval = opts.interval || 5000;
  const registry = new AgentRegistry(pool);

  async function tick() {
    try {
      // Find all agents with available capacity
      const { rows: agents } = await pool.query(`
        SELECT * FROM aos_agents
        WHERE status != 'offline'
          AND current_load < capacity
        ORDER BY current_load ASC
        LIMIT 20
      `);

      for (const agent of agents) {
        // Atomic lock: claim one pending task for this agent
        // Uses subquery so only one scheduler instance can claim each task
        const { rows: [task] } = await pool.query(`
          UPDATE aos_tasks SET
            locked_by  = $1,
            locked_at  = NOW(),
            status     = 'running',
            attempts   = attempts + 1,
            updated_at = NOW()
          WHERE id = (
            SELECT t.id FROM aos_tasks t
            WHERE t.status = 'pending'
              AND t.locked_by IS NULL
              AND t.next_run_at <= NOW()
              AND (t.assigned_agent_id = $1 OR t.assigned_agent_id IS NULL)
              AND NOT EXISTS (
                SELECT 1 FROM aos_tasks dep
                WHERE dep.id = ANY(
                  ARRAY(SELECT jsonb_array_elements_text(t.depends_on)::int)
                )
                AND dep.status != 'completed'
              )
            ORDER BY t.priority DESC, t.created_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
          )
          RETURNING *
        `, [agent.id]);

        if (task) {
          // Determine which agent runs this task
          let runnerId = agent.id;

          // If task has no assigned agent, use registry to find best
          if (!task.assigned_agent_id) {
            const best = await registry.findBestAgent(task);
            if (best) runnerId = best.id;
          }

          // Mark load increase
          await pool.query(
            `UPDATE aos_agents SET current_load=current_load+1 WHERE id=$1 AND current_load < capacity`,
            [runnerId]
          );

          await pool.query(
            `INSERT INTO aos_scheduler_log (event, agent_id, task_id, detail)
             VALUES ('picked',$1,$2,$3)`,
            [runnerId, task.id, `Scheduler auto-picked task "${task.title}" → Agent #${runnerId}`]
          );

          // Run async — fire and forget (scheduler continues)
          runtime.runAgent(runnerId, task.id).catch(async (err) => {
            // Error already handled in runAgent — just log
            await pool.query(
              `INSERT INTO aos_scheduler_log (event, agent_id, task_id, detail)
               VALUES ('error',$1,$2,$3)`,
              [runnerId, task.id, err.message?.slice(0, 500)]
            ).catch(() => {});
          });
        }
      }

      // Stale lock cleanup: unlock tasks locked > 10 min (crashed runner)
      await pool.query(`
        UPDATE aos_tasks
        SET locked_by=NULL, locked_at=NULL, status='pending', next_run_at=NOW()
        WHERE status='running'
          AND locked_at < NOW() - INTERVAL '10 minutes'
      `);

    } catch (err) {
      // Scheduler must never crash
      console.error('[Scheduler] tick error:', err.message);
    }
  }

  _scheduler = setInterval(tick, interval);
  console.log(`✅ AOS v2 Autonomous Scheduler started (every ${interval}ms)`);
  return _scheduler;
}

function stopScheduler() {
  if (_scheduler) { clearInterval(_scheduler); _scheduler = null; }
}

// ─── REST API ──────────────────────────────────────────────────────────────────
function registerAOSRoutes(app, pool) {
  const runtime = new AgentRuntime(pool);

  // ── Agents ──────────────────────────────────────────────────────────────────

  app.post('/api/aos/agents', async (req, res) => {
    const { name, role, goal, backstory='', model='gemini-2.5-flash',
            tool_ids=[], collaborates_with=[], max_iterations=8,
            skills=[], capacity=2 } = req.body;
    if (!name || !role || !goal) return res.status(400).json({ error: 'Thiếu name, role, goal' });
    try {
      const { rows: [agent] } = await pool.query(
        `INSERT INTO aos_agents
           (name,role,goal,backstory,model,tool_ids,collaborates_with,max_iterations,skills,capacity)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [name, role, goal, backstory, model, JSON.stringify(tool_ids),
         JSON.stringify(collaborates_with), max_iterations,
         JSON.stringify(skills), capacity]
      );
      res.status(201).json({ success: true, agent });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/aos/agents', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT a.*,
          COUNT(t.id)::int AS total_tasks,
          COUNT(t.id) FILTER (WHERE t.status='completed')::int AS completed_tasks,
          COUNT(t.id) FILTER (WHERE t.status='failed')::int    AS failed_tasks,
          COUNT(t.id) FILTER (WHERE t.status='running')::int   AS running_tasks
        FROM aos_agents a
        LEFT JOIN aos_tasks t ON t.assigned_agent_id=a.id
        GROUP BY a.id ORDER BY a.created_at DESC
      `);
      res.json({ agents: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/aos/agents/:id', async (req, res) => {
    try {
      const { rows: [agent] } = await pool.query('SELECT * FROM aos_agents WHERE id=$1', [req.params.id]);
      if (!agent) return res.status(404).json({ error: 'Không tồn tại' });
      const { rows: memory } = await pool.query(
        'SELECT * FROM aos_agent_memory WHERE agent_id=$1 ORDER BY created_at DESC LIMIT 20',
        [req.params.id]
      );
      const { rows: recentTasks } = await pool.query(
        `SELECT id, title, status, created_at FROM aos_tasks
         WHERE assigned_agent_id=$1 ORDER BY created_at DESC LIMIT 10`,
        [req.params.id]
      );
      res.json({ agent, recent_memory: memory, recent_tasks: recentTasks });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.patch('/api/aos/agents/:id', async (req, res) => {
    try {
      const fields = ['name','role','goal','backstory','model','max_iterations','skills','capacity'];
      const updates = [], values = [];
      let i = 1;
      for (const f of fields) {
        if (req.body[f] !== undefined) {
          updates.push(`${f}=$${i++}`);
          values.push(typeof req.body[f] === 'object' ? JSON.stringify(req.body[f]) : req.body[f]);
        }
      }
      if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
      values.push(req.params.id);
      const { rows: [agent] } = await pool.query(
        `UPDATE aos_agents SET ${updates.join(',')}, updated_at=NOW() WHERE id=$${i} RETURNING *`,
        values
      );
      res.json({ success: true, agent });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/aos/agents/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM aos_agents WHERE id=$1', [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Tools ────────────────────────────────────────────────────────────────────

  app.get('/api/aos/tools', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM aos_tools ORDER BY id');
      res.json({ tools: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/aos/tools', async (req, res) => {
    const { name, description, type='custom', config={} } = req.body;
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

  app.post('/api/aos/tasks', async (req, res) => {
    const {
      title, description, expected_output='', assigned_agent_id=null,
      parent_task_id=null, priority=5, input={},
      max_attempts=3, depends_on=[],
    } = req.body;
    if (!title || !description) return res.status(400).json({ error: 'Thiếu title hoặc description' });
    try {
      // If depends_on has unfinished tasks, start as pending_deps
      let initialStatus = 'pending';
      if (depends_on.length > 0) {
        const { rows } = await pool.query(
          `SELECT id FROM aos_tasks WHERE id=ANY($1) AND status!='completed'`, [depends_on]
        );
        if (rows.length > 0) initialStatus = 'pending_deps';
      }

      const { rows: [task] } = await pool.query(
        `INSERT INTO aos_tasks
           (title, description, expected_output, assigned_agent_id, parent_task_id,
            priority, input, max_attempts, depends_on, status, next_run_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()) RETURNING *`,
        [title, description, expected_output, assigned_agent_id, parent_task_id,
         priority, JSON.stringify(input), max_attempts, JSON.stringify(depends_on), initialStatus]
      );
      res.status(201).json({ success: true, task });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/aos/tasks', async (req, res) => {
    try {
      const { status, agent_id, limit=50 } = req.query;
      let q = `
        SELECT t.*, a.name AS agent_name,
          (SELECT COUNT(*)::int FROM aos_task_executions e WHERE e.task_id=t.id) AS exec_count
        FROM aos_tasks t
        LEFT JOIN aos_agents a ON a.id=t.assigned_agent_id
        WHERE 1=1
      `;
      const params = [];
      if (status)   { q += ` AND t.status=$${params.push(status)}`; }
      if (agent_id) { q += ` AND t.assigned_agent_id=$${params.push(parseInt(agent_id))}`; }
      q += ` ORDER BY t.created_at DESC LIMIT $${params.push(parseInt(limit))}`;
      const { rows } = await pool.query(q, params);
      res.json({ tasks: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/aos/tasks/:id', async (req, res) => {
    try {
      const { rows: [task] } = await pool.query(
        `SELECT t.*, a.name AS agent_name FROM aos_tasks t
         LEFT JOIN aos_agents a ON a.id=t.assigned_agent_id WHERE t.id=$1`,
        [req.params.id]
      );
      if (!task) return res.status(404).json({ error: 'Không tồn tại' });
      const { rows: executions } = await pool.query(
        'SELECT * FROM aos_task_executions WHERE task_id=$1 ORDER BY started_at DESC',
        [req.params.id]
      );
      res.json({ task, executions });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Manual trigger (still available alongside auto-scheduler)
  app.post('/api/aos/tasks/:id/run', async (req, res) => {
    try {
      const { rows: [task] } = await pool.query('SELECT * FROM aos_tasks WHERE id=$1', [req.params.id]);
      if (!task) return res.status(404).json({ error: 'Task không tồn tại' });
      const agentId = req.body.agent_id || task.assigned_agent_id;
      if (!agentId) return res.status(400).json({ error: 'Chưa có agent được chỉ định' });

      // Claim the task
      await pool.query(
        `UPDATE aos_tasks SET status='running', locked_by=$1, locked_at=NOW(), attempts=attempts+1 WHERE id=$2`,
        [agentId, task.id]
      );

      // Run async
      runtime.runAgent(agentId, task.id)
        .catch(err => console.error(`[AOS] Manual run task #${task.id} failed:`, err.message));

      res.json({ success: true, message: 'Task started. Poll /api/aos/tasks/:id for status.' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/aos/tasks/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM aos_tasks WHERE id=$1', [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Executions ───────────────────────────────────────────────────────────────

  app.get('/api/aos/executions', async (req, res) => {
    try {
      const { agent_id, task_id, limit=20 } = req.query;
      let q = `
        SELECT e.*, a.name AS agent_name, t.title AS task_title
        FROM aos_task_executions e
        LEFT JOIN aos_agents a ON a.id=e.agent_id
        LEFT JOIN aos_tasks  t ON t.id=e.task_id WHERE 1=1
      `;
      const params = [];
      if (agent_id) q += ` AND e.agent_id=$${params.push(parseInt(agent_id))}`;
      if (task_id)  q += ` AND e.task_id=$${params.push(parseInt(task_id))}`;
      q += ` ORDER BY e.started_at DESC LIMIT $${params.push(parseInt(limit))}`;
      const { rows } = await pool.query(q, params);
      res.json({ executions: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/aos/executions/:id', async (req, res) => {
    try {
      const { rows: [exec] } = await pool.query(
        `SELECT e.*, a.name AS agent_name, t.title AS task_title
         FROM aos_task_executions e
         LEFT JOIN aos_agents a ON a.id=e.agent_id
         LEFT JOIN aos_tasks  t ON t.id=e.task_id
         WHERE e.id=$1`, [req.params.id]
      );
      if (!exec) return res.status(404).json({ error: 'Không tồn tại' });
      res.json({ execution: exec });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Agent Memory ──────────────────────────────────────────────────────────────

  app.get('/api/aos/agents/:id/memory', async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM aos_agent_memory WHERE agent_id=$1 ORDER BY importance DESC, created_at DESC LIMIT 50',
        [req.params.id]
      );
      res.json({ memory: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/aos/agents/:id/memory', async (req, res) => {
    try {
      await pool.query('DELETE FROM aos_agent_memory WHERE agent_id=$1', [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Workflows (DAG) ───────────────────────────────────────────────────────────

  app.post('/api/aos/workflows', async (req, res) => {
    try {
      const { name, description='', nodes=[], edges=[] } = req.body;
      if (!name) return res.status(400).json({ error: 'name required' });
      const uid = req.user?.id ? String(req.user.id) : null;
      const { rows: [wf] } = await pool.query(
        `INSERT INTO aos_workflows (owner_id, name, description, nodes, edges)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [uid, name, description, JSON.stringify(nodes), JSON.stringify(edges)]
      );
      res.status(201).json({ workflow: wf });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/aos/workflows', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT w.*, COUNT(r.id)::int AS run_count
        FROM aos_workflows w
        LEFT JOIN aos_workflow_runs r ON r.workflow_id=w.id
        GROUP BY w.id ORDER BY w.created_at DESC
      `);
      res.json({ workflows: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/aos/workflows/:id', async (req, res) => {
    try {
      const { rows: [wf] } = await pool.query('SELECT * FROM aos_workflows WHERE id=$1', [req.params.id]);
      if (!wf) return res.status(404).json({ error: 'Not found' });
      const { rows: runs } = await pool.query(
        'SELECT * FROM aos_workflow_runs WHERE workflow_id=$1 ORDER BY started_at DESC LIMIT 10',
        [req.params.id]
      );
      res.json({ workflow: wf, runs });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Run a workflow — creates tasks, scheduler picks them up automatically
  app.post('/api/aos/workflows/:id/run', async (req, res) => {
    try {
      const dag = new DAGEngine(pool);
      const result = await dag.runWorkflow(pool, req.params.id, req.body.context || {});
      res.json({ success: true, ...result });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/aos/workflows/runs/:run_id', async (req, res) => {
    try {
      const { rows: [run] } = await pool.query(
        'SELECT * FROM aos_workflow_runs WHERE id=$1', [req.params.run_id]
      );
      if (!run) return res.status(404).json({ error: 'Not found' });
      const { rows: tasks } = await pool.query(
        `SELECT t.*, a.name AS agent_name FROM aos_tasks t
         LEFT JOIN aos_agents a ON a.id=t.assigned_agent_id
         WHERE t.workflow_run_id=$1 ORDER BY t.id`,
        [req.params.run_id]
      );
      res.json({ run, tasks });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Scheduler log ─────────────────────────────────────────────────────────────

  app.get('/api/aos/scheduler/log', async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM aos_scheduler_log ORDER BY ts DESC LIMIT 100'
      );
      res.json({ log: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── System stats ──────────────────────────────────────────────────────────────

  app.get('/api/aos/stats', async (req, res) => {
    try {
      const [agents, tasks, execs, sched] = await Promise.all([
        pool.query(`SELECT status, COUNT(*)::int AS cnt FROM aos_agents GROUP BY status`),
        pool.query(`SELECT status, COUNT(*)::int AS cnt FROM aos_tasks  GROUP BY status`),
        pool.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='completed')::int AS done,
                           COUNT(*) FILTER (WHERE status='failed')::int AS failed FROM aos_task_executions`),
        pool.query(`SELECT COUNT(*)::int AS total FROM aos_scheduler_log WHERE ts > NOW()-INTERVAL '1 hour'`),
      ]);
      const agentMap = {}, taskMap = {};
      agents.rows.forEach(r => { agentMap[r.status] = r.cnt; });
      tasks.rows.forEach(r => { taskMap[r.status] = r.cnt; });
      res.json({
        agents: agentMap,
        tasks: taskMap,
        executions: execs.rows[0],
        scheduler_events_1h: sched.rows[0].total,
      });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Attach runtime to app for world hook registration
  app._aosRuntime = runtime;
}

module.exports = { initAOSTables, registerAOSRoutes, startScheduler, stopScheduler, AgentRuntime, DAGEngine };
