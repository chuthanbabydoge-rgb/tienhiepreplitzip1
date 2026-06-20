/**
 * ═══════════════════════════════════════════════════════════
 *  VƯƠNG ĐẾ AI — Multi-Agent Workflow Engine
 * ═══════════════════════════════════════════════════════════
 *  Hỗ trợ: tuần tự, song song, thử lại, bộ nhớ agent, log
 */

const { GoogleGenAI } = require('@google/genai');

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAI() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY chưa được thiết lập');
  return new GoogleGenAI({ apiKey });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/** Thay thế {{key}} trong template bằng giá trị thực */
function renderTemplate(template, vars) {
  if (typeof template !== 'string') return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{{${k}}}`));
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function initWorkflowTables(pool) {
  await pool.query(`
    -- Bảng tác nhân workflow (riêng biệt với bảng agents UI)
    CREATE TABLE IF NOT EXISTS wf_agents (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      system_prompt TEXT NOT NULL DEFAULT '',
      model       TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
      memory      JSONB NOT NULL DEFAULT '[]',
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );

    -- Bảng quy trình làm việc
    CREATE TABLE IF NOT EXISTS wf_workflows (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      steps       JSONB NOT NULL DEFAULT '[]',
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );

    -- Bảng tác vụ (task template trong workflow)
    CREATE TABLE IF NOT EXISTS wf_tasks (
      id             SERIAL PRIMARY KEY,
      workflow_id    INT NOT NULL REFERENCES wf_workflows(id) ON DELETE CASCADE,
      agent_id       INT NOT NULL REFERENCES wf_agents(id) ON DELETE CASCADE,
      name           TEXT NOT NULL DEFAULT '',
      step_order     INT NOT NULL DEFAULT 0,
      exec_mode      TEXT NOT NULL DEFAULT 'sequential',
      parallel_group TEXT,
      input_template TEXT NOT NULL DEFAULT '{{input}}',
      retry_limit    INT NOT NULL DEFAULT 3,
      retry_delay_ms INT NOT NULL DEFAULT 2000,
      created_at     TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_wf_tasks_workflow ON wf_tasks(workflow_id);

    -- Bảng thực thi (mỗi lần chạy workflow)
    CREATE TABLE IF NOT EXISTS wf_executions (
      id           SERIAL PRIMARY KEY,
      workflow_id  INT NOT NULL REFERENCES wf_workflows(id) ON DELETE CASCADE,
      status       TEXT NOT NULL DEFAULT 'pending',
      input        JSONB NOT NULL DEFAULT '{}',
      output       JSONB,
      error        TEXT,
      started_at   TIMESTAMPTZ,
      finished_at  TIMESTAMPTZ,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_wf_exec_workflow ON wf_executions(workflow_id);

    -- Bảng nhật ký chi tiết từng tác vụ trong mỗi lần thực thi
    CREATE TABLE IF NOT EXISTS wf_execution_logs (
      id           SERIAL PRIMARY KEY,
      execution_id INT NOT NULL REFERENCES wf_executions(id) ON DELETE CASCADE,
      task_id      INT REFERENCES wf_tasks(id) ON DELETE SET NULL,
      agent_id     INT REFERENCES wf_agents(id) ON DELETE SET NULL,
      agent_name   TEXT,
      task_name    TEXT,
      step_order   INT,
      attempt      INT NOT NULL DEFAULT 1,
      status       TEXT NOT NULL DEFAULT 'pending',
      input        TEXT,
      output       TEXT,
      error        TEXT,
      duration_ms  INT,
      started_at   TIMESTAMPTZ DEFAULT NOW(),
      finished_at  TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_wf_logs_exec ON wf_execution_logs(execution_id);
  `);
  console.log('✅ Workflow tables ready');
}

// ── Core Engine ───────────────────────────────────────────────────────────────

class WorkflowEngine {
  constructor(pool) {
    this.pool = pool;
  }

  // ── Gọi Gemini cho một agent ──────────────────────────────────────────────
  async callAgent(agent, userInput) {
    const ai = getAI();
    const history = Array.isArray(agent.memory) ? agent.memory : [];

    const contents = [
      { role: 'user', parts: [{ text: agent.system_prompt || 'Bạn là một AI assistant hữu ích.' }] },
      { role: 'model', parts: [{ text: 'Tôi hiểu. Hãy cho tôi biết tôi có thể giúp gì cho bạn.' }] },
      ...history.flatMap(h => [
        { role: 'user', parts: [{ text: h.input }] },
        { role: 'model', parts: [{ text: h.output }] },
      ]),
      { role: 'user', parts: [{ text: userInput }] },
    ];

    const response = await ai.models.generateContent({
      model: agent.model || 'gemini-2.5-flash',
      contents,
      config: { maxOutputTokens: 4096 },
    });

    return response.text || '';
  }

  // ── Cập nhật bộ nhớ agent ─────────────────────────────────────────────────
  async saveAgentMemory(agentId, input, output) {
    const maxMemory = 10;
    const { rows } = await this.pool.query('SELECT memory FROM wf_agents WHERE id=$1', [agentId]);
    if (!rows.length) return;

    let memory = Array.isArray(rows[0].memory) ? rows[0].memory : [];
    memory.push({ input: input.slice(0, 500), output: output.slice(0, 500), ts: Date.now() });
    if (memory.length > maxMemory) memory = memory.slice(-maxMemory);

    await this.pool.query(
      'UPDATE wf_agents SET memory=$1, updated_at=NOW() WHERE id=$2',
      [JSON.stringify(memory), agentId]
    );
  }

  // ── Ghi log tác vụ ────────────────────────────────────────────────────────
  async writeLog(executionId, task, attempt, status, input, output, error, startedAt) {
    const durationMs = startedAt ? Date.now() - startedAt : null;
    await this.pool.query(
      `INSERT INTO wf_execution_logs
         (execution_id, task_id, agent_id, agent_name, task_name, step_order, attempt, status, input, output, error, duration_ms, started_at, finished_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,to_timestamp($13/1000.0),NOW())`,
      [
        executionId,
        task.id || null,
        task.agent_id || null,
        task.agent_name || '',
        task.name || '',
        task.step_order || 0,
        attempt,
        status,
        input ? input.slice(0, 2000) : null,
        output ? output.slice(0, 4000) : null,
        error ? error.slice(0, 1000) : null,
        durationMs,
        startedAt || Date.now(),
      ]
    );
  }

  // ── Chạy một tác vụ với cơ chế thử lại ───────────────────────────────────
  async runTask(executionId, task, agent, resolvedInput) {
    const maxAttempts = (task.retry_limit || 3) + 1;
    const retryDelay = task.retry_delay_ms || 2000;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const startedAt = Date.now();
      try {
        const output = await this.callAgent(agent, resolvedInput);
        await this.writeLog(executionId, task, attempt, 'success', resolvedInput, output, null, startedAt);
        await this.saveAgentMemory(agent.id, resolvedInput, output);
        return output;
      } catch (err) {
        lastError = err.message || String(err);
        await this.writeLog(executionId, task, attempt, attempt < maxAttempts ? 'retrying' : 'failed', resolvedInput, null, lastError, startedAt);
        if (attempt < maxAttempts) {
          await sleep(retryDelay * attempt); // exponential backoff
        }
      }
    }
    throw new Error(`Tác vụ "${task.name}" thất bại sau ${maxAttempts} lần: ${lastError}`);
  }

  // ── Thực thi workflow ─────────────────────────────────────────────────────
  async runWorkflow(executionId, workflowId, initialInput) {
    // Cập nhật trạng thái bắt đầu
    await this.pool.query(
      "UPDATE wf_executions SET status='running', started_at=NOW() WHERE id=$1",
      [executionId]
    );

    try {
      // Lấy danh sách tác vụ sắp xếp theo thứ tự
      const { rows: tasks } = await this.pool.query(
        `SELECT t.*, a.name AS agent_name, a.system_prompt, a.model, a.memory
         FROM wf_tasks t
         JOIN wf_agents a ON a.id = t.agent_id
         WHERE t.workflow_id = $1
         ORDER BY t.step_order ASC, t.id ASC`,
        [workflowId]
      );

      if (!tasks.length) throw new Error('Workflow không có tác vụ nào');

      // Nhóm tasks theo step_order để xử lý song song
      const stepGroups = {};
      for (const task of tasks) {
        const key = task.step_order;
        if (!stepGroups[key]) stepGroups[key] = [];
        stepGroups[key].push(task);
      }
      const sortedSteps = Object.keys(stepGroups).sort((a, b) => Number(a) - Number(b));

      let currentInput = typeof initialInput === 'string' ? initialInput : JSON.stringify(initialInput);
      const allOutputs = {};

      // Chạy từng bước tuần tự; trong mỗi bước có thể song song
      for (const stepKey of sortedSteps) {
        const group = stepGroups[stepKey];
        const execMode = group[0].exec_mode;

        if (execMode === 'parallel' || group.length > 1) {
          // Chạy song song tất cả tác vụ trong nhóm
          const results = await Promise.all(group.map(async task => {
            const agent = {
              id: task.agent_id,
              name: task.agent_name,
              system_prompt: task.system_prompt,
              model: task.model,
              memory: task.memory,
            };
            const resolvedInput = renderTemplate(task.input_template, {
              input: currentInput,
              ...allOutputs,
            });
            const output = await this.runTask(executionId, task, agent, resolvedInput);
            return { taskName: task.name, output };
          }));

          // Gộp kết quả song song thành JSON
          const parallelOutput = {};
          for (const r of results) {
            parallelOutput[r.taskName] = r.output;
            allOutputs[r.taskName] = r.output;
          }
          currentInput = JSON.stringify(parallelOutput);
        } else {
          // Chạy tuần tự (sequential) — chỉ 1 task trong nhóm
          const task = group[0];
          const agent = {
            id: task.agent_id,
            name: task.agent_name,
            system_prompt: task.system_prompt,
            model: task.model,
            memory: task.memory,
          };
          const resolvedInput = renderTemplate(task.input_template, {
            input: currentInput,
            ...allOutputs,
          });
          const output = await this.runTask(executionId, task, agent, resolvedInput);
          allOutputs[task.name] = output;
          currentInput = output;
        }
      }

      // Hoàn thành
      await this.pool.query(
        "UPDATE wf_executions SET status='completed', output=$1, finished_at=NOW() WHERE id=$2",
        [JSON.stringify({ final: currentInput, steps: allOutputs }), executionId]
      );

      return { executionId, status: 'completed', output: currentInput, steps: allOutputs };

    } catch (err) {
      await this.pool.query(
        "UPDATE wf_executions SET status='failed', error=$1, finished_at=NOW() WHERE id=$2",
        [err.message, executionId]
      );
      throw err;
    }
  }
}

// ── REST API Routes ───────────────────────────────────────────────────────────

function registerWorkflowRoutes(app, pool) {
  const engine = new WorkflowEngine(pool);

  // POST /api/workflow/agent/create — Tạo tác nhân
  app.post('/api/workflow/agent/create', async (req, res) => {
    const { name, description = '', system_prompt = '', model = 'gemini-2.5-flash' } = req.body;
    if (!name) return res.status(400).json({ error: 'Thiếu tên tác nhân' });
    try {
      const { rows } = await pool.query(
        `INSERT INTO wf_agents (name, description, system_prompt, model)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [name, description, system_prompt, model]
      );
      res.status(201).json({ success: true, agent: rows[0] });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/workflow/agents — Danh sách tác nhân
  app.get('/api/workflow/agents', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT id, name, description, model, created_at FROM wf_agents ORDER BY id');
      res.json({ agents: rows });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/workflow/create — Tạo quy trình + tác vụ
  app.post('/api/workflow/create', async (req, res) => {
    /*
      Body:
      {
        name: "Quy trình phân tích nội dung",
        description: "...",
        tasks: [
          { agent_id: 1, name: "Thu thập", step_order: 1, exec_mode: "sequential", input_template: "{{input}}", retry_limit: 3 },
          { agent_id: 2, name: "Phân tích A", step_order: 2, exec_mode: "parallel" },
          { agent_id: 3, name: "Phân tích B", step_order: 2, exec_mode: "parallel" },
          { agent_id: 4, name: "Tổng hợp", step_order: 3, exec_mode: "sequential", input_template: "{{input}}" }
        ]
      }
    */
    const { name, description = '', tasks = [] } = req.body;
    if (!name) return res.status(400).json({ error: 'Thiếu tên workflow' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [wf] } = await client.query(
        'INSERT INTO wf_workflows (name, description, steps) VALUES ($1,$2,$3) RETURNING *',
        [name, description, JSON.stringify(tasks)]
      );

      const insertedTasks = [];
      for (const t of tasks) {
        const { rows: [task] } = await client.query(
          `INSERT INTO wf_tasks (workflow_id, agent_id, name, step_order, exec_mode, input_template, retry_limit, retry_delay_ms)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
          [
            wf.id,
            t.agent_id,
            t.name || `Bước ${t.step_order}`,
            t.step_order || 1,
            t.exec_mode || 'sequential',
            t.input_template || '{{input}}',
            t.retry_limit !== undefined ? t.retry_limit : 3,
            t.retry_delay_ms || 2000,
          ]
        );
        insertedTasks.push(task);
      }

      await client.query('COMMIT');
      res.status(201).json({ success: true, workflow: wf, tasks: insertedTasks });
    } catch (e) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: e.message });
    } finally {
      client.release();
    }
  });

  // GET /api/workflow/list — Danh sách workflow
  app.get('/api/workflow/list', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT w.*, COUNT(t.id) AS task_count
        FROM wf_workflows w
        LEFT JOIN wf_tasks t ON t.workflow_id = w.id
        GROUP BY w.id
        ORDER BY w.created_at DESC
      `);
      res.json({ workflows: rows });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/workflow/run — Thực thi workflow
  app.post('/api/workflow/run', async (req, res) => {
    /*
      Body: { workflow_id: 1, input: "Nội dung cần xử lý..." }
    */
    const { workflow_id, input = '' } = req.body;
    if (!workflow_id) return res.status(400).json({ error: 'Thiếu workflow_id' });

    try {
      // Kiểm tra workflow tồn tại
      const { rows: [wf] } = await pool.query('SELECT * FROM wf_workflows WHERE id=$1', [workflow_id]);
      if (!wf) return res.status(404).json({ error: 'Workflow không tìm thấy' });

      // Tạo bản ghi thực thi
      const { rows: [exec] } = await pool.query(
        "INSERT INTO wf_executions (workflow_id, status, input) VALUES ($1,'pending',$2) RETURNING *",
        [workflow_id, JSON.stringify({ input })]
      );

      // Chạy bất đồng bộ để trả về ngay ID thực thi
      engine.runWorkflow(exec.id, workflow_id, input).catch(err => {
        console.error(`[Workflow ${exec.id}] Lỗi:`, err.message);
      });

      res.status(202).json({
        success: true,
        execution_id: exec.id,
        workflow_id,
        status: 'running',
        message: 'Workflow đã bắt đầu. Dùng /api/workflow/status/:id để kiểm tra.',
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/workflow/status/:executionId — Trạng thái thực thi
  app.get('/api/workflow/status/:executionId', async (req, res) => {
    const { executionId } = req.params;
    try {
      const { rows: [exec] } = await pool.query(
        `SELECT e.*, w.name AS workflow_name
         FROM wf_executions e
         JOIN wf_workflows w ON w.id = e.workflow_id
         WHERE e.id = $1`,
        [executionId]
      );
      if (!exec) return res.status(404).json({ error: 'Không tìm thấy lần thực thi' });

      // Tóm tắt tiến độ
      const { rows: summary } = await pool.query(
        `SELECT step_order, task_name, agent_name, status, attempt, duration_ms
         FROM wf_execution_logs
         WHERE execution_id = $1
         ORDER BY step_order, started_at`,
        [executionId]
      );

      res.json({
        execution: {
          id: exec.id,
          workflow_id: exec.workflow_id,
          workflow_name: exec.workflow_name,
          status: exec.status,
          input: exec.input,
          output: exec.output,
          error: exec.error,
          started_at: exec.started_at,
          finished_at: exec.finished_at,
          created_at: exec.created_at,
        },
        progress: summary,
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/workflow/logs/:executionId — Nhật ký đầy đủ
  app.get('/api/workflow/logs/:executionId', async (req, res) => {
    const { executionId } = req.params;
    try {
      const { rows: [exec] } = await pool.query(
        `SELECT e.id, e.status, e.started_at, e.finished_at, w.name AS workflow_name
         FROM wf_executions e JOIN wf_workflows w ON w.id = e.workflow_id
         WHERE e.id=$1`,
        [executionId]
      );
      if (!exec) return res.status(404).json({ error: 'Không tìm thấy lần thực thi' });

      const { rows: logs } = await pool.query(
        `SELECT id, task_name, agent_name, step_order, attempt, status, input, output, error, duration_ms, started_at, finished_at
         FROM wf_execution_logs
         WHERE execution_id=$1
         ORDER BY step_order ASC, started_at ASC`,
        [executionId]
      );

      res.json({
        execution_id: Number(executionId),
        workflow_name: exec.workflow_name,
        status: exec.status,
        started_at: exec.started_at,
        finished_at: exec.finished_at,
        total_tasks: logs.length,
        logs,
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/workflow/executions — Lịch sử tất cả lần chạy
  app.get('/api/workflow/executions', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const workflow_id = req.query.workflow_id;
    try {
      let q = `
        SELECT e.id, e.workflow_id, w.name AS workflow_name, e.status,
               e.started_at, e.finished_at, e.created_at,
               e.error,
               EXTRACT(EPOCH FROM (e.finished_at - e.started_at)) * 1000 AS duration_ms
        FROM wf_executions e
        JOIN wf_workflows w ON w.id = e.workflow_id
      `;
      const params = [];
      if (workflow_id) {
        params.push(workflow_id);
        q += ` WHERE e.workflow_id = $${params.length}`;
      }
      q += ` ORDER BY e.created_at DESC LIMIT ${limit}`;
      const { rows } = await pool.query(q, params);
      res.json({ executions: rows });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // DELETE /api/workflow/:id — Xóa workflow
  app.delete('/api/workflow/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM wf_workflows WHERE id=$1', [req.params.id]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // PATCH /api/workflow/agent/:id/memory — Xóa bộ nhớ agent
  app.patch('/api/workflow/agent/:id/memory', async (req, res) => {
    try {
      await pool.query("UPDATE wf_agents SET memory='[]', updated_at=NOW() WHERE id=$1", [req.params.id]);
      res.json({ success: true, message: 'Đã xóa bộ nhớ tác nhân' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  console.log('✅ Workflow API routes registered');
}

module.exports = { initWorkflowTables, registerWorkflowRoutes };
