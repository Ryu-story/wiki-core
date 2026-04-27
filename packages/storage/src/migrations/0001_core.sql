-- @wiki-core/storage migration 0001: 4요소 + 보조 슬롯 core tables
-- SPEC: packages/storage/SPEC.md §2.1
--
-- Plugin extension table (rootric_*_ext / plott_*_ext / enroute_*_ext) 은
-- 각 plugin 의 자체 마이그레이션에서 추가. 코어는 4요소 + provenance + label 만 책임.

-- ─── 4요소 ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wiki_objects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            TEXT NOT NULL,
  label           TEXT NOT NULL,
  identifier      TEXT,
  created_origin  TEXT NOT NULL CHECK (created_origin IN ('ingest', 'manual', 'auto')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS wiki_objects_type ON wiki_objects(type);
CREATE INDEX IF NOT EXISTS wiki_objects_identifier ON wiki_objects(identifier) WHERE identifier IS NOT NULL;

CREATE TABLE IF NOT EXISTS wiki_attributes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id     UUID NOT NULL REFERENCES wiki_objects(id) ON DELETE CASCADE,
  key           TEXT NOT NULL,
  value         JSONB NOT NULL,
  unit          TEXT,
  valid_at      TIMESTAMPTZ,
  valid_until   TIMESTAMPTZ,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (valid_at IS NULL OR valid_until IS NULL OR valid_at <= valid_until)
);
CREATE INDEX IF NOT EXISTS wiki_attributes_object_key ON wiki_attributes(object_id, key);
CREATE INDEX IF NOT EXISTS wiki_attributes_valid_at ON wiki_attributes(valid_at) WHERE valid_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS wiki_relations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id         UUID NOT NULL REFERENCES wiki_objects(id) ON DELETE CASCADE,
  to_id           UUID NOT NULL REFERENCES wiki_objects(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  directionality  TEXT NOT NULL CHECK (directionality IN ('directed', 'undirected')),
  weight          DOUBLE PRECISION,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_id, to_id, type)
);
CREATE INDEX IF NOT EXISTS wiki_relations_from ON wiki_relations(from_id, type);
CREATE INDEX IF NOT EXISTS wiki_relations_to ON wiki_relations(to_id, type);

CREATE TABLE IF NOT EXISTS wiki_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_ids   UUID[] NOT NULL,
  type         TEXT NOT NULL,
  occurred_at  TIMESTAMPTZ NOT NULL,
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wiki_events_occurred_at ON wiki_events(occurred_at);
CREATE INDEX IF NOT EXISTS wiki_events_object_ids ON wiki_events USING GIN (object_ids);
CREATE INDEX IF NOT EXISTS wiki_events_type ON wiki_events(type);

-- ─── 보조 슬롯 ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wiki_provenance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_kind   TEXT NOT NULL CHECK (target_kind IN ('object', 'attribute', 'relation', 'event')),
  target_id     UUID NOT NULL,
  source_kind   TEXT NOT NULL,
  source_ref    TEXT NOT NULL,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wiki_provenance_target ON wiki_provenance(target_kind, target_id);

CREATE TABLE IF NOT EXISTS wiki_labels (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_kind    TEXT NOT NULL CHECK (target_kind IN ('object', 'attribute', 'relation', 'event')),
  target_id      UUID NOT NULL,
  label_set_id   TEXT NOT NULL,
  label_id       TEXT NOT NULL,
  applied_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (target_kind, target_id, label_set_id, label_id)
);
CREATE INDEX IF NOT EXISTS wiki_labels_target ON wiki_labels(target_kind, target_id);
CREATE INDEX IF NOT EXISTS wiki_labels_set ON wiki_labels(label_set_id, label_id);
