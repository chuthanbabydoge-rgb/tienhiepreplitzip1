'use strict';
/**
 * ╔══════════════════════════════════════════════════════════════════╗
 *  VƯƠNG ĐẾ AI — Organization Engine v1
 *  AI Companies · Hierarchy · Budgets · Strategic Planning
 * ╠══════════════════════════════════════════════════════════════════╣
 *  Tables:
 *    organizations          — AI company registry
 *    departments            — internal divisions
 *    positions              — titled roles with hierarchy level
 *    agent_roles            — agent ↔ org ↔ department assignments
 *    organization_budgets   — period budget allocations per dept
 *    organization_goals     — strategic goals from CEO
 *    organization_metrics   — time-series revenue/expense/profit
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const { GoogleGenAI } = require('@google/genai');

function getAI() {
  const key = process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY chưa thiết lập');
  return new GoogleGenAI({ apiKey: key });
}

// ─── Department templates per org type ─────────────────────────────────────────
const ORG_TYPES = ['marketing_agency', 'software_company', 'school', 'hospital', 'startup_studio'];

const DEPT_TEMPLATES = {
  marketing_agency:  ['Marketing', 'Creative', 'Analytics', 'Client Relations'],
  software_company:  ['Engineering', 'Product', 'QA', 'DevOps'],
  school:            ['Curriculum', 'Teaching', 'Administration', 'Research'],
  hospital:          ['Medical', 'Nursing', 'Administration', 'Research'],
  startup_studio:    ['Product', 'Engineering', 'Marketing', 'Operations'],
};

const DEPT_TYPE_MAP = {
  'Marketing': 'marketing', 'Creative': 'creative', 'Analytics': 'analytics',
  'Client Relations': 'operations', 'Engineering': 'engineering', 'Product': 'product',
  'QA': 'engineering', 'DevOps': 'engineering', 'Curriculum': 'research',
  'Teaching': 'operations', 'Administration': 'operations', 'Research': 'research',
  'Medical': 'operations', 'Nursing': 'operations', 'Operations': 'operations',
};

// Salary (coins deducted from dept budget per task completed)
const SALARY_BY_LEVEL = { ceo: 200, manager: 80, worker: 30 };

// Revenue share: org earns X% of resource value created by its agents
const ORG_REVENUE_RATE = 0.30;

// ─── DB Setup ──────────────────────────────────────────────────────────────────
async function initOrgTables(pool) {
  // ── One-time migration: drop stale child tables if they FK'd to old 'organizations' ──
  try {
    const { rows } = await pool.query(`
      SELECT COUNT(*)::int AS cnt
      FROM information_schema.referential_constraints rc
      JOIN information_schema.table_constraints tc
        ON tc.constraint_name = rc.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = rc.unique_constraint_name
      WHERE tc.table_name = 'departments' AND ccu.table_name = 'organizations'
    `);
    if (rows[0]?.cnt > 0) {
      await pool.query(`
        DROP TABLE IF EXISTS organization_metrics  CASCADE;
        DROP TABLE IF EXISTS organization_goals    CASCADE;
        DROP TABLE IF EXISTS organization_budgets  CASCADE;
        DROP TABLE IF EXISTS agent_roles           CASCADE;
        DROP TABLE IF EXISTS positions             CASCADE;
        DROP TABLE IF EXISTS departments           CASCADE;
      `);
      console.log('[OrgEngine] Migrated: rebuilt org child tables with correct FK → org_companies');
    }
  } catch (_) { /* tables may not exist yet, safe to continue */ }

  await pool.query(`
    -- ── Organizations ────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS org_companies (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      type        TEXT NOT NULL DEFAULT 'startup_studio',
      description TEXT,
      treasury    NUMERIC(18,4) NOT NULL DEFAULT 100000.0000,
      status      TEXT NOT NULL DEFAULT 'active',
      created_by  TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );

    -- ── Departments ───────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS departments (
      id               SERIAL PRIMARY KEY,
      org_id           INT NOT NULL REFERENCES org_companies(id) ON DELETE CASCADE,
      name             TEXT NOT NULL,
      type             TEXT NOT NULL DEFAULT 'operations',
      budget_allocated NUMERIC(18,4) NOT NULL DEFAULT 0,
      budget_spent     NUMERIC(18,4) NOT NULL DEFAULT 0,
      created_at       TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_dept_org ON departments(org_id);

    -- ── Positions ─────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS positions (
      id             SERIAL PRIMARY KEY,
      org_id         INT NOT NULL REFERENCES org_companies(id) ON DELETE CASCADE,
      dept_id        INT REFERENCES departments(id) ON DELETE SET NULL,
      title          TEXT NOT NULL,
      level          TEXT NOT NULL DEFAULT 'worker',
      salary_per_task NUMERIC(18,4) NOT NULL DEFAULT 30,
      created_at     TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_pos_org  ON positions(org_id);
    CREATE INDEX IF NOT EXISTS idx_pos_dept ON positions(dept_id);

    -- ── Agent Roles ───────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS agent_roles (
      id          SERIAL PRIMARY KEY,
      agent_id    INT NOT NULL REFERENCES aos_agents(id) ON DELETE CASCADE,
      org_id      INT NOT NULL REFERENCES org_companies(id) ON DELETE CASCADE,
      dept_id     INT REFERENCES departments(id) ON DELETE SET NULL,
      position_id INT REFERENCES positions(id) ON DELETE SET NULL,
      level       TEXT NOT NULL DEFAULT 'worker',
      joined_at   TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(agent_id, org_id)
    );
    CREATE INDEX IF NOT EXISTS idx_roles_org   ON agent_roles(org_id);
    CREATE INDEX IF NOT EXISTS idx_roles_agent ON agent_roles(agent_id);

    -- ── Organization Budgets ──────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS organization_budgets (
      id         SERIAL PRIMARY KEY,
      org_id     INT NOT NULL REFERENCES org_companies(id) ON DELETE CASCADE,
      dept_id    INT REFERENCES departments(id) ON DELETE CASCADE,
      period     TEXT NOT NULL DEFAULT '2026-Q3',
      allocated  NUMERIC(18,4) NOT NULL DEFAULT 0,
      spent      NUMERIC(18,4) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(org_id, dept_id, period)
    );

    -- ── Organization Goals ────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS organization_goals (
      id                SERIAL PRIMARY KEY,
      org_id            INT NOT NULL REFERENCES org_companies(id) ON DELETE CASCADE,
      dept_id           INT REFERENCES departments(id) ON DELETE SET NULL,
      created_by_agent  INT REFERENCES aos_agents(id) ON DELETE SET NULL,
      title             TEXT NOT NULL,
      description       TEXT,
      period            TEXT NOT NULL DEFAULT '2026-Q3',
      target_metric     TEXT DEFAULT 'tasks_completed',
      target_value      NUMERIC(18,4) DEFAULT 0,
      current_value     NUMERIC(18,4) NOT NULL DEFAULT 0,
      status            TEXT NOT NULL DEFAULT 'active',
      priority          INT NOT NULL DEFAULT 5,
      task_ids          JSONB NOT NULL DEFAULT '[]',
      created_at        TIMESTAMPTZ DEFAULT NOW(),
      updated_at        TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_goals_org    ON organization_goals(org_id);
    CREATE INDEX IF NOT EXISTS idx_goals_status ON organization_goals(status);

    -- ── Organization Metrics ──────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS organization_metrics (
      id              SERIAL PRIMARY KEY,
      org_id          INT NOT NULL REFERENCES org_companies(id) ON DELETE CASCADE,
      period          TEXT NOT NULL DEFAULT '2026-Q3',
      revenue         NUMERIC(18,4) NOT NULL DEFAULT 0,
      expenses        NUMERIC(18,4) NOT NULL DEFAULT 0,
      profit          NUMERIC(18,4) NOT NULL DEFAULT 0,
      burn_rate       NUMERIC(18,4) NOT NULL DEFAULT 0,
      active_agents   INT NOT NULL DEFAULT 0,
      completed_tasks INT NOT NULL DEFAULT 0,
      snapshotted_at  TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_metrics_org ON organization_metrics(org_id);
  `);

  console.log('✅ Organization Engine v1 tables ready');
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function currentPeriod() {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${q}`;
}

function sanitizeJSON(text) {
  return text
    .replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    .replace(/[\x00-\x1F\x7F]/g, c => c === '\n' ? '\\n' : c === '\r' ? '' : c === '\t' ? '\\t' : '');
}

// ─── Organization Engine ───────────────────────────────────────────────────────
class OrganizationEngine {
  constructor(pool) {
    this.pool = pool;
  }

  // ── Create Org ───────────────────────────────────────────────────────────────

  async createOrganization({ name, type = 'startup_studio', description = '', treasury = 100000, createdBy = null }) {
    if (!ORG_TYPES.includes(type)) throw new Error(`Invalid type. Must be one of: ${ORG_TYPES.join(', ')}`);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create org
      const { rows: [org] } = await client.query(
        `INSERT INTO org_companies (name, type, description, treasury, created_by)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [name, type, description, treasury, createdBy]
      );

      // Auto-create departments
      const deptNames = DEPT_TEMPLATES[type] || ['Operations'];
      const depts = [];
      for (const dname of deptNames) {
        const dtype = DEPT_TYPE_MAP[dname] || 'operations';
        const { rows: [d] } = await client.query(
          `INSERT INTO departments (org_id, name, type) VALUES ($1,$2,$3) RETURNING *`,
          [org.id, dname, dtype]
        );
        depts.push(d);
      }

      // Auto-create 3 default positions: CEO, Manager, Worker (unassigned to dept)
      const positions = [];
      for (const [title, level] of [
        [type === 'school' ? 'Principal' : type === 'hospital' ? 'Chief Medical Officer' : 'CEO', 'ceo'],
        ['Department Manager', 'manager'],
        ['Specialist', 'worker'],
      ]) {
        const { rows: [p] } = await client.query(
          `INSERT INTO positions (org_id, title, level, salary_per_task)
           VALUES ($1,$2,$3,$4) RETURNING *`,
          [org.id, title, level, SALARY_BY_LEVEL[level]]
        );
        positions.push(p);
      }

      // Seed initial budget period for each dept
      const period = currentPeriod();
      const deptBudget = Math.floor(treasury / depts.length / 4); // 25% of treasury per dept
      for (const d of depts) {
        await client.query(
          `INSERT INTO organization_budgets (org_id, dept_id, period, allocated)
           VALUES ($1,$2,$3,$4) ON CONFLICT (org_id, dept_id, period) DO NOTHING`,
          [org.id, d.id, period, deptBudget]
        );
        await client.query(
          `UPDATE departments SET budget_allocated=$1 WHERE id=$2`,
          [deptBudget, d.id]
        );
        await client.query(
          `UPDATE org_companies SET treasury=treasury-$1 WHERE id=$2`,
          [deptBudget, org.id]
        );
      }

      await client.query('COMMIT');
      return { org, departments: depts, positions };

    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // ── Hire / Fire ───────────────────────────────────────────────────────────────

  async hireAgent({ orgId, agentId, deptId, positionId, level }) {
    if (!['ceo', 'manager', 'worker'].includes(level)) {
      throw new Error('level must be: ceo, manager, worker');
    }

    // ── Treasury enforcement: org must afford at least 10 task salaries ──────
    const salary     = SALARY_BY_LEVEL[level] || 30;
    const minReserve = salary * 10;
    const { rows: [org] } = await this.pool.query(
      'SELECT id, name, treasury, status FROM org_companies WHERE id=$1', [orgId]
    );
    if (!org) throw new Error('Organization not found');
    if (org.status === 'paused') {
      throw new Error(
        `Org "${org.name}" is PAUSED — treasury critically low. ` +
        `Fund the treasury (currently ${Math.floor(parseFloat(org.treasury))} coins) to resume hiring.`
      );
    }
    if (parseFloat(org.treasury) < minReserve) {
      throw new Error(
        `Insufficient treasury. Hiring ${level} requires ${minReserve} coin reserve ` +
        `(${salary} salary × 10 tasks) but org has ${Math.floor(parseFloat(org.treasury))} coins.`
      );
    }

    const { rows: [role] } = await this.pool.query(
      `INSERT INTO agent_roles (agent_id, org_id, dept_id, position_id, level)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (agent_id, org_id) DO UPDATE
         SET dept_id=$3, position_id=$4, level=$5, joined_at=NOW()
       RETURNING *`,
      [agentId, orgId, deptId || null, positionId || null, level]
    );
    return role;
  }

  async fireAgent(orgId, agentId) {
    await this.pool.query(
      'DELETE FROM agent_roles WHERE org_id=$1 AND agent_id=$2', [orgId, agentId]
    );
  }

  async getTeam(orgId) {
    const { rows } = await this.pool.query(`
      SELECT ar.*, a.name AS agent_name, a.role AS agent_role,
             d.name AS dept_name, p.title AS position_title
      FROM agent_roles ar
      JOIN aos_agents a ON a.id=ar.agent_id
      LEFT JOIN departments d ON d.id=ar.dept_id
      LEFT JOIN positions   p ON p.id=ar.position_id
      WHERE ar.org_id=$1
      ORDER BY CASE ar.level WHEN 'ceo' THEN 1 WHEN 'manager' THEN 2 ELSE 3 END, a.name
    `, [orgId]);
    return rows;
  }

  // ── Budget ────────────────────────────────────────────────────────────────────

  async allocateBudget(orgId, deptId, amount, period) {
    if (amount <= 0) throw new Error('Amount must be positive');
    const p = period || currentPeriod();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Check org treasury
      const { rows: [org] } = await client.query(
        'SELECT treasury FROM org_companies WHERE id=$1 FOR UPDATE', [orgId]
      );
      if (!org) throw new Error('Organization not found');
      if (parseFloat(org.treasury) < amount) throw new Error('Insufficient org treasury');

      // Deduct from org treasury
      await client.query(
        'UPDATE org_companies SET treasury=treasury-$1, updated_at=NOW() WHERE id=$2',
        [amount, orgId]
      );

      // Add to dept budget
      await client.query(
        `INSERT INTO organization_budgets (org_id, dept_id, period, allocated)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (org_id, dept_id, period) DO UPDATE
           SET allocated=organization_budgets.allocated+$4, updated_at=NOW()`,
        [orgId, deptId, p, amount]
      );

      await client.query(
        'UPDATE departments SET budget_allocated=budget_allocated+$1 WHERE id=$2',
        [amount, deptId]
      );

      await client.query('COMMIT');
      return { org_id: orgId, dept_id: deptId, period: p, amount };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getBudgetOverview(orgId) {
    const [org, depts, budgets] = await Promise.all([
      this.pool.query('SELECT id,name,type,treasury FROM org_companies WHERE id=$1', [orgId]),
      this.pool.query(
        'SELECT * FROM departments WHERE org_id=$1 ORDER BY name', [orgId]
      ),
      this.pool.query(
        `SELECT b.*, d.name AS dept_name
         FROM organization_budgets b
         LEFT JOIN departments d ON d.id=b.dept_id
         WHERE b.org_id=$1 ORDER BY b.period DESC, d.name`,
        [orgId]
      ),
    ]);
    return {
      org: org.rows[0],
      departments: depts.rows,
      budgets: budgets.rows,
    };
  }

  // ── Strategic Goals ───────────────────────────────────────────────────────────

  async createGoal({ orgId, agentId, deptId, title, description, period, targetMetric, targetValue, priority = 5 }) {
    // Verify agent is CEO or Manager
    const { rows: [role] } = await this.pool.query(
      'SELECT * FROM agent_roles WHERE org_id=$1 AND agent_id=$2', [orgId, agentId]
    );
    if (!role) throw new Error('Agent is not a member of this organization');
    if (!['ceo', 'manager'].includes(role.level)) {
      throw new Error('Only CEO or Manager can create strategic goals');
    }

    const { rows: [goal] } = await this.pool.query(
      `INSERT INTO organization_goals
         (org_id, dept_id, created_by_agent, title, description, period,
          target_metric, target_value, priority)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [orgId, deptId || null, agentId,
       title, description, period || currentPeriod(),
       targetMetric || 'tasks_completed', targetValue || 0, priority]
    );

    // ── CEO real authority: high-priority goals trigger auto-pipeline ─────────
    if (role.level === 'ceo' && priority >= 8) {
      const self = this;

      // Step 1: auto-allocate 5% of treasury to target dept (or first dept)
      (async () => {
        try {
          const { rows: [orgData] } = await self.pool.query(
            'SELECT treasury FROM org_companies WHERE id=$1', [orgId]
          );
          let targetDeptId = deptId;
          if (!targetDeptId) {
            const { rows: [firstDept] } = await self.pool.query(
              'SELECT id FROM departments WHERE org_id=$1 LIMIT 1', [orgId]
            );
            targetDeptId = firstDept?.id;
          }
          if (targetDeptId && parseFloat(orgData?.treasury || 0) > 1000) {
            const autoAlloc = Math.max(500, Math.floor(parseFloat(orgData.treasury) * 0.05));
            await self.allocateBudget(orgId, targetDeptId, autoAlloc);
            console.log(`[OrgEngine] CEO auto-funded goal #${goal.id}: ${autoAlloc} coins → dept #${targetDeptId}`);
          }
        } catch (e) {
          console.error('[OrgEngine] CEO auto-allocate error:', e.message);
        }
      })();

      // Step 2: schedule decomposition after 3s (let tx settle; find manager or CEO)
      setTimeout(async () => {
        try {
          const { rows: leaders } = await self.pool.query(`
            SELECT agent_id, level FROM agent_roles
            WHERE org_id=$1 AND level IN ('manager','ceo')
            ORDER BY CASE level WHEN 'manager' THEN 1 ELSE 2 END
            LIMIT 1
          `, [orgId]);
          const decomposerId = leaders[0]?.agent_id || agentId;
          const result = await self.decomposeGoal(goal.id, decomposerId);
          console.log(`[OrgEngine] CEO auto-decomposed goal #${goal.id} → ${result.tasks_created} tasks`);
        } catch (e) {
          console.error(`[OrgEngine] CEO auto-decompose goal #${goal.id}:`, e.message);
        }
      }, 3000);

      console.log(`[OrgEngine] CEO goal #${goal.id} priority=${priority}: auto-pipeline triggered`);
    }

    return goal;
  }

  /**
   * CEO/Manager decomposes a goal into AOS tasks via Gemini.
   * Each task is assigned to a worker in the same org.
   */
  async decomposeGoal(goalId, managerAgentId) {
    // ── Atomic claim: only one caller can decompose a goal ────────────────────
    // Uses sentinel task_ids=[-1] as "decomposing in progress" lock.
    // If two callers race, only the one that wins the UPDATE proceeds.
    const { rows: [claimed] } = await this.pool.query(
      `UPDATE organization_goals
       SET task_ids = '[-1]'::jsonb, updated_at=NOW()
       WHERE id=$1
         AND (task_ids IS NULL
              OR task_ids = '[]'::jsonb
              OR jsonb_array_length(task_ids) = 0)
       RETURNING *`,
      [goalId]
    );
    if (!claimed) {
      // Another process already claimed or decomposed this goal — idempotent return
      const { rows: [existing] } = await this.pool.query(
        'SELECT task_ids FROM organization_goals WHERE id=$1', [goalId]
      );
      const ids = (existing?.task_ids || []).filter(id => id !== -1);
      return { goal_id: goalId, tasks_created: 0, task_ids: ids, already_decomposed: true };
    }

    // ── Full goal context for Gemini ──────────────────────────────────────────
    const { rows: [goal] } = await this.pool.query(
      `SELECT g.*, o.name AS org_name, o.type AS org_type,
              d.name AS dept_name, a.name AS manager_name
       FROM organization_goals g
       JOIN org_companies o ON o.id=g.org_id
       LEFT JOIN departments d ON d.id=g.dept_id
       LEFT JOIN aos_agents a ON a.id=$2
       WHERE g.id=$1`,
      [goalId, managerAgentId]
    );
    if (!goal) throw new Error('Goal not found');

    // Get workers in the org (preferring dept if set)
    let workerQ = `
      SELECT ar.agent_id, a.name, a.role, a.goal AS agent_goal, ar.level, ar.dept_id
      FROM agent_roles ar JOIN aos_agents a ON a.id=ar.agent_id
      WHERE ar.org_id=$1 AND ar.level='worker'
    `;
    const workerParams = [goal.org_id];
    if (goal.dept_id) {
      workerQ += ` AND (ar.dept_id=$2 OR ar.dept_id IS NULL)`;
      workerParams.push(goal.dept_id);
    }
    workerQ += ' LIMIT 10';
    const { rows: workers } = await this.pool.query(workerQ, workerParams);

    const workerList = workers.length > 0
      ? workers.map(w => `  - Agent #${w.agent_id} "${w.name}" (${w.role})`).join('\n')
      : '  - No specific workers assigned; tasks will be unassigned';

    // Use Gemini to generate sub-tasks
    const prompt = `You are a strategic planning AI for an organization called "${goal.org_name}" (type: ${goal.org_type}).
The organization has a goal: "${goal.title}"
Description: ${goal.description || 'No further description provided'}
Department: ${goal.dept_name || 'Cross-department'}
Period: ${goal.period}
Target metric: ${goal.target_metric} = ${goal.target_value}

Available workers:
${workerList}

Decompose this goal into 3-5 concrete AOS tasks that workers can execute autonomously.
Each task should be specific, actionable, and measurable.

Return ONLY valid JSON in this exact format:
{
  "tasks": [
    {
      "title": "Task title (max 80 chars)",
      "description": "Detailed description of what the agent should research, analyze, or produce (min 100 chars)",
      "expected_output": "What should be produced",
      "priority": 7,
      "assigned_agent_id": <agent_id or null>
    }
  ]
}`;

    let tasks = [];
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { maxOutputTokens: 2048 },
      });
      const raw = sanitizeJSON(response.text || '');
      const f = raw.indexOf('{'), l = raw.lastIndexOf('}');
      if (f === -1) throw new Error('No JSON found in response');
      const parsed = JSON.parse(raw.slice(f, l + 1));
      tasks = parsed.tasks || [];
    } catch (err) {
      console.error('[OrgEngine] Gemini decompose error:', err.message);
      // Fallback: 3 generic tasks
      tasks = [
        {
          title: `Research: ${goal.title}`,
          description: `Conduct comprehensive research and analysis for the goal: "${goal.title}". Identify key opportunities, constraints, and actionable insights. Document findings with specific recommendations.`,
          expected_output: 'Research report with findings and recommendations',
          priority: 8,
          assigned_agent_id: workers[0]?.agent_id || null,
        },
        {
          title: `Strategy: ${goal.title}`,
          description: `Develop a detailed execution strategy for: "${goal.title}". Define milestones, success metrics, resource requirements, and risk mitigation plans. Provide a timeline.`,
          expected_output: 'Strategic plan document',
          priority: 7,
          assigned_agent_id: workers[1]?.agent_id || null,
        },
        {
          title: `Implement: ${goal.title}`,
          description: `Execute and implement the key deliverables for: "${goal.title}". Produce the primary work product: analysis, content, code, or service plan as appropriate for this organization type.`,
          expected_output: 'Primary deliverable',
          priority: 6,
          assigned_agent_id: workers[2]?.agent_id || null,
        },
      ];
    }

    // Create AOS tasks in DB
    const createdTaskIds = [];
    for (const t of tasks) {
      const agentId = t.assigned_agent_id && workers.find(w => w.agent_id === t.assigned_agent_id)
        ? t.assigned_agent_id : null;
      const { rows: [task] } = await this.pool.query(
        `INSERT INTO aos_tasks
           (title, description, expected_output, assigned_agent_id, priority,
            status, next_run_at, input, depends_on)
         VALUES ($1,$2,$3,$4,$5,'pending',NOW(),$6,'[]') RETURNING id`,
        [
          t.title.slice(0, 200),
          t.description,
          t.expected_output || '',
          agentId,
          t.priority || 5,
          JSON.stringify({ org_id: goal.org_id, goal_id: goalId }),
        ]
      );
      createdTaskIds.push(task.id);
    }

    // Update goal with task IDs
    await this.pool.query(
      `UPDATE organization_goals
       SET task_ids=task_ids||$1::jsonb, status='active', updated_at=NOW()
       WHERE id=$2`,
      [JSON.stringify(createdTaskIds), goalId]
    );

    return { goal_id: goalId, tasks_created: createdTaskIds.length, task_ids: createdTaskIds };
  }

  // ── Task Expense Tracking (called from org hook) ───────────────────────────────

  async onTaskComplete(taskId, agentId, resourceValue) {
    try {
      // Find agent's org role
      const { rows: [role] } = await this.pool.query(
        'SELECT * FROM agent_roles WHERE agent_id=$1', [agentId]
      );
      if (!role) return; // Agent not in any org

      const salary = SALARY_BY_LEVEL[role.level] || 30;
      const revenue = resourceValue ? Math.round(parseFloat(resourceValue) * ORG_REVENUE_RATE * 100) / 100 : 0;
      const period = currentPeriod();

      // Deduct salary from dept budget
      if (role.dept_id) {
        await this.pool.query(
          `UPDATE departments SET budget_spent=budget_spent+$1 WHERE id=$2`,
          [salary, role.dept_id]
        );
        await this.pool.query(
          `UPDATE organization_budgets SET spent=spent+$1, updated_at=NOW()
           WHERE org_id=$2 AND dept_id=$3 AND period=$4`,
          [salary, role.org_id, role.dept_id, period]
        );
      }

      // Update org treasury: deduct salary, add revenue share
      await this.pool.query(
        `UPDATE org_companies
         SET treasury=treasury-$1+$2, updated_at=NOW()
         WHERE id=$3`,
        [salary, revenue, role.org_id]
      );

      // Update goal progress if this task is in a goal
      const { rows: [task] } = await this.pool.query(
        `SELECT input FROM aos_tasks WHERE id=$1`, [taskId]
      );
      if (task?.input?.goal_id) {
        await this.pool.query(
          `UPDATE organization_goals
           SET current_value=current_value+1, updated_at=NOW()
           WHERE id=$1`,
          [task.input.goal_id]
        );
        // Check if goal target reached
        await this.pool.query(
          `UPDATE organization_goals
           SET status='completed', updated_at=NOW()
           WHERE id=$1 AND current_value>=target_value AND status='active'`,
          [task.input.goal_id]
        );
      }

    } catch (err) {
      console.error('[OrgEngine] onTaskComplete error:', err.message);
    }
  }

  // ── Metrics Snapshot ──────────────────────────────────────────────────────────

  async snapshotMetrics(orgId) {
    const period = currentPeriod();

    // Query budget data
    const { rows: [budgets] } = await this.pool.query(`
      SELECT COALESCE(SUM(spent),0) AS total_expenses
      FROM organization_budgets WHERE org_id=$1 AND period=$2
    `, [orgId, period]);

    const { rows: [team] } = await this.pool.query(`
      SELECT COUNT(*)::int AS active_agents FROM agent_roles WHERE org_id=$1
    `, [orgId]);

    const { rows: [taskStats] } = await this.pool.query(`
      SELECT COUNT(*)::int AS completed_tasks
      FROM aos_tasks t
      JOIN agent_roles ar ON ar.agent_id=t.assigned_agent_id AND ar.org_id=$1
      WHERE t.status='completed'
        AND t.updated_at >= DATE_TRUNC('quarter', NOW())
    `, [orgId]);

    const { rows: [org] } = await this.pool.query(
      'SELECT treasury FROM org_companies WHERE id=$1', [orgId]
    );

    const expenses   = parseFloat(budgets?.total_expenses || 0);
    const revenue    = expenses * 1.3; // approximate revenue from resource creation
    const profit     = revenue - expenses;
    const burnRate   = expenses / 90; // per day approx (quarterly)
    const activeCnt  = team?.active_agents || 0;
    const doneTasks  = taskStats?.completed_tasks || 0;

    const { rows: [snap] } = await this.pool.query(
      `INSERT INTO organization_metrics
         (org_id, period, revenue, expenses, profit, burn_rate, active_agents, completed_tasks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [orgId, period, revenue, expenses, profit, burnRate, activeCnt, doneTasks]
    );

    return snap;
  }

  async getMetrics(orgId) {
    const { rows } = await this.pool.query(
      'SELECT * FROM organization_metrics WHERE org_id=$1 ORDER BY snapshotted_at DESC LIMIT 30',
      [orgId]
    );
    const latest = rows[0] || null;

    // Also query live goals
    const { rows: goals } = await this.pool.query(
      `SELECT status, COUNT(*)::int AS cnt FROM organization_goals
       WHERE org_id=$1 GROUP BY status`, [orgId]
    );
    const goalMap = {};
    goals.forEach(g => { goalMap[g.status] = g.cnt; });

    return { latest, history: rows, goals: goalMap };
  }
}

// ─── REST API ──────────────────────────────────────────────────────────────────
function registerOrgRoutes(app, pool) {
  const engine = new OrganizationEngine(pool);

  // ── Organizations CRUD ───────────────────────────────────────────────────────

  // POST /api/org — create organization
  app.post('/api/org', async (req, res) => {
    const { name, type, description, treasury, created_by } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    try {
      const result = await engine.createOrganization({
        name, type, description,
        treasury: treasury ? parseFloat(treasury) : 100000,
        createdBy: created_by || req.user?.id?.toString() || null,
      });
      res.status(201).json({ success: true, ...result });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // GET /api/org — list all organizations
  app.get('/api/org', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT o.*,
          COUNT(DISTINCT ar.agent_id)::int  AS agent_count,
          COUNT(DISTINCT d.id)::int          AS dept_count,
          COUNT(DISTINCT g.id)::int          AS goal_count,
          COUNT(DISTINCT g.id) FILTER (WHERE g.status='active')::int AS active_goals
        FROM org_companies o
        LEFT JOIN agent_roles ar ON ar.org_id=o.id
        LEFT JOIN departments  d  ON d.org_id=o.id
        LEFT JOIN organization_goals g ON g.org_id=o.id
        GROUP BY o.id ORDER BY o.created_at DESC
      `);
      res.json({ organizations: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/org/:id — org detail
  app.get('/api/org/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [orgR, deptR, teamR, goalR] = await Promise.all([
        pool.query('SELECT * FROM org_companies WHERE id=$1', [id]),
        pool.query('SELECT * FROM departments WHERE org_id=$1 ORDER BY name', [id]),
        engine.getTeam(id),
        pool.query(
          'SELECT * FROM organization_goals WHERE org_id=$1 ORDER BY priority DESC, created_at DESC LIMIT 10',
          [id]
        ),
      ]);
      if (!orgR.rows[0]) return res.status(404).json({ error: 'Organization not found' });
      res.json({
        org: orgR.rows[0],
        departments: deptR.rows,
        team: teamR,
        goals: goalR.rows,
      });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // PATCH /api/org/:id — update org
  app.patch('/api/org/:id', async (req, res) => {
    try {
      const fields = ['name', 'description', 'status'];
      const updates = [], values = [];
      let i = 1;
      for (const f of fields) {
        if (req.body[f] !== undefined) { updates.push(`${f}=$${i++}`); values.push(req.body[f]); }
      }
      if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
      values.push(parseInt(req.params.id));
      const { rows: [org] } = await pool.query(
        `UPDATE org_companies SET ${updates.join(',')}, updated_at=NOW() WHERE id=$${i} RETURNING *`,
        values
      );
      res.json({ success: true, org });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // DELETE /api/org/:id
  app.delete('/api/org/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM org_companies WHERE id=$1', [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Departments ───────────────────────────────────────────────────────────────

  // GET /api/org/:id/departments
  app.get('/api/org/:id/departments', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT d.*,
          COUNT(ar.agent_id)::int AS agent_count
        FROM departments d
        LEFT JOIN agent_roles ar ON ar.dept_id=d.id
        WHERE d.org_id=$1 GROUP BY d.id ORDER BY d.name
      `, [req.params.id]);
      res.json({ departments: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/org/:id/departments — add custom department
  app.post('/api/org/:id/departments', async (req, res) => {
    const { name, type = 'operations' } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    try {
      const { rows: [d] } = await pool.query(
        `INSERT INTO departments (org_id, name, type) VALUES ($1,$2,$3) RETURNING *`,
        [parseInt(req.params.id), name, type]
      );
      res.status(201).json({ success: true, department: d });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Positions ─────────────────────────────────────────────────────────────────

  // GET /api/org/:id/positions
  app.get('/api/org/:id/positions', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT p.*, d.name AS dept_name,
          COUNT(ar.agent_id)::int AS filled_by
        FROM positions p
        LEFT JOIN departments d ON d.id=p.dept_id
        LEFT JOIN agent_roles ar ON ar.position_id=p.id
        WHERE p.org_id=$1 GROUP BY p.id, d.name ORDER BY
          CASE p.level WHEN 'ceo' THEN 1 WHEN 'manager' THEN 2 ELSE 3 END
      `, [req.params.id]);
      res.json({ positions: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/org/:id/positions — create custom position
  app.post('/api/org/:id/positions', async (req, res) => {
    const { title, level = 'worker', dept_id, salary_per_task } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    if (!['ceo', 'manager', 'worker'].includes(level)) {
      return res.status(400).json({ error: 'level must be ceo, manager, or worker' });
    }
    try {
      const { rows: [p] } = await pool.query(
        `INSERT INTO positions (org_id, dept_id, title, level, salary_per_task)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [parseInt(req.params.id), dept_id || null, title, level,
         salary_per_task || SALARY_BY_LEVEL[level]]
      );
      res.status(201).json({ success: true, position: p });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Team / Hiring ─────────────────────────────────────────────────────────────

  // GET /api/org/:id/team
  app.get('/api/org/:id/team', async (req, res) => {
    try {
      const team = await engine.getTeam(parseInt(req.params.id));
      res.json({ team });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/org/:id/hire
  app.post('/api/org/:id/hire', async (req, res) => {
    const { agent_id, dept_id, position_id, level = 'worker' } = req.body;
    if (!agent_id) return res.status(400).json({ error: 'agent_id required' });
    try {
      const role = await engine.hireAgent({
        orgId: parseInt(req.params.id),
        agentId: parseInt(agent_id),
        deptId: dept_id ? parseInt(dept_id) : null,
        positionId: position_id ? parseInt(position_id) : null,
        level,
      });
      res.json({ success: true, role });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // DELETE /api/org/:id/fire/:agentId
  app.delete('/api/org/:id/fire/:agentId', async (req, res) => {
    try {
      await engine.fireAgent(parseInt(req.params.id), parseInt(req.params.agentId));
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Budget ────────────────────────────────────────────────────────────────────

  // GET /api/org/:id/budget
  app.get('/api/org/:id/budget', async (req, res) => {
    try {
      const overview = await engine.getBudgetOverview(parseInt(req.params.id));
      res.json(overview);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/org/:id/budget/allocate
  app.post('/api/org/:id/budget/allocate', async (req, res) => {
    const { dept_id, amount, period } = req.body;
    if (!dept_id || !amount) return res.status(400).json({ error: 'dept_id and amount required' });
    try {
      const result = await engine.allocateBudget(
        parseInt(req.params.id), parseInt(dept_id),
        parseFloat(amount), period
      );
      res.json({ success: true, ...result });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // ── Goals ─────────────────────────────────────────────────────────────────────

  // GET /api/org/:id/goals
  app.get('/api/org/:id/goals', async (req, res) => {
    try {
      const { status, dept_id } = req.query;
      let q = `
        SELECT g.*, d.name AS dept_name, a.name AS creator_name
        FROM organization_goals g
        LEFT JOIN departments d ON d.id=g.dept_id
        LEFT JOIN aos_agents a ON a.id=g.created_by_agent
        WHERE g.org_id=$1
      `;
      const params = [req.params.id];
      if (status)  q += ` AND g.status=$${params.push(status)}`;
      if (dept_id) q += ` AND g.dept_id=$${params.push(parseInt(dept_id))}`;
      q += ' ORDER BY g.priority DESC, g.created_at DESC';
      const { rows } = await pool.query(q, params);
      res.json({ goals: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/org/goals/:goalId
  app.get('/api/org/goals/:goalId', async (req, res) => {
    try {
      const { rows: [goal] } = await pool.query(`
        SELECT g.*, o.name AS org_name, d.name AS dept_name, a.name AS creator_name
        FROM organization_goals g
        JOIN org_companies o ON o.id=g.org_id
        LEFT JOIN departments d ON d.id=g.dept_id
        LEFT JOIN aos_agents a ON a.id=g.created_by_agent
        WHERE g.id=$1
      `, [req.params.goalId]);
      if (!goal) return res.status(404).json({ error: 'Goal not found' });

      // Fetch associated tasks
      let tasks = [];
      if (goal.task_ids && goal.task_ids.length > 0) {
        const { rows: t } = await pool.query(
          `SELECT t.*, a.name AS agent_name FROM aos_tasks t
           LEFT JOIN aos_agents a ON a.id=t.assigned_agent_id
           WHERE t.id=ANY($1)`, [goal.task_ids]
        );
        tasks = t;
      }
      res.json({ goal, tasks });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/org/:id/goals — CEO/Manager creates goal
  app.post('/api/org/:id/goals', async (req, res) => {
    const { agent_id, dept_id, title, description, period, target_metric, target_value, priority } = req.body;
    if (!agent_id || !title) return res.status(400).json({ error: 'agent_id and title required' });
    try {
      const goal = await engine.createGoal({
        orgId: parseInt(req.params.id),
        agentId: parseInt(agent_id),
        deptId: dept_id ? parseInt(dept_id) : null,
        title, description, period, targetMetric: target_metric,
        targetValue: target_value ? parseFloat(target_value) : null,
        priority: priority ? parseInt(priority) : 5,
      });
      res.status(201).json({ success: true, goal });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // PATCH /api/org/goals/:goalId — update goal status/value
  app.patch('/api/org/goals/:goalId', async (req, res) => {
    try {
      const fields = ['title', 'description', 'status', 'priority', 'target_value', 'current_value'];
      const updates = [], values = [];
      let i = 1;
      for (const f of fields) {
        if (req.body[f] !== undefined) { updates.push(`${f}=$${i++}`); values.push(req.body[f]); }
      }
      if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
      values.push(parseInt(req.params.goalId));
      const { rows: [goal] } = await pool.query(
        `UPDATE organization_goals SET ${updates.join(',')}, updated_at=NOW() WHERE id=$${i} RETURNING *`,
        values
      );
      res.json({ success: true, goal });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/org/goals/:goalId/decompose — Manager decomposes goal into tasks
  app.post('/api/org/goals/:goalId/decompose', async (req, res) => {
    const { manager_agent_id } = req.body;
    if (!manager_agent_id) return res.status(400).json({ error: 'manager_agent_id required' });
    try {
      const result = await engine.decomposeGoal(
        parseInt(req.params.goalId), parseInt(manager_agent_id)
      );
      res.json({ success: true, ...result });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // ── Metrics ───────────────────────────────────────────────────────────────────

  // GET /api/org/:id/metrics
  app.get('/api/org/:id/metrics', async (req, res) => {
    try {
      const data = await engine.getMetrics(parseInt(req.params.id));
      res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/org/:id/metrics/snapshot
  app.post('/api/org/:id/metrics/snapshot', async (req, res) => {
    try {
      const snap = await engine.snapshotMetrics(parseInt(req.params.id));
      res.json({ success: true, snapshot: snap });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Demo: Full AI Company Setup ───────────────────────────────────────────────
  app.post('/api/org/demo', async (req, res) => {
    const {
      org_type = 'software_company',
      org_name = 'NovaTech AI',
      ceo_agent_id, manager_agent_id, worker_agent_ids = []
    } = req.body;
    if (!ceo_agent_id) return res.status(400).json({ error: 'ceo_agent_id required' });
    if (!manager_agent_id) return res.status(400).json({ error: 'manager_agent_id required' });

    try {
      // 1. Create organization
      const { org, departments, positions } = await engine.createOrganization({
        name: org_name, type: org_type,
        description: `An autonomous AI ${org_type.replace('_', ' ')} powered by Vương Đế AI agents`,
        treasury: 200000,
      });

      // 2. Find CEO position, Manager position, Worker position
      const ceoPos = positions.find(p => p.level === 'ceo');
      const mgrPos = positions.find(p => p.level === 'manager');
      const wrkPos = positions.find(p => p.level === 'worker');

      // 3. Hire agents
      await engine.hireAgent({
        orgId: org.id, agentId: parseInt(ceo_agent_id),
        positionId: ceoPos?.id, level: 'ceo',
      });

      await engine.hireAgent({
        orgId: org.id, agentId: parseInt(manager_agent_id),
        deptId: departments[0]?.id, positionId: mgrPos?.id, level: 'manager',
      });

      const hiredWorkers = [];
      for (const wid of worker_agent_ids.slice(0, 3)) {
        const role = await engine.hireAgent({
          orgId: org.id, agentId: parseInt(wid),
          deptId: departments[1]?.id || departments[0]?.id,
          positionId: wrkPos?.id, level: 'worker',
        });
        hiredWorkers.push(role);
      }

      // 4. CEO creates strategic goal
      const goal = await engine.createGoal({
        orgId: org.id,
        agentId: parseInt(ceo_agent_id),
        deptId: departments[0]?.id || null,
        title: `Q3 2026: Launch Core Product for ${org_name}`,
        description: `Define, build, and ship the core product offering. Establish market positioning, develop the technical foundation, and acquire the first 10 enterprise clients. Target $500K ARR by end of quarter.`,
        period: currentPeriod(),
        targetMetric: 'tasks_completed',
        targetValue: 5,
        priority: 10,
      });

      // 5. Manager decomposes goal into AOS tasks
      const decomposition = await engine.decomposeGoal(goal.id, parseInt(manager_agent_id));

      // 6. Initial budget allocation
      const budgetResult = await engine.allocateBudget(
        org.id, departments[0]?.id || null, 5000, currentPeriod()
      );

      // 7. Take metrics snapshot
      const metrics = await engine.snapshotMetrics(org.id);

      res.json({
        success: true,
        scenario: `AI ${org_type.replace('_', ' ')} "${org_name}" created and fully operational`,
        org,
        departments,
        positions,
        team: {
          ceo: ceo_agent_id,
          manager: manager_agent_id,
          workers: worker_agent_ids,
        },
        goal,
        decomposition,
        budget: budgetResult,
        metrics,
      });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  console.log('✅ Organization Engine v1 API routes registered');
  return engine;
}

// ─── Org Scheduler ─────────────────────────────────────────────────────────────
// Runs every 30s. Responsibilities:
//   1. Auto-decompose active goals that have no tasks yet (via manager/CEO AI)
//   2. Pause orgs when treasury drops below minimum operating balance
//   3. Resume orgs when treasury is replenished
async function startOrgScheduler(pool) {
  const engine = new OrganizationEngine(pool);
  const INTERVAL_MS = 30000;

  const tick = async () => {
    try {
      const { rows: orgs } = await pool.query(
        'SELECT id, name, treasury, status FROM org_companies ORDER BY id'
      );

      for (const org of orgs) {
        const treasury = parseFloat(org.treasury);

        // ── 1. Treasury health: pause / resume ──────────────────────────────
        if (treasury < 50 && org.status !== 'paused') {
          await pool.query(
            `UPDATE org_companies SET status='paused', updated_at=NOW() WHERE id=$1`,
            [org.id]
          );
          console.log(`[OrgScheduler] Org #${org.id} "${org.name}" PAUSED — treasury=${treasury.toFixed(0)}`);
          continue;
        }
        if (treasury >= 500 && org.status === 'paused') {
          await pool.query(
            `UPDATE org_companies SET status='active', updated_at=NOW() WHERE id=$1`,
            [org.id]
          );
          console.log(`[OrgScheduler] Org #${org.id} "${org.name}" RESUMED — treasury=${treasury.toFixed(0)}`);
        }
        if (org.status === 'paused') continue; // still paused

        // ── 2. Auto-decompose goals that have no tasks yet ──────────────────
        const { rows: pendingGoals } = await pool.query(`
          SELECT g.*
          FROM organization_goals g
          WHERE g.org_id=$1
            AND g.status = 'active'
            AND (g.task_ids IS NULL
                 OR g.task_ids = '[]'::jsonb
                 OR jsonb_array_length(g.task_ids) = 0)
          LIMIT 3
        `, [org.id]);

        for (const goal of pendingGoals) {
          const { rows: leaders } = await pool.query(`
            SELECT agent_id, level FROM agent_roles
            WHERE org_id=$1 AND level IN ('manager','ceo')
            ORDER BY CASE level WHEN 'manager' THEN 1 ELSE 2 END
            LIMIT 1
          `, [org.id]);

          if (!leaders.length) continue;

          try {
            const result = await engine.decomposeGoal(goal.id, leaders[0].agent_id);
            console.log(
              `[OrgScheduler] Org #${org.id} goal #${goal.id}: ` +
              `auto-decomposed → ${result.tasks_created} tasks`
            );
          } catch (e) {
            console.error(`[OrgScheduler] Goal #${goal.id} decompose error:`, e.message);
          }
        }
      }
    } catch (e) {
      console.error('[OrgScheduler] tick error:', e.message);
    }
  };

  setInterval(tick, INTERVAL_MS);
  console.log(`[OrgScheduler] Started — treasury guard + auto-planning every ${INTERVAL_MS / 1000}s`);
}

module.exports = { initOrgTables, registerOrgRoutes, OrganizationEngine, startOrgScheduler };
