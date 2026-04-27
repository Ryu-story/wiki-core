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

ALTER TABLE wiki_objects     ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_attributes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_relations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_provenance  ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_labels      ENABLE ROW LEVEL SECURITY;

-- Default — plugin 이 ALTER POLICY 또는 DROP + 자체 신규로 강화
CREATE POLICY IF NOT EXISTS wiki_objects_default_select ON wiki_objects
  FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS wiki_objects_default_modify ON wiki_objects
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS wiki_attributes_default_select ON wiki_attributes
  FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS wiki_attributes_default_modify ON wiki_attributes
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS wiki_relations_default_select ON wiki_relations
  FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS wiki_relations_default_modify ON wiki_relations
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS wiki_events_default_select ON wiki_events
  FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS wiki_events_default_modify ON wiki_events
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS wiki_provenance_default_select ON wiki_provenance
  FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS wiki_provenance_default_modify ON wiki_provenance
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS wiki_labels_default_select ON wiki_labels
  FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS wiki_labels_default_modify ON wiki_labels
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
