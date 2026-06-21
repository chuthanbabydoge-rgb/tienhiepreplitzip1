'use strict';
// ═══════════════════════════════════════════════════════════════════════════════
//  Agent Marketplace System — Vương Đế AI
//  Tables: organizations · organization_agents · agent_templates · template_installs
// ═══════════════════════════════════════════════════════════════════════════════

// ─── DB Schema ────────────────────────────────────────────────────────────────
async function initMarketplaceTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id              SERIAL PRIMARY KEY,
      owner_id        TEXT NOT NULL,
      name            TEXT NOT NULL,
      description     TEXT DEFAULT '',
      category        TEXT DEFAULT 'general',
      avatar_emoji    TEXT DEFAULT '🏢',
      plan            TEXT DEFAULT 'free',
      settings        JSONB DEFAULT '{}',
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS organization_agents (
      id                          SERIAL PRIMARY KEY,
      org_id                      INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
      agent_id                    INTEGER REFERENCES aos_agents(id) ON DELETE CASCADE,
      role_in_org                 TEXT DEFAULT 'worker',
      status                      TEXT DEFAULT 'active',
      installed_from_template_id  INTEGER,
      tasks_completed             INTEGER DEFAULT 0,
      tasks_failed                INTEGER DEFAULT 0,
      avg_response_ms             INTEGER DEFAULT 0,
      performance_score           FLOAT DEFAULT 0,
      last_active_at              TIMESTAMPTZ,
      created_at                  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(org_id, agent_id)
    );

    CREATE TABLE IF NOT EXISTS agent_templates (
      id              SERIAL PRIMARY KEY,
      creator_id      TEXT NOT NULL,
      org_id          INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
      name            TEXT NOT NULL,
      tagline         TEXT DEFAULT '',
      description     TEXT DEFAULT '',
      category        TEXT DEFAULT 'general',
      tags            TEXT[] DEFAULT '{}',
      agent_config    JSONB NOT NULL DEFAULT '{}',
      tools           TEXT[] DEFAULT '{}',
      workflow_config JSONB DEFAULT '{}',
      is_published    BOOLEAN DEFAULT false,
      is_featured     BOOLEAN DEFAULT false,
      price_type      TEXT DEFAULT 'free',
      price_credits   INTEGER DEFAULT 0,
      install_count   INTEGER DEFAULT 0,
      rating_avg      FLOAT DEFAULT 0,
      rating_count    INTEGER DEFAULT 0,
      version         TEXT DEFAULT '1.0.0',
      preview_tasks   JSONB DEFAULT '[]',
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS template_installs (
      id            SERIAL PRIMARY KEY,
      template_id   INTEGER REFERENCES agent_templates(id) ON DELETE CASCADE,
      installer_id  TEXT NOT NULL,
      org_id        INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
      agent_id      INTEGER REFERENCES aos_agents(id) ON DELETE SET NULL,
      rating        INTEGER,
      review        TEXT,
      status        TEXT DEFAULT 'active',
      installed_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_organizations_owner    ON organizations(owner_id);
    CREATE INDEX IF NOT EXISTS idx_org_agents_org         ON organization_agents(org_id);
    CREATE INDEX IF NOT EXISTS idx_templates_creator      ON agent_templates(creator_id);
    CREATE INDEX IF NOT EXISTS idx_templates_published    ON agent_templates(is_published) WHERE is_published = true;
    CREATE INDEX IF NOT EXISTS idx_installs_template      ON template_installs(template_id);
    CREATE INDEX IF NOT EXISTS idx_installs_installer     ON template_installs(installer_id);
  `);

  // Seed featured templates
  await seedFeaturedTemplates(pool);
  console.log('✅ Marketplace tables ready');
}

// ─── Seed featured templates ──────────────────────────────────────────────────
async function seedFeaturedTemplates(pool) {
  const { rows } = await pool.query('SELECT COUNT(*) FROM agent_templates');
  if (parseInt(rows[0].count) > 0) return;

  const templates = [
    {
      name: 'Marketing Content Strategist',
      tagline: 'AI chiến lược nội dung marketing đa kênh',
      description: 'Tạo chiến lược nội dung hoàn chỉnh cho mạng xã hội, blog và email marketing. Phân tích đối thủ, đề xuất chủ đề và lịch đăng bài.',
      category: 'marketing',
      tags: ['content', 'marketing', 'social-media', 'strategy'],
      agent_config: { name: 'Content Strategist', role: 'Chuyên gia chiến lược nội dung marketing kỹ thuật số', goal: 'Tạo ra chiến lược nội dung toàn diện giúp tăng trưởng thương hiệu và chuyển đổi khách hàng', backstory: '10 năm kinh nghiệm trong digital marketing, đã giúp 100+ thương hiệu tăng trưởng organic traffic 300%', model: 'gemini-2.5-flash', max_iterations: 8 },
      tools: ['web_search', 'summarize', 'memory_save', 'final_answer'],
      preview_tasks: [{ title: 'Lập kế hoạch content tháng 7', description: 'Tạo lịch content 30 ngày cho startup fintech' }],
    },
    {
      name: 'Startup Business Analyst',
      tagline: 'Phân tích thị trường và cơ hội kinh doanh cho startup',
      description: 'Phân tích thị trường, đánh giá cạnh tranh, xây dựng mô hình kinh doanh và đề xuất chiến lược go-to-market cho startup giai đoạn đầu.',
      category: 'startup',
      tags: ['startup', 'business', 'analysis', 'strategy', 'market-research'],
      agent_config: { name: 'Startup Analyst', role: 'Nhà phân tích kinh doanh chuyên về startup và đổi mới sáng tạo', goal: 'Giúp startup xác định cơ hội thị trường và xây dựng chiến lược tăng trưởng bền vững', backstory: 'Cố vấn cho 50+ startup tại Đông Nam Á, từng là Partner tại VC fund với portfolio 200M USD', model: 'gemini-2.5-flash', max_iterations: 10 },
      tools: ['web_search', 'calculate', 'summarize', 'memory_save', 'final_answer'],
      preview_tasks: [{ title: 'Phân tích thị trường EdTech Việt Nam', description: 'Báo cáo cơ hội, đối thủ và chiến lược gia nhập thị trường' }],
    },
    {
      name: 'Real Estate Market Scout',
      tagline: 'Tìm kiếm và phân tích cơ hội bất động sản',
      description: 'Phân tích xu hướng thị trường bất động sản, đánh giá tiềm năng khu vực, tính toán ROI đầu tư và đưa ra khuyến nghị mua/bán/thuê.',
      category: 'real_estate',
      tags: ['real-estate', 'investment', 'market-analysis', 'ROI'],
      agent_config: { name: 'Real Estate Scout', role: 'Chuyên gia phân tích và tư vấn đầu tư bất động sản', goal: 'Xác định cơ hội đầu tư bất động sản sinh lời cao với rủi ro được kiểm soát', backstory: '15 năm trong ngành BĐS, quản lý danh mục đầu tư 500 tỷ VND, chuyên gia định giá RICS', model: 'gemini-2.5-flash', max_iterations: 8 },
      tools: ['web_search', 'calculate', 'summarize', 'memory_save', 'final_answer'],
      preview_tasks: [{ title: 'Phân tích thị trường căn hộ TP.HCM Q2/2025', description: 'Báo cáo giá, xu hướng và cơ hội đầu tư' }],
    },
    {
      name: 'Online Course Designer',
      tagline: 'Thiết kế chương trình học trực tuyến chuyên nghiệp',
      description: 'Xây dựng chương trình học toàn diện: phân tích đối tượng học viên, thiết kế syllabus, tạo nội dung bài học và hệ thống đánh giá.',
      category: 'education',
      tags: ['education', 'e-learning', 'curriculum', 'course-design'],
      agent_config: { name: 'Course Designer', role: 'Chuyên gia thiết kế chương trình đào tạo trực tuyến', goal: 'Tạo ra các khóa học hấp dẫn và hiệu quả giúp học viên đạt được mục tiêu học tập', backstory: 'Instructional Designer với 12 năm kinh nghiệm, đã thiết kế 200+ khóa học cho Fortune 500 companies', model: 'gemini-2.5-flash', max_iterations: 8 },
      tools: ['web_search', 'summarize', 'memory_save', 'delegate', 'final_answer'],
      preview_tasks: [{ title: 'Thiết kế khóa học Python cho người mới bắt đầu', description: 'Syllabus 8 tuần với bài tập thực hành' }],
    },
    {
      name: 'Customer Support Specialist',
      tagline: 'Hỗ trợ khách hàng thông minh 24/7',
      description: 'Xử lý câu hỏi khách hàng, giải quyết khiếu nại, cung cấp thông tin sản phẩm/dịch vụ và escalate các vấn đề phức tạp một cách thông minh.',
      category: 'customer_service',
      tags: ['customer-service', 'support', 'CX', 'chatbot'],
      agent_config: { name: 'Support Specialist', role: 'Chuyên viên hỗ trợ khách hàng cao cấp', goal: 'Giải quyết 95% vấn đề khách hàng trong lần liên hệ đầu tiên với mức hài lòng cao nhất', backstory: 'Chuyên gia CX với nền tảng tâm lý học, đã xây dựng hệ thống support cho 3 unicorn startup', model: 'gemini-2.5-flash', max_iterations: 6 },
      tools: ['memory_recall', 'memory_save', 'summarize', 'ask_user', 'final_answer'],
      preview_tasks: [{ title: 'Xử lý khiếu nại đơn hàng bị chậm', description: 'Tư vấn khách hàng về tình trạng đơn và phương án bồi thường' }],
    },
    {
      name: 'Data Research Analyst',
      tagline: 'Nghiên cứu dữ liệu và báo cáo phân tích chuyên sâu',
      description: 'Thu thập dữ liệu, phân tích xu hướng, xây dựng báo cáo và đưa ra insight actionable cho các quyết định kinh doanh quan trọng.',
      category: 'research',
      tags: ['data', 'research', 'analytics', 'reporting', 'insights'],
      agent_config: { name: 'Data Analyst', role: 'Nhà phân tích dữ liệu và nghiên cứu thị trường', goal: 'Chuyển đổi dữ liệu thô thành insight chiến lược giúp tổ chức đưa ra quyết định dựa trên bằng chứng', backstory: 'PhD Kinh tế lượng, 8 năm tại Big 4 consulting, chuyên gia về phân tích dự báo và machine learning', model: 'gemini-2.5-flash', max_iterations: 10 },
      tools: ['web_search', 'calculate', 'summarize', 'memory_save', 'final_answer'],
      preview_tasks: [{ title: 'Phân tích xu hướng AI adoption Q1 2025', description: 'Báo cáo 10 trang với số liệu và dự báo' }],
    },
  ];

  for (const t of templates) {
    await pool.query(`
      INSERT INTO agent_templates (creator_id, name, tagline, description, category, tags, agent_config, tools, preview_tasks, is_published, is_featured, price_type)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,true,'free')
    `, ['system', t.name, t.tagline, t.description, t.category, t.tags, JSON.stringify(t.agent_config), t.tools, JSON.stringify(t.preview_tasks)]);
  }
}

// ─── Helper ────────────────────────────────────────────────────────────────────
function requireAuthAPI(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// ─── Routes ───────────────────────────────────────────────────────────────────
function registerMarketplaceRoutes(app, pool) {

  // ════════════════════════════════════════════
  //  ORGANIZATIONS
  // ════════════════════════════════════════════

  // List my organizations
  app.get('/api/mkt/organizations', requireAuthAPI, async (req, res) => {
    try {
      const userId = String(req.user.id);
      const { rows } = await pool.query(`
        SELECT o.*,
          COUNT(DISTINCT oa.id)::int AS agent_count,
          COUNT(DISTINCT ti.id)::int AS template_count
        FROM organizations o
        LEFT JOIN organization_agents oa ON oa.org_id = o.id AND oa.status = 'active'
        LEFT JOIN template_installs   ti ON ti.org_id = o.id
        WHERE o.owner_id = $1
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `, [userId]);
      res.json({ organizations: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Create organization
  app.post('/api/mkt/organizations', requireAuthAPI, async (req, res) => {
    try {
      const userId = String(req.user.id);
      const { name, description = '', category = 'general', avatar_emoji = '🏢' } = req.body;
      if (!name?.trim()) return res.status(400).json({ error: 'name required' });
      const { rows } = await pool.query(`
        INSERT INTO organizations (owner_id, name, description, category, avatar_emoji)
        VALUES ($1,$2,$3,$4,$5) RETURNING *
      `, [userId, name.trim(), description, category, avatar_emoji]);
      res.json({ organization: rows[0] });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Get organization + metrics
  app.get('/api/mkt/organizations/:id', requireAuthAPI, async (req, res) => {
    try {
      const userId = String(req.user.id);
      const { rows } = await pool.query(`
        SELECT o.*,
          COUNT(DISTINCT oa.id)::int   AS agent_count,
          COUNT(DISTINCT ti.id)::int   AS template_count,
          COALESCE(SUM(oa.tasks_completed),0)::int AS total_tasks_done,
          COALESCE(SUM(oa.tasks_failed),0)::int    AS total_tasks_failed
        FROM organizations o
        LEFT JOIN organization_agents oa ON oa.org_id = o.id
        LEFT JOIN template_installs   ti ON ti.org_id = o.id
        WHERE o.id = $1 AND o.owner_id = $2
        GROUP BY o.id
      `, [req.params.id, userId]);
      if (!rows[0]) return res.status(404).json({ error: 'Not found' });
      res.json({ organization: rows[0] });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Update organization
  app.put('/api/mkt/organizations/:id', requireAuthAPI, async (req, res) => {
    try {
      const userId = String(req.user.id);
      const { name, description, category, avatar_emoji } = req.body;
      const { rows } = await pool.query(`
        UPDATE organizations SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          category = COALESCE($3, category),
          avatar_emoji = COALESCE($4, avatar_emoji),
          updated_at = NOW()
        WHERE id = $5 AND owner_id = $6 RETURNING *
      `, [name, description, category, avatar_emoji, req.params.id, userId]);
      if (!rows[0]) return res.status(404).json({ error: 'Not found' });
      res.json({ organization: rows[0] });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Delete organization
  app.delete('/api/mkt/organizations/:id', requireAuthAPI, async (req, res) => {
    try {
      const userId = String(req.user.id);
      await pool.query('DELETE FROM organizations WHERE id=$1 AND owner_id=$2', [req.params.id, userId]);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ─── Org Dashboard metrics ────────────────────────────────────────────────
  app.get('/api/mkt/organizations/:id/dashboard', requireAuthAPI, async (req, res) => {
    try {
      const userId = String(req.user.id);
      const orgId = req.params.id;

      // Verify ownership
      const own = await pool.query('SELECT id FROM organizations WHERE id=$1 AND owner_id=$2', [orgId, userId]);
      if (!own.rows[0]) return res.status(404).json({ error: 'Not found' });

      // Agents in org with their stats
      const { rows: agentRows } = await pool.query(`
        SELECT oa.*, a.name AS agent_name, a.role AS agent_role, a.status AS agent_status,
          a.model, at2.title AS current_task
        FROM organization_agents oa
        JOIN aos_agents a ON a.id = oa.agent_id
        LEFT JOIN (
          SELECT assigned_agent_id, title FROM aos_tasks
          WHERE status IN ('pending','running')
          ORDER BY priority DESC LIMIT 1
        ) at2 ON at2.assigned_agent_id = oa.agent_id
        WHERE oa.org_id = $1 AND oa.status = 'active'
        ORDER BY oa.performance_score DESC
      `, [orgId]);

      // Recent executions for org agents
      const agentIds = agentRows.map(r => r.agent_id);
      let execRows = [];
      if (agentIds.length) {
        const r = await pool.query(`
          SELECT ae.*, a.name AS agent_name, t.title AS task_title
          FROM aos_task_executions ae
          JOIN aos_agents a ON a.id = ae.agent_id
          JOIN aos_tasks t ON t.id = ae.task_id
          WHERE ae.agent_id = ANY($1::int[])
          ORDER BY ae.started_at DESC LIMIT 10
        `, [agentIds]);
        execRows = r.rows;
      }

      // Task status distribution
      let taskStats = { pending: 0, running: 0, completed: 0, failed: 0 };
      if (agentIds.length) {
        const ts = await pool.query(`
          SELECT status, COUNT(*)::int AS cnt FROM aos_tasks
          WHERE assigned_agent_id = ANY($1::int[])
          GROUP BY status
        `, [agentIds]);
        ts.rows.forEach(r => { taskStats[r.status] = r.cnt; });
      }

      // Workflow status for org agents
      let workflowRows = [];
      try {
        const wr = await pool.query(`
          SELECT we.*, w.name AS workflow_name
          FROM wf_executions we
          JOIN wf_workflows w ON w.id = we.workflow_id
          ORDER BY we.started_at DESC LIMIT 5
        `);
        workflowRows = wr.rows;
      } catch {}

      res.json({
        agents: agentRows,
        recent_executions: execRows,
        task_stats: taskStats,
        workflows: workflowRows,
      });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ─── Org Agents ────────────────────────────────────────────────────────────

  // Add agent to org
  app.post('/api/mkt/organizations/:id/agents', requireAuthAPI, async (req, res) => {
    try {
      const userId = String(req.user.id);
      const orgId = req.params.id;
      const { agent_id, role_in_org = 'worker' } = req.body;
      const own = await pool.query('SELECT id FROM organizations WHERE id=$1 AND owner_id=$2', [orgId, userId]);
      if (!own.rows[0]) return res.status(403).json({ error: 'Forbidden' });
      const { rows } = await pool.query(`
        INSERT INTO organization_agents (org_id, agent_id, role_in_org)
        VALUES ($1,$2,$3) ON CONFLICT (org_id,agent_id) DO UPDATE SET role_in_org=$3, status='active'
        RETURNING *
      `, [orgId, agent_id, role_in_org]);
      res.json({ org_agent: rows[0] });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // List org agents
  app.get('/api/mkt/organizations/:id/agents', requireAuthAPI, async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT oa.*, a.name, a.role, a.goal, a.model, a.status AS agent_status
        FROM organization_agents oa
        JOIN aos_agents a ON a.id = oa.agent_id
        WHERE oa.org_id = $1 AND oa.status = 'active'
        ORDER BY oa.role_in_org, oa.performance_score DESC
      `, [req.params.id]);
      res.json({ agents: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Remove agent from org
  app.delete('/api/mkt/organizations/:id/agents/:agentId', requireAuthAPI, async (req, res) => {
    try {
      const userId = String(req.user.id);
      const own = await pool.query('SELECT id FROM organizations WHERE id=$1 AND owner_id=$2', [req.params.id, userId]);
      if (!own.rows[0]) return res.status(403).json({ error: 'Forbidden' });
      await pool.query('UPDATE organization_agents SET status=$1 WHERE org_id=$2 AND agent_id=$3', ['removed', req.params.id, req.params.agentId]);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Update org agent performance (called after task execution)
  app.patch('/api/mkt/organizations/agents/:orgAgentId/performance', requireAuthAPI, async (req, res) => {
    try {
      const { tasks_completed, tasks_failed, response_ms } = req.body;
      await pool.query(`
        UPDATE organization_agents SET
          tasks_completed = tasks_completed + COALESCE($1,0),
          tasks_failed    = tasks_failed    + COALESCE($2,0),
          avg_response_ms = CASE WHEN avg_response_ms = 0 THEN COALESCE($3,0)
                            ELSE (avg_response_ms + COALESCE($3,0)) / 2 END,
          performance_score = CASE
            WHEN (tasks_completed + COALESCE($1,0) + tasks_failed + COALESCE($2,0)) = 0 THEN 0
            ELSE ROUND((tasks_completed + COALESCE($1,0))::numeric /
                       (tasks_completed + COALESCE($1,0) + tasks_failed + COALESCE($2,0)) * 100, 1)
          END,
          last_active_at = NOW()
        WHERE id = $4
      `, [tasks_completed, tasks_failed, response_ms, req.params.orgAgentId]);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ════════════════════════════════════════════
  //  TEMPLATES (My templates)
  // ════════════════════════════════════════════

  // Create template
  app.post('/api/mkt/templates', requireAuthAPI, async (req, res) => {
    try {
      const userId = String(req.user.id);
      const { name, tagline='', description='', category='general', tags=[], agent_config, tools=[], workflow_config={}, preview_tasks=[], org_id } = req.body;
      if (!name?.trim()) return res.status(400).json({ error: 'name required' });
      if (!agent_config?.role) return res.status(400).json({ error: 'agent_config.role required' });
      const { rows } = await pool.query(`
        INSERT INTO agent_templates
          (creator_id, org_id, name, tagline, description, category, tags, agent_config, tools, workflow_config, preview_tasks)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
      `, [userId, org_id||null, name.trim(), tagline, description, category, tags, JSON.stringify(agent_config), tools, JSON.stringify(workflow_config), JSON.stringify(preview_tasks)]);
      res.json({ template: rows[0] });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // List my templates
  app.get('/api/mkt/templates', requireAuthAPI, async (req, res) => {
    try {
      const userId = String(req.user.id);
      const { rows } = await pool.query(`
        SELECT t.*,
          COUNT(DISTINCT ti.id)::int AS total_installs
        FROM agent_templates t
        LEFT JOIN template_installs ti ON ti.template_id = t.id
        WHERE t.creator_id = $1
        GROUP BY t.id
        ORDER BY t.created_at DESC
      `, [userId]);
      res.json({ templates: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Get template detail
  app.get('/api/mkt/templates/:id', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT t.*,
          COUNT(DISTINCT ti.id)::int AS total_installs
        FROM agent_templates t
        LEFT JOIN template_installs ti ON ti.template_id = t.id
        WHERE t.id = $1
        GROUP BY t.id
      `, [req.params.id]);
      if (!rows[0]) return res.status(404).json({ error: 'Not found' });
      res.json({ template: rows[0] });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Update template
  app.put('/api/mkt/templates/:id', requireAuthAPI, async (req, res) => {
    try {
      const userId = String(req.user.id);
      const { name, tagline, description, category, tags, agent_config, tools, workflow_config, preview_tasks } = req.body;
      const { rows } = await pool.query(`
        UPDATE agent_templates SET
          name            = COALESCE($1, name),
          tagline         = COALESCE($2, tagline),
          description     = COALESCE($3, description),
          category        = COALESCE($4, category),
          tags            = COALESCE($5, tags),
          agent_config    = COALESCE($6, agent_config),
          tools           = COALESCE($7, tools),
          workflow_config = COALESCE($8, workflow_config),
          preview_tasks   = COALESCE($9, preview_tasks),
          updated_at      = NOW()
        WHERE id = $10 AND creator_id = $11 RETURNING *
      `, [name, tagline, description, category, tags, agent_config ? JSON.stringify(agent_config) : null,
          tools, workflow_config ? JSON.stringify(workflow_config) : null, preview_tasks ? JSON.stringify(preview_tasks) : null,
          req.params.id, userId]);
      if (!rows[0]) return res.status(404).json({ error: 'Not found or not owner' });
      res.json({ template: rows[0] });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Delete template
  app.delete('/api/mkt/templates/:id', requireAuthAPI, async (req, res) => {
    try {
      const userId = String(req.user.id);
      await pool.query('DELETE FROM agent_templates WHERE id=$1 AND creator_id=$2', [req.params.id, userId]);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Publish / unpublish
  app.post('/api/mkt/templates/:id/publish', requireAuthAPI, async (req, res) => {
    try {
      const userId = String(req.user.id);
      const { publish = true } = req.body;
      const { rows } = await pool.query(
        'UPDATE agent_templates SET is_published=$1, updated_at=NOW() WHERE id=$2 AND creator_id=$3 RETURNING *',
        [publish, req.params.id, userId]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Not found or not owner' });
      res.json({ template: rows[0] });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ════════════════════════════════════════════
  //  MARKETPLACE (Public browsing + install)
  // ════════════════════════════════════════════

  // Browse marketplace
  app.get('/api/mkt/marketplace', async (req, res) => {
    try {
      const { category, q, sort = 'featured', limit = 20, offset = 0 } = req.query;
      let where = ['t.is_published = true'];
      const params = [];

      if (category && category !== 'all') {
        params.push(category);
        where.push(`t.category = $${params.length}`);
      }
      if (q) {
        params.push(`%${q}%`);
        where.push(`(t.name ILIKE $${params.length} OR t.description ILIKE $${params.length} OR t.tagline ILIKE $${params.length})`);
      }

      const orderMap = {
        featured:  't.is_featured DESC, t.install_count DESC',
        popular:   't.install_count DESC',
        newest:    't.created_at DESC',
        rating:    't.rating_avg DESC, t.rating_count DESC',
      };
      const orderBy = orderMap[sort] || orderMap.featured;

      params.push(parseInt(limit)); params.push(parseInt(offset));

      const { rows } = await pool.query(`
        SELECT t.id, t.name, t.tagline, t.description, t.category, t.tags,
          t.is_featured, t.price_type, t.price_credits,
          t.install_count, t.rating_avg, t.rating_count,
          t.tools, t.preview_tasks, t.version, t.created_at,
          t.agent_config->>'role' AS agent_role
        FROM agent_templates t
        WHERE ${where.join(' AND ')}
        ORDER BY ${orderBy}
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `, params);

      // Total count
      const countParams = params.slice(0, -2);
      const { rows: cRows } = await pool.query(
        `SELECT COUNT(*)::int AS total FROM agent_templates t WHERE ${where.join(' AND ')}`,
        countParams
      );

      res.json({ templates: rows, total: cRows[0]?.total || 0 });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Install template — creates an AOS agent from template
  app.post('/api/mkt/marketplace/:id/install', requireAuthAPI, async (req, res) => {
    try {
      const userId = String(req.user.id);
      const { org_id } = req.body;
      const templateId = req.params.id;

      // Get template
      const { rows: tRows } = await pool.query('SELECT * FROM agent_templates WHERE id=$1 AND is_published=true', [templateId]);
      if (!tRows[0]) return res.status(404).json({ error: 'Template not found or not published' });
      const tmpl = tRows[0];

      // Check if already installed by this user
      const existing = await pool.query(
        'SELECT id, agent_id FROM template_installs WHERE template_id=$1 AND installer_id=$2 AND status=$3',
        [templateId, userId, 'active']
      );
      if (existing.rows[0]) {
        return res.json({ already_installed: true, install: existing.rows[0] });
      }

      // Create AOS agent from template config
      const cfg = tmpl.agent_config;
      const agentName = cfg.name || tmpl.name;
      const { rows: agentRows } = await pool.query(`
        INSERT INTO aos_agents (name, role, goal, backstory, model, tools, max_iterations, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'idle') RETURNING *
      `, [
        agentName, cfg.role || '', cfg.goal || '', cfg.backstory || '',
        cfg.model || 'gemini-2.5-flash', tmpl.tools, cfg.max_iterations || 6
      ]);
      const agent = agentRows[0];

      // Record install
      const { rows: installRows } = await pool.query(`
        INSERT INTO template_installs (template_id, installer_id, org_id, agent_id)
        VALUES ($1,$2,$3,$4) RETURNING *
      `, [templateId, userId, org_id || null, agent.id]);

      // Add to org if specified
      if (org_id) {
        await pool.query(`
          INSERT INTO organization_agents (org_id, agent_id, installed_from_template_id)
          VALUES ($1,$2,$3) ON CONFLICT (org_id, agent_id) DO NOTHING
        `, [org_id, agent.id, templateId]);
      }

      // Increment install count
      await pool.query('UPDATE agent_templates SET install_count = install_count + 1 WHERE id=$1', [templateId]);

      res.json({ install: installRows[0], agent });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Rate a template (after install)
  app.post('/api/mkt/marketplace/:id/rate', requireAuthAPI, async (req, res) => {
    try {
      const userId = String(req.user.id);
      const { rating, review = '' } = req.body;
      if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'rating must be 1-5' });

      // Must have installed
      const inst = await pool.query('SELECT id FROM template_installs WHERE template_id=$1 AND installer_id=$2', [req.params.id, userId]);
      if (!inst.rows[0]) return res.status(403).json({ error: 'Must install before rating' });

      await pool.query('UPDATE template_installs SET rating=$1, review=$2 WHERE template_id=$3 AND installer_id=$4', [rating, review, req.params.id, userId]);

      // Recalculate avg
      await pool.query(`
        UPDATE agent_templates SET
          rating_avg   = (SELECT AVG(rating) FROM template_installs WHERE template_id=$1 AND rating IS NOT NULL),
          rating_count = (SELECT COUNT(*) FROM template_installs WHERE template_id=$1 AND rating IS NOT NULL)
        WHERE id = $1
      `, [req.params.id]);

      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ─── My installs ──────────────────────────────────────────────────────────
  app.get('/api/mkt/my-installs', requireAuthAPI, async (req, res) => {
    try {
      const userId = String(req.user.id);
      const { rows } = await pool.query(`
        SELECT ti.*, t.name AS template_name, t.category, t.tagline,
          a.name AS agent_name, a.status AS agent_status
        FROM template_installs ti
        JOIN agent_templates t ON t.id = ti.template_id
        LEFT JOIN aos_agents a ON a.id = ti.agent_id
        WHERE ti.installer_id = $1 AND ti.status = 'active'
        ORDER BY ti.installed_at DESC
      `, [userId]);
      res.json({ installs: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ─── Marketplace stats ────────────────────────────────────────────────────
  app.get('/api/mkt/stats', async (req, res) => {
    try {
      const [templates, orgs, installs, categories] = await Promise.all([
        pool.query('SELECT COUNT(*)::int AS total FROM agent_templates WHERE is_published=true'),
        pool.query('SELECT COUNT(*)::int AS total FROM organizations'),
        pool.query('SELECT COUNT(*)::int AS total FROM template_installs'),
        pool.query(`SELECT category, COUNT(*)::int AS cnt FROM agent_templates WHERE is_published=true GROUP BY category ORDER BY cnt DESC`),
      ]);
      res.json({
        total_templates: templates.rows[0].total,
        total_organizations: orgs.rows[0].total,
        total_installs: installs.rows[0].total,
        categories: categories.rows,
      });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
}

module.exports = { initMarketplaceTables, registerMarketplaceRoutes };
