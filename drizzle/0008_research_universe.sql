-- Research / Nexus tables: AI supply chain stock intelligence
-- company_universe, supply_chain_edges, research_sessions

-- Enums
DO $$ BEGIN
  CREATE TYPE supply_chain_relationship AS ENUM (
    'supplier', 'customer', 'competitor', 'partner', 'investor'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE signal_sentiment AS ENUM ('bullish', 'bearish', 'neutral');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE signal_type AS ENUM (
    'pricing', 'capacity', 'order', 'policy', 'earnings',
    'partnership', 'product', 'regulatory', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Company universe
CREATE TABLE IF NOT EXISTS company_universe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  name_zh VARCHAR(255),
  ticker_primary VARCHAR(20),
  tickers JSONB,
  market_cap_usd NUMERIC(15, 2),
  sector VARCHAR(100),
  sub_sector VARCHAR(100),
  supply_chain_position VARCHAR(50),
  country VARCHAR(100),
  exchange VARCHAR(50),
  description TEXT,
  description_zh TEXT,
  tags TEXT[],
  metadata JSONB,
  last_researched_at TIMESTAMPTZ,
  research_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cu_name ON company_universe(name);
CREATE INDEX IF NOT EXISTS idx_cu_ticker ON company_universe(ticker_primary);
CREATE INDEX IF NOT EXISTS idx_cu_sector ON company_universe(sector);

ALTER TABLE company_universe ENABLE ROW LEVEL SECURITY;

-- Supply chain edges (knowledge graph)
CREATE TABLE IF NOT EXISTS supply_chain_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_company_id UUID NOT NULL REFERENCES company_universe(id) ON DELETE CASCADE,
  target_company_id UUID NOT NULL REFERENCES company_universe(id) ON DELETE CASCADE,
  relationship_type supply_chain_relationship NOT NULL,
  description TEXT,
  confidence REAL DEFAULT 0.5,
  source_citation TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sce_source ON supply_chain_edges(source_company_id);
CREATE INDEX IF NOT EXISTS idx_sce_target ON supply_chain_edges(target_company_id);

ALTER TABLE supply_chain_edges ENABLE ROW LEVEL SECURITY;

-- Research sessions
CREATE TABLE IF NOT EXISTS research_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES company_universe(id) ON DELETE CASCADE,
  conversation_id UUID,
  topic TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  brief JSONB,
  arena_results JSONB,
  market_snapshot JSONB,
  data_sources JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE research_sessions ENABLE ROW LEVEL SECURITY;
