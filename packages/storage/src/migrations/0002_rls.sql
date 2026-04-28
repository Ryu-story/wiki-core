-- @wiki-core/storage migration 0002: Row Level Security defense-in-depth
-- SPEC: packages/storage/SPEC.md §2.2
--
-- 1차 게이트는 application layer 의 WikiAccessControl hook (plugin 구현).
-- 이 RLS 는 application bypass 시 안전망.
--
-- Plugin 이 자기 도메인 정책으로 ALTER POLICY 또는 신규 POLICY 추가:
-- - rootric: auth.uid() 기반 단순 격리
-- - plott:   auth.uid() + pharmacy_id + circle_id (5단계 가시성)
-- - enroute: auth.uid() 본인만
--
-- Mercury 5차 종결 후 정정 (로고스 + 루터 보완): `CREATE POLICY IF NOT EXISTS` 는 PG 16+ 한정.
-- Supabase 15.x 호환을 위해 DROP POLICY IF EXISTS + CREATE POLICY 패턴 사용 (idempotent).

ALTER TABLE wiki_objects     ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_attributes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_relations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_provenance  ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_labels      ENABLE ROW LEVEL SECURITY;

-- Default — plugin 이 ALTER POLICY 또는 DROP + 자체 신규로 강화
DROP POLICY IF EXISTS wiki_objects_default_select ON wiki_objects;
CREATE POLICY wiki_objects_default_select ON wiki_objects
  FOR SELECT USING (true);
DROP POLICY IF EXISTS wiki_objects_default_modify ON wiki_objects;
CREATE POLICY wiki_objects_default_modify ON wiki_objects
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS wiki_attributes_default_select ON wiki_attributes;
CREATE POLICY wiki_attributes_default_select ON wiki_attributes
  FOR SELECT USING (true);
DROP POLICY IF EXISTS wiki_attributes_default_modify ON wiki_attributes;
CREATE POLICY wiki_attributes_default_modify ON wiki_attributes
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS wiki_relations_default_select ON wiki_relations;
CREATE POLICY wiki_relations_default_select ON wiki_relations
  FOR SELECT USING (true);
DROP POLICY IF EXISTS wiki_relations_default_modify ON wiki_relations;
CREATE POLICY wiki_relations_default_modify ON wiki_relations
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS wiki_events_default_select ON wiki_events;
CREATE POLICY wiki_events_default_select ON wiki_events
  FOR SELECT USING (true);
DROP POLICY IF EXISTS wiki_events_default_modify ON wiki_events;
CREATE POLICY wiki_events_default_modify ON wiki_events
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS wiki_provenance_default_select ON wiki_provenance;
CREATE POLICY wiki_provenance_default_select ON wiki_provenance
  FOR SELECT USING (true);
DROP POLICY IF EXISTS wiki_provenance_default_modify ON wiki_provenance;
CREATE POLICY wiki_provenance_default_modify ON wiki_provenance
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS wiki_labels_default_select ON wiki_labels;
CREATE POLICY wiki_labels_default_select ON wiki_labels
  FOR SELECT USING (true);
DROP POLICY IF EXISTS wiki_labels_default_modify ON wiki_labels;
CREATE POLICY wiki_labels_default_modify ON wiki_labels
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
