'use strict';
/**
 * ╔══════════════════════════════════════════════════════════════════╗
 *  VƯƠNG ĐẾ AI — Agent Economy v1
 *  Wallet · Resources · Market · Transactions · Metrics
 * ╠══════════════════════════════════════════════════════════════════╣
 *  Tables:
 *    agent_wallets          — per-agent balances
 *    organization_treasury  — org fund (receives market fees)
 *    resources              — outputs produced by agents
 *    resource_market        — listings for sale
 *    economy_transactions   — full audit trail
 *    agent_economy_metrics  — revenue / cost / profit / ROI
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// ─── DB Setup ──────────────────────────────────────────────────────────────────
async function initEconomyTables(pool) {
  await pool.query(`
    -- ── Wallets ──────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS agent_wallets (
      id            SERIAL PRIMARY KEY,
      agent_id      INT UNIQUE REFERENCES aos_agents(id) ON DELETE CASCADE,
      balance       NUMERIC(18,4) NOT NULL DEFAULT 1000.0000,
      total_earned  NUMERIC(18,4) NOT NULL DEFAULT 0,
      total_spent   NUMERIC(18,4) NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    );

    -- ── Organization Treasury ────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS organization_treasury (
      id            INT PRIMARY KEY DEFAULT 1,
      balance       NUMERIC(18,4) NOT NULL DEFAULT 100000.0000,
      total_inflow  NUMERIC(18,4) NOT NULL DEFAULT 0,
      total_outflow NUMERIC(18,4) NOT NULL DEFAULT 0,
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    );

    -- ── Resources ────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS resources (
      id               SERIAL PRIMARY KEY,
      title            TEXT NOT NULL,
      type             TEXT NOT NULL DEFAULT 'knowledge',
      creator_agent_id INT REFERENCES aos_agents(id) ON DELETE SET NULL,
      task_id          INT REFERENCES aos_tasks(id) ON DELETE SET NULL,
      quality_score    NUMERIC(5,2) NOT NULL DEFAULT 0,
      value            NUMERIC(18,4) NOT NULL DEFAULT 0,
      content          TEXT,
      status           TEXT NOT NULL DEFAULT 'available',
      created_at       TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_resources_creator ON resources(creator_agent_id);
    CREATE INDEX IF NOT EXISTS idx_resources_status  ON resources(status);

    -- ── Resource Market ───────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS resource_market (
      id              SERIAL PRIMARY KEY,
      resource_id     INT UNIQUE REFERENCES resources(id) ON DELETE CASCADE,
      seller_agent_id INT REFERENCES aos_agents(id) ON DELETE SET NULL,
      ask_price       NUMERIC(18,4) NOT NULL,
      listed_at       TIMESTAMPTZ DEFAULT NOW(),
      sold_at         TIMESTAMPTZ,
      buyer_agent_id  INT REFERENCES aos_agents(id) ON DELETE SET NULL,
      status          TEXT NOT NULL DEFAULT 'listed'
    );
    CREATE INDEX IF NOT EXISTS idx_market_status ON resource_market(status);

    -- ── Economy Transactions ──────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS economy_transactions (
      id             SERIAL PRIMARY KEY,
      type           TEXT NOT NULL,
      from_agent_id  INT REFERENCES aos_agents(id) ON DELETE SET NULL,
      to_agent_id    INT REFERENCES aos_agents(id) ON DELETE SET NULL,
      resource_id    INT REFERENCES resources(id) ON DELETE SET NULL,
      amount         NUMERIC(18,4) NOT NULL,
      fee            NUMERIC(18,4) NOT NULL DEFAULT 0,
      description    TEXT,
      status         TEXT NOT NULL DEFAULT 'completed',
      created_at     TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_econ_tx_from ON economy_transactions(from_agent_id);
    CREATE INDEX IF NOT EXISTS idx_econ_tx_to   ON economy_transactions(to_agent_id);

    -- ── Agent Economy Metrics ─────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS agent_economy_metrics (
      agent_id           INT PRIMARY KEY REFERENCES aos_agents(id) ON DELETE CASCADE,
      revenue_generated  NUMERIC(18,4) NOT NULL DEFAULT 0,
      costs              NUMERIC(18,4) NOT NULL DEFAULT 0,
      profit             NUMERIC(18,4) NOT NULL DEFAULT 0,
      roi                NUMERIC(10,4) NOT NULL DEFAULT 0,
      resources_created  INT NOT NULL DEFAULT 0,
      resources_sold     INT NOT NULL DEFAULT 0,
      resources_bought   INT NOT NULL DEFAULT 0,
      transactions_count INT NOT NULL DEFAULT 0,
      updated_at         TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Seed treasury singleton if missing
  await pool.query(`
    INSERT INTO organization_treasury (id, balance) VALUES (1, 100000.0000)
    ON CONFLICT (id) DO NOTHING
  `);

  console.log('✅ Agent Economy v1 tables ready');
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const MARKET_FEE_RATE = 0.05; // 5% to treasury on each sale
const TASK_REWARD_RATE = 0.10; // 10% of resource value paid to creator immediately

/** Determine resource type from task title/description */
function inferResourceType(title = '', description = '') {
  const text = (title + ' ' + description).toLowerCase();
  if (/report|research|study|analysis|analytic/.test(text)) return 'report';
  if (/code|script|function|program|api|module/.test(text)) return 'code';
  if (/data|dataset|csv|table|database/.test(text))         return 'data';
  if (/market|copy|ad|campaign|content|social/.test(text))  return 'marketing_content';
  if (/plan|strategy|roadmap|design/.test(text))            return 'strategy';
  return 'knowledge';
}

