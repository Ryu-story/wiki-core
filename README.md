# wiki-core

3 도메인(rootric / plott / enroute) 공통 위키 추상화 작업 전용 repo.

## 현재 상태

**Phase 2** — 3 명세서 비교 → 추상화 결정 진행 중

## 구조

```
wiki-core/
├── CLAUDE.md              # 머큐리 페르소나 + 작업 컨텍스트
├── README.md              # 이 파일
└── docs/
    ├── rootric_wiki_requirements.md   # rootric 명세서 (로고스 작성)
    ├── plott_wiki_requirements.md     # plott 명세서 (플로터 작성)
    └── enroute_wiki_requirements.md   # enroute 명세서 (루터 작성)
```

## 작업 페르소나

이 repo 안에서는 **머큐리(Mercury)** 만 호출. 도메인 owner(로고스/플로터/루터)는 자기 repo에 머무른다.

## 단계

- **Phase 1** (완료): 3 도메인이 같은 양식으로 명세서 평행 작성
- **Phase 2** (지금): 3 명세서 비교 → wiki-core 추상화 결정
- **Phase 3**: 코드 패키지 셋업 (pnpm workspaces)
- **Phase 4**: 도메인 plugin 합류 시작