/** Score output quality 0–100 */
function calcQualityScore(output = '') {
  let score = 55;
  const len = output.length;
  if (len > 300)  score += 10;
  if (len > 800)  score += 10;
  if (len > 2000) score += 8;
  if (len > 4000) score += 7;
  // Bonus: structured content
  if (/\n[-*•]/.test(output))            score += 3;
  if (/#{1,3}\s/.test(output))           score += 3;
  if (/\d+\.\s/.test(output))           score += 2;
  // Random jitter ±4
  score += Math.floor(Math.random() * 9) - 4;
  return Math.max(10, Math.min(100, score));
}

/** Value = quality × 2.5 (range 25–250 coins) */
function calcValue(qualityScore) {
  return Math.round(qualityScore * 2.5 * 100) / 100;
}

// ─── Economy Engine ────────────────────────────────────────────────────────────
class EconomyEngine {
  constructor(pool) {
    this.pool = pool;
  }

  // ── Wallet ──────────────────────────────────────────────────────────────────

  /** Upsert wallet, return it */
  async ensureWallet(agentId) {
    const { rows: [w] } = await this.pool.query(`
      INSERT INTO agent_wallets (agent_id) VALUES ($1)
      ON CONFLICT (agent_id) DO UPDATE SET updated_at=NOW()
      RETURNING *
    `, [agentId]);
    return w;
  }

  async getWallet(agentId) {
    const { rows: [w] } = await this.pool.query(
      'SELECT * FROM agent_wallets WHERE agent_id=$1', [agentId]
    );
    return w || null;
  }

  /** Transfer coins between two agent wallets */
  async transfer(fromAgentId, toAgentId, amount, description = 'transfer') {
    if (amount <= 0) throw new Error('Amount must be positive');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Lock rows in consistent order (lower id first) to prevent deadlock
      const [lockA, lockB] = fromAgentId < toAgentId
        ? [fromAgentId, toAgentId] : [toAgentId, fromAgentId];

      await client.query(
        'SELECT id FROM agent_wallets WHERE agent_id=$1 FOR UPDATE', [lockA]
      );
      await client.query(
        'SELECT id FROM agent_wallets WHERE agent_id=$1 FOR UPDATE', [lockB]
      );

      // Debit sender
      const { rows: [from] } = await client.query(
        'SELECT balance FROM agent_wallets WHERE agent_id=$1', [fromAgentId]
      );
      if (!from) throw new Error(`Wallet not found for agent #${fromAgentId}`);
      if (parseFloat(from.balance) < amount) throw new Error('Insufficient balance');

      await client.query(
        `UPDATE agent_wallets
         SET balance=balance-$1, total_spent=total_spent+$1, updated_at=NOW()
         WHERE agent_id=$2`,
        [amount, fromAgentId]
      );
      await client.query(
        `UPDATE agent_wallets
         SET balance=balance+$1, total_earned=total_earned+$1, updated_at=NOW()
         WHERE agent_id=$2`,
        [amount, toAgentId]
      );

      // Log transaction
      const { rows: [tx] } = await client.query(
        `INSERT INTO economy_transactions
           (type, from_agent_id, to_agent_id, amount, description)
         VALUES ('wallet_transfer',$1,$2,$3,$4) RETURNING *`,
        [fromAgentId, toAgentId, amount, description]
      );

      // Update metrics
      await this._updateMetrics(client, fromAgentId, { costs: amount, txDelta: 1 });
      await this._updateMetrics(client, toAgentId, { revenue: amount, txDelta: 1 });

      await client.query('COMMIT');
      return tx;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // ── Resources ───────────────────────────────────────────────────────────────

  /** Called automatically when a task completes */
  async generateResourceFromTask(taskId, agentId, output) {
    const pool = this.pool;

    // Load task metadata
    const { rows: [task] } = await pool.query(
      'SELECT title, description FROM aos_tasks WHERE id=$1', [taskId]
    );
    if (!task) return null;

    await this.ensureWallet(agentId);

    const qualityScore = calcQualityScore(output);
    const value        = calcValue(qualityScore);
    const resType      = inferResourceType(task.title, task.description);
    const resTitle     = `[${resType.toUpperCase()}] ${task.title}`;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create resource
      const { rows: [resource] } = await client.query(
        `INSERT INTO resources
           (title, type, creator_agent_id, task_id, quality_score, value, content, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'available') RETURNING *`,
        [resTitle, resType, agentId, taskId, qualityScore, value,
         output ? output.slice(0, 10000) : null]
      );

      // List on market at value price
      await client.query(
        `INSERT INTO resource_market (resource_id, seller_agent_id, ask_price)
         VALUES ($1,$2,$3)`,
        [resource.id, agentId, value]
      );

      // Immediate task reward = 10% of value to creator wallet
      const reward = Math.round(value * TASK_REWARD_RATE * 100) / 100;
      await client.query(
        `UPDATE agent_wallets
         SET balance=balance+$1, total_earned=total_earned+$1, updated_at=NOW()
         WHERE agent_id=$2`,
        [reward, agentId]
      );

      // Treasury pays reward (outflow)
      await client.query(
        `UPDATE organization_treasury
         SET balance=balance-$1, total_outflow=total_outflow+$1, updated_at=NOW()
         WHERE id=1`,
        [reward]
      );

      // Log transaction
      await client.query(
        `INSERT INTO economy_transactions
           (type, to_agent_id, resource_id, amount, description)
         VALUES ('task_reward',$1,$2,$3,$4)`,
        [agentId, resource.id, reward,
         `Task reward for creating resource #${resource.id} (quality ${qualityScore})`]
      );

      // Update metrics
      await this._updateMetrics(client, agentId, {
        revenue: reward, txDelta: 1, resourcesCreated: 1
      });

      await client.query('COMMIT');

      console.log(
        `[Economy] Resource #${resource.id} created by agent #${agentId}` +
        ` | type=${resType} quality=${qualityScore} value=${value} reward=${reward}`
      );
      return resource;

    } catch (e) {
      await client.query('ROLLBACK');
      console.error('[Economy] generateResourceFromTask error:', e.message);
      return null;
    } finally {
      client.release();
    }
  }

  // ── Market ──────────────────────────────────────────────────────────────────

  async listMarket({ type, minQuality, maxPrice, limit = 50 } = {}) {
    let q = `
      SELECT m.*, r.title, r.type, r.quality_score, r.value, r.content,
             r.creator_agent_id, a.name AS seller_name
      FROM resource_market m
      JOIN resources r ON r.id=m.resource_id
      LEFT JOIN aos_agents a ON a.id=m.seller_agent_id
      WHERE m.status='listed'
    `;
    const params = [];
    if (type)       { q += ` AND r.type=$${params.push(type)}`; }
    if (minQuality) { q += ` AND r.quality_score>=$${params.push(minQuality)}`; }
    if (maxPrice)   { q += ` AND m.ask_price<=$${params.push(maxPrice)}`; }
    q += ` ORDER BY r.quality_score DESC, m.listed_at DESC LIMIT $${params.push(limit)}`;

    const { rows } = await this.pool.query(q, params);
    return rows;
  }

  /** Buy a resource: deduct buyer wallet, credit seller, 5% fee to treasury */
  async buyResource(buyerAgentId, resourceId) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Load listing
      const { rows: [listing] } = await client.query(
        `SELECT m.*, r.creator_agent_id, r.title, r.type, r.quality_score
         FROM resource_market m JOIN resources r ON r.id=m.resource_id
         WHERE m.resource_id=$1 AND m.status='listed' FOR UPDATE`,
        [resourceId]
      );
      if (!listing) throw new Error('Resource not listed or already sold');
      if (listing.seller_agent_id === buyerAgentId) throw new Error('Cannot buy own resource');

      const price = parseFloat(listing.ask_price);
      const fee   = Math.round(price * MARKET_FEE_RATE * 100) / 100;
      const net   = Math.round((price - fee) * 100) / 100;

      // Ensure buyer wallet
      await this.ensureWallet(buyerAgentId);

      // Check buyer balance
      const { rows: [buyerW] } = await client.query(
        'SELECT balance FROM agent_wallets WHERE agent_id=$1 FOR UPDATE', [buyerAgentId]
      );
      if (!buyerW) throw new Error('Buyer wallet not found');
      if (parseFloat(buyerW.balance) < price) throw new Error('Insufficient balance');

      const sellerId = listing.seller_agent_id;

      // Deduct buyer
      await client.query(
        `UPDATE agent_wallets
         SET balance=balance-$1, total_spent=total_spent+$1, updated_at=NOW()
         WHERE agent_id=$2`,
        [price, buyerAgentId]
      );

      // Credit seller (net of fee)
      if (sellerId) {
        await client.query(
          `UPDATE agent_wallets
           SET balance=balance+$1, total_earned=total_earned+$1, updated_at=NOW()
           WHERE agent_id=$2`,
          [net, sellerId]
        );
      }

      // Fee → treasury
      await client.query(
        `UPDATE organization_treasury
         SET balance=balance+$1, total_inflow=total_inflow+$1, updated_at=NOW()
         WHERE id=1`,
        [fee]
      );

      // Update market listing
      await client.query(
        `UPDATE resource_market
         SET status='sold', sold_at=NOW(), buyer_agent_id=$1
         WHERE resource_id=$2`,
        [buyerAgentId, resourceId]
      );

      // Update resource status
      await client.query(
        `UPDATE resources SET status='sold' WHERE id=$1`, [resourceId]
      );

      // Log transaction
      const { rows: [tx] } = await client.query(
        `INSERT INTO economy_transactions
           (type, from_agent_id, to_agent_id, resource_id, amount, fee, description)
         VALUES ('resource_purchase',$1,$2,$3,$4,$5,$6) RETURNING *`,
        [buyerAgentId, sellerId, resourceId, price, fee,
         `Purchase: ${listing.title} (quality ${listing.quality_score})`]
      );

      // Update metrics
      await this._updateMetrics(client, buyerAgentId, {
        costs: price, txDelta: 1, resourcesBought: 1
      });
      if (sellerId) {
        await this._updateMetrics(client, sellerId, {
          revenue: net, txDelta: 1, resourcesSold: 1
        });
      }

      await client.query('COMMIT');

      return {
        transaction: tx,
        resource_id: resourceId,
        buyer: buyerAgentId,
        seller: sellerId,
        price,
        fee,
        net_to_seller: net,
      };

    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // ── Treasury ─────────────────────────────────────────────────────────────────

  async getTreasury() {
    const { rows: [t] } = await this.pool.query(
      'SELECT * FROM organization_treasury WHERE id=1'
    );
    return t;
  }

  /** Treasury can grant coins to an agent */
  async treasuryGrant(agentId, amount, reason = 'grant') {
    if (amount <= 0) throw new Error('Amount must be positive');
    await this.ensureWallet(agentId);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE organization_treasury
         SET balance=balance-$1, total_outflow=total_outflow+$1, updated_at=NOW()
         WHERE id=1`,
        [amount]
      );
      await client.query(
        `UPDATE agent_wallets
         SET balance=balance+$1, total_earned=total_earned+$1, updated_at=NOW()
         WHERE agent_id=$2`,
        [amount, agentId]
      );
      await client.query(
        `INSERT INTO economy_transactions
           (type, to_agent_id, amount, description)
         VALUES ('treasury_grant',$1,$2,$3)`,
        [agentId, amount, reason]
      );
      await this._updateMetrics(client, agentId, { revenue: amount, txDelta: 1 });
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // ── Metrics ──────────────────────────────────────────────────────────────────

  async getMetrics(agentId) {
    const { rows: [m] } = await this.pool.query(
      'SELECT * FROM agent_economy_metrics WHERE agent_id=$1', [agentId]
    );
    return m || {
      agent_id: agentId,
      revenue_generated: 0, costs: 0, profit: 0, roi: 0,
      resources_created: 0, resources_sold: 0, resources_bought: 0,
      transactions_count: 0,
    };
  }

  async _updateMetrics(client, agentId, {
    revenue = 0, costs = 0, txDelta = 0,
    resourcesCreated = 0, resourcesSold = 0, resourcesBought = 0
  } = {}) {
    const rev  = parseFloat(revenue)  || 0;
    const cost = parseFloat(costs)    || 0;
    const pft  = rev - cost;
    const roi  = cost > 0 ? Math.round((pft / cost) * 10000) / 100 : 0;

    await client.query(`
      INSERT INTO agent_economy_metrics
        (agent_id, revenue_generated, costs, profit, roi,
         resources_created, resources_sold, resources_bought, transactions_count)
      VALUES ($1, $2::numeric, $3::numeric, $4::numeric, $5::numeric, $6::int, $7::int, $8::int, $9::int)
      ON CONFLICT (agent_id) DO UPDATE SET
        revenue_generated  = agent_economy_metrics.revenue_generated + $2::numeric,
        costs              = agent_economy_metrics.costs              + $3::numeric,
        profit             = agent_economy_metrics.profit             + $4::numeric,
        roi                = CASE
          WHEN (agent_economy_metrics.costs + $3::numeric) = 0 THEN 0
          ELSE ROUND(
            ((agent_economy_metrics.revenue_generated + $2::numeric
              - agent_economy_metrics.costs - $3::numeric)
             / (agent_economy_metrics.costs + $3::numeric)) * 100,
            4)
          END,
        resources_created  = agent_economy_metrics.resources_created  + $6::int,
        resources_sold     = agent_economy_metrics.resources_sold     + $7::int,
        resources_bought   = agent_economy_metrics.resources_bought   + $8::int,
        transactions_count = agent_economy_metrics.transactions_count + $9::int,
        updated_at         = NOW()
    `, [agentId, rev, cost, pft, roi, resourcesCreated, resourcesSold, resourcesBought, txDelta]);
  }
}

// ─── REST API ──────────────────────────────────────────────────────────────────
function registerEconomyRoutes(app, pool) {
  const engine = new EconomyEngine(pool);

  // ── Wallets ──────────────────────────────────────────────────────────────────

  // GET /api/economy/wallet/:agentId
  app.get('/api/economy/wallet/:agentId', async (req, res) => {
    try {
      const w = await engine.getWallet(parseInt(req.params.agentId));
      if (!w) return res.status(404).json({ error: 'Wallet not found' });
      res.json({ wallet: w });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/economy/wallet/:agentId/init — create wallet with starting balance
  app.post('/api/economy/wallet/:agentId/init', async (req, res) => {
    try {
      const w = await engine.ensureWallet(parseInt(req.params.agentId));
      res.json({ wallet: w });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/economy/wallet/transfer
  app.post('/api/economy/wallet/transfer', async (req, res) => {
    const { from_agent_id, to_agent_id, amount, description } = req.body;
    if (!from_agent_id || !to_agent_id || !amount) {
      return res.status(400).json({ error: 'from_agent_id, to_agent_id, amount required' });
    }
    try {
      const tx = await engine.transfer(
        parseInt(from_agent_id), parseInt(to_agent_id),
        parseFloat(amount), description
      );
      res.json({ success: true, transaction: tx });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // ── Treasury ─────────────────────────────────────────────────────────────────

  // GET /api/economy/treasury
  app.get('/api/economy/treasury', async (req, res) => {
    try {
      const t = await engine.getTreasury();
      res.json({ treasury: t });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/economy/treasury/grant
  app.post('/api/economy/treasury/grant', async (req, res) => {
    const { agent_id, amount, reason } = req.body;
    if (!agent_id || !amount) return res.status(400).json({ error: 'agent_id and amount required' });
    try {
      await engine.treasuryGrant(parseInt(agent_id), parseFloat(amount), reason);
      res.json({ success: true });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // ── Resources ────────────────────────────────────────────────────────────────

  // GET /api/economy/resources
  app.get('/api/economy/resources', async (req, res) => {
    try {
      const { agent_id, type, status, limit = 50 } = req.query;
      let q = `
        SELECT r.*, a.name AS creator_name
        FROM resources r
        LEFT JOIN aos_agents a ON a.id=r.creator_agent_id
        WHERE 1=1
      `;
      const params = [];
      if (agent_id) q += ` AND r.creator_agent_id=$${params.push(parseInt(agent_id))}`;
      if (type)     q += ` AND r.type=$${params.push(type)}`;
      if (status)   q += ` AND r.status=$${params.push(status)}`;
      q += ` ORDER BY r.created_at DESC LIMIT $${params.push(parseInt(limit))}`;
      const { rows } = await pool.query(q, params);
      res.json({ resources: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/economy/resources/:id
  app.get('/api/economy/resources/:id', async (req, res) => {
    try {
      const { rows: [r] } = await pool.query(
        `SELECT r.*, a.name AS creator_name
         FROM resources r LEFT JOIN aos_agents a ON a.id=r.creator_agent_id
         WHERE r.id=$1`, [req.params.id]
      );
      if (!r) return res.status(404).json({ error: 'Resource not found' });
      res.json({ resource: r });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/economy/resources — manually create a resource
  app.post('/api/economy/resources', async (req, res) => {
    const { title, type = 'knowledge', creator_agent_id, quality_score, value, content } = req.body;
    if (!title || !creator_agent_id) {
      return res.status(400).json({ error: 'title and creator_agent_id required' });
    }
    try {
      const qs  = parseFloat(quality_score) || calcQualityScore(content || '');
      const val = parseFloat(value)         || calcValue(qs);
      const { rows: [r] } = await pool.query(
        `INSERT INTO resources (title, type, creator_agent_id, quality_score, value, content)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [title, type, creator_agent_id, qs, val, content]
      );
      // Auto-list on market
      await pool.query(
        `INSERT INTO resource_market (resource_id, seller_agent_id, ask_price)
         VALUES ($1,$2,$3)`,
        [r.id, creator_agent_id, val]
      );
      res.status(201).json({ success: true, resource: r });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Market ────────────────────────────────────────────────────────────────────

  // GET /api/economy/market
  app.get('/api/economy/market', async (req, res) => {
    try {
      const { type, min_quality, max_price, limit } = req.query;
      const listings = await engine.listMarket({
        type,
        minQuality: min_quality ? parseFloat(min_quality) : undefined,
        maxPrice:   max_price   ? parseFloat(max_price)   : undefined,
        limit:      limit       ? parseInt(limit)          : 50,
      });
      res.json({ listings });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/economy/market/buy
  app.post('/api/economy/market/buy', async (req, res) => {
    const { buyer_agent_id, resource_id } = req.body;
    if (!buyer_agent_id || !resource_id) {
      return res.status(400).json({ error: 'buyer_agent_id and resource_id required' });
    }
    try {
      const result = await engine.buyResource(
        parseInt(buyer_agent_id), parseInt(resource_id)
      );
      res.json({ success: true, ...result });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // POST /api/economy/market/list — list a resource for sale
  app.post('/api/economy/market/list', async (req, res) => {
    const { resource_id, seller_agent_id, ask_price } = req.body;
    if (!resource_id || !seller_agent_id || !ask_price) {
      return res.status(400).json({ error: 'resource_id, seller_agent_id, ask_price required' });
    }
    try {
      // Verify ownership
      const { rows: [r] } = await pool.query(
        'SELECT * FROM resources WHERE id=$1', [resource_id]
      );
      if (!r) return res.status(404).json({ error: 'Resource not found' });
      if (r.creator_agent_id !== parseInt(seller_agent_id)) {
        return res.status(403).json({ error: 'Only creator can list resource' });
      }

      // Remove any existing listing
      await pool.query('DELETE FROM resource_market WHERE resource_id=$1', [resource_id]);

      const { rows: [listing] } = await pool.query(
        `INSERT INTO resource_market (resource_id, seller_agent_id, ask_price)
         VALUES ($1,$2,$3) RETURNING *`,
        [resource_id, seller_agent_id, parseFloat(ask_price)]
      );
      await pool.query(`UPDATE resources SET status='available' WHERE id=$1`, [resource_id]);
      res.json({ success: true, listing });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Transactions ──────────────────────────────────────────────────────────────

  // GET /api/economy/transactions
  app.get('/api/economy/transactions', async (req, res) => {
    try {
      const { agent_id, type, limit = 50 } = req.query;
      let q = `
        SELECT tx.*,
               fa.name AS from_agent_name,
               ta.name AS to_agent_name,
               r.title AS resource_title
        FROM economy_transactions tx
        LEFT JOIN aos_agents fa ON fa.id=tx.from_agent_id
        LEFT JOIN aos_agents ta ON ta.id=tx.to_agent_id
        LEFT JOIN resources  r  ON r.id=tx.resource_id
        WHERE 1=1
      `;
      const params = [];
      if (agent_id) {
        q += ` AND (tx.from_agent_id=$${params.push(parseInt(agent_id))} OR tx.to_agent_id=$${params.push(parseInt(agent_id))})`;
      }
      if (type) q += ` AND tx.type=$${params.push(type)}`;
      q += ` ORDER BY tx.created_at DESC LIMIT $${params.push(parseInt(limit))}`;
      const { rows } = await pool.query(q, params);
      res.json({ transactions: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Metrics ───────────────────────────────────────────────────────────────────

  // GET /api/economy/metrics/:agentId
  app.get('/api/economy/metrics/:agentId', async (req, res) => {
    try {
      const [metrics, wallet] = await Promise.all([
        engine.getMetrics(parseInt(req.params.agentId)),
        engine.getWallet(parseInt(req.params.agentId)),
      ]);
      res.json({ metrics, wallet });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/economy/leaderboard — top agents by profit
  app.get('/api/economy/leaderboard', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT m.*, a.name AS agent_name, w.balance AS current_balance
        FROM agent_economy_metrics m
        JOIN aos_agents a ON a.id=m.agent_id
        LEFT JOIN agent_wallets w ON w.agent_id=m.agent_id
        ORDER BY m.profit DESC LIMIT 20
      `);
      res.json({ leaderboard: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/economy/overview — system-wide snapshot
  app.get('/api/economy/overview', async (req, res) => {
    try {
      const [treasury, totals, topRes] = await Promise.all([
        engine.getTreasury(),
        pool.query(`
          SELECT
            COUNT(*)::int                                             AS total_wallets,
            SUM(balance)                                              AS total_wallet_balance,
            COUNT(*) FILTER (WHERE balance >= 1000)::int             AS funded_agents
          FROM agent_wallets
        `),
        pool.query(`
          SELECT COUNT(*)::int AS total_resources,
                 COUNT(*) FILTER (WHERE status='available')::int AS on_market,
                 COUNT(*) FILTER (WHERE status='sold')::int      AS sold,
                 ROUND(AVG(quality_score),2)                     AS avg_quality,
                 SUM(value)                                      AS total_value
          FROM resources
        `),
      ]);
      const [txStats] = (await pool.query(`
        SELECT COUNT(*)::int AS total_transactions,
               SUM(amount)   AS total_volume,
               SUM(fee)      AS total_fees
        FROM economy_transactions
      `)).rows;
      res.json({
        treasury,
        wallets:      totals.rows[0],
        resources:    topRes.rows[0],
        transactions: txStats,
      });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/economy/demo — run Research→Marketing demo scenario
  app.post('/api/economy/demo', async (req, res) => {
    const { research_agent_id, marketing_agent_id } = req.body;
    if (!research_agent_id || !marketing_agent_id) {
      return res.status(400).json({ error: 'research_agent_id and marketing_agent_id required' });
    }
    try {
      const rid = parseInt(research_agent_id);
      const mid = parseInt(marketing_agent_id);

      // Ensure both have wallets
      await engine.ensureWallet(rid);
      await engine.ensureWallet(mid);

      // Research agent creates a report resource
      const qualityScore = 82;
      const value = calcValue(qualityScore);
      const { rows: [resource] } = await pool.query(
        `INSERT INTO resources (title, type, creator_agent_id, quality_score, value, content, status)
         VALUES ($1,'report',$2,$3,$4,$5,'available') RETURNING *`,
        [
          '[REPORT] Market Analysis Q2 2026',
          rid, qualityScore, value,
          'Comprehensive market analysis covering competitive landscape, consumer trends, and growth opportunities for Q2 2026. Key findings: 34% YoY growth in AI adoption, top 3 competitors identified, 5 strategic recommendations outlined.',
        ]
      );

      // List on market
      await pool.query(
        `INSERT INTO resource_market (resource_id, seller_agent_id, ask_price)
         VALUES ($1,$2,$3) ON CONFLICT (resource_id) DO UPDATE SET ask_price=$3`,
        [resource.id, rid, value]
      );

      // Task reward to research agent
      const reward = Math.round(value * TASK_REWARD_RATE * 100) / 100;
      await pool.query(
        `UPDATE agent_wallets SET balance=balance+$1, total_earned=total_earned+$1 WHERE agent_id=$2`,
        [reward, rid]
      );
      await pool.query(
        `UPDATE organization_treasury SET balance=balance-$1, total_outflow=total_outflow+$1 WHERE id=1`,
        [reward]
      );
      await pool.query(
        `INSERT INTO economy_transactions (type, to_agent_id, resource_id, amount, description)
         VALUES ('task_reward',$1,$2,$3,'Demo task reward')`,
        [rid, resource.id, reward]
      );

      // Marketing agent buys the report
      const purchaseResult = await engine.buyResource(mid, resource.id);

      // Fetch final wallet states
      const [rWallet, mWallet, treasury] = await Promise.all([
        engine.getWallet(rid),
        engine.getWallet(mid),
        engine.getTreasury(),
      ]);

      res.json({
        success: true,
        scenario: 'Research Agent creates report → Marketing Agent purchases it',
        resource: { id: resource.id, title: resource.title, quality_score: qualityScore, value },
        purchase: purchaseResult,
        wallets: {
          research_agent:  { id: rid,  balance: rWallet?.balance },
          marketing_agent: { id: mid, balance: mWallet?.balance },
        },
        treasury: { balance: treasury?.balance },
      });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  console.log('✅ Agent Economy v1 API routes registered');
  return engine;
}

module.exports = { initEconomyTables, registerEconomyRoutes, EconomyEngine };
