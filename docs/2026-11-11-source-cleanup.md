# 기능을 보존한 소스 정리

점검일: 2026-11-11. 비교 기준 커밋: `7a8ade1`. 시작 시 추적 파일의 작업 중 변경은 없었고, 미추적 `.DS_Store`는 그대로 보존했다. 사용자 저장 파일·생성된 감사 결과·스크린샷은 수정하거나 삭제하지 않았다.

## 구조와 실행 경로

별도 빌드·번들러·린터·타입 검사 설정이 없는 JavaScript ES 모듈 프로젝트다. `package.json`에 실행·테스트 두 명령만 있고 잠금 파일은 없다. `index.html`이 `style.css`, `audit.css`, `src/app.js`를 읽는다. Node 회귀 테스트는 `node --test tests/*.test.js`, 실행은 `python3 -m http.server 5173 --bind 127.0.0.1`이다. macOS의 `open-game.command`는 `scripts/open-in-chrome.py`로 로컬 서버와 Chrome을 연다.

| 모듈 | 역할과 보존한 사용 경로 |
| --- | --- |
| `app.js` | 선수 생성·결과·리그·이력·보관 화면, 해시 탐색, DOM 선택·클릭 처리와 저장 연결 |
| `engine.js` | 경기·시즌·커리어 상태 전이, 계약·병역·이적, 기록·저장 이관의 공개 함수 |
| `season-worker.js` | `new Worker(new URL(...))`로 생성되는 시즌 계산 경로; 일반 정적 import로만 사용 여부를 판단하지 않음 |
| `league-operations.js`, `bullpen.js` | 날짜·엔트리·구단 전략, 투수 역할·등판·휴식·홀드 |
| `player-value.js`, `war.js`, `award-evaluation.js` | 예상 기여·플레이 스타일, WAR·과거 문맥, 수상 평가·자격 |
| `record-achievements.js`, `presentation.js` | 달성 기록 판정, 타이틀·기록 배지와 WAR 표시 |
| `training-programs.js`, `training-ui.js` | 프로그램 선택·성장·부담·회복과 훈련 HTML |
| `creation-flow.js`, `progress-display.js` | 생성 초안의 과거 단계 이관, 진행 화면의 시간·이벤트 중단 위치 |
| `storage-codec.js`, `storage-management.js` | 압축·검증·저장 용량 처리, 구 저장 조회·삭제·은퇴 보관·JSON 교환 |
| `vendor/fflate.js` | 실제 사용하는 무손실 압축 의존성. 배포 원본·MIT 라이선스·출처 문서를 유지 |
| `scripts/`, `tests/` | 수동 감사·공식 기록 추출·브라우저 실행 도구와 회귀 테스트. 런타임에서 호출되지 않아도 삭제 대상이 아님 |

저장 버전·키·기록 배열·압축 형식·은퇴 보관 형식을 유지했다. 저장값으로 분기하는 코드, 구버전 필드 삭제·복구, DOM에서 구성하는 액션·클래스, worker 진입점과 감사 스크립트의 동적 import를 확인했다. 공개 export는 정적 사용처가 적더라도 제거하지 않았다.

## 제거·통합 내용

| 파일 | 내용과 근거 |
| --- | --- |
| `src/app.js` | 사용하지 않는 import 9개 제거: `collegeEarlyStatus`, `runDraft`, `positionOffer`, `changePosition`, `teamBudget`, `canonicalAwardName`, `archiveSalaryTotal`, `emptyBat`, `emptyPitch`. 엔진의 원래 export는 유지했다. |
| `src/app.js` | 참조가 없는 `startingSeed`와 `fresh` 제거. `startingSeed`는 생성·저장 시드에 전달되지 않던 초기 난수였으며 실제 프로필 생성의 난수 경로와 저장된 시드·엔진 난수 함수는 유지했다. |
| `src/app.js` | 같은 `position_result` 조건의 첫 HTML 대입 제거. 아래 동일 조건의 분기가 항상 덮어쓰므로 최종 화면에는 쓰이지 않았다. 마지막 분기와 알림·확인 처리는 유지했다. |
| `src/engine.js` | 호출처·export·동적 참조가 없는 비공개 `renewSalary` 제거. 실제 연봉 처리는 `salaryOffer`·`negotiateSalary` 경로를 유지한다. |
| `src/training-programs.js` | 활성 프로그램 판정 직후 반드시 덮어쓰던 최초 `load` 평균 계산 제거. 최종 `load`가 이미 0을 처리하므로 반환의 중복 조건도 제거했다. 회복·피로·성장 계수와 반환 필드는 유지했다. |
| `src/bullpen.js` | 같은 투수·같은 선택 시점의 `reliefAvailability` 결과를 지역 Map에 한 번 계산해 필터·평가에서 공유한다. 다음 선택으로 캐시를 넘기지 않는다. 순회·정렬·난수 호출·출장 제한·휴식 기준은 유지했다. |
| `src/war.js` | TOP 3 변환 콜백의 사용하지 않는 두 번째 인자 제거. 랭킹·동률·연도 정렬은 그대로다. |
| `style.css`, `audit.css` | 생성 경로가 없는 구 구장 조명·진행 장면·드래프트 단계·표본 부족 표시 등의 선택자 69개 항목과 더는 참조되지 않는 `ballpark-light`·`draft-pulse` 애니메이션 제거. 그룹 선택자의 살아 있는 부분과 부정 선택자 `:not(.badge)`는 유지했다. |
| 테스트 파일 10개 | 사용하지 않는 import 11개와 WAR 테스트의 미사용 지역 문맥 계산 제거. 테스트·assertion 자체는 삭제하거나 약화하지 않았다. 파일은 `audit-sim.mjs`, `balance-2026.test.js`, `contract-award-feedback.test.js`, `feedback.test.js`, `league-operations-2026.test.js`, `october-2026-rules.test.js`, `october-feedback.test.js`, `training-programs.test.js`, `war-awards.test.js`, `war.test.js`다. |
| `index.html` 및 모듈 참조 | JS와 두 CSS의 캐시 참조를 7.31로 갱신했다. `award-evaluation.js`, `league-operations.js`, `player-value.js`, `presentation.js`, `season-worker.js`, `storage-management.js`의 변경은 이 참조 갱신뿐이다. |

CSS는 합계 **36,270 → 31,715바이트**, **4,555바이트(약 12.6%)** 감소했다. 전체 CSS 재정렬이나 적용 순서 변경은 하지 않았다. 화면 비교 과정에서 CSS 주석 처리로 상태 바 스타일이 달라지는 중간 변경을 발견해 바로잡았고, 최종 대조에서는 차이가 없었다.

## 의도적으로 유지한 항목과 한계

- `trainingOptionHtml`, `trainingPlan`, `archetype` 등 이전 인터페이스는 현재 UI의 주경로가 아니어도 회귀 테스트·기존 호출 계약을 유지하므로 보존했다. `minimumSalary(year)`처럼 사용되지 않는 공개 인자도 임의로 제거하지 않았다.
- 객체에서 `bats`, `arms`, `pool`, `gameEligibleIds`, 임시 정렬 `index`를 구조 분해한 뒤 rest를 반환하는 코드는 저장·반환 데이터에서 해당 필드를 **제외하는 실제 동작**이다. 미사용 변수라는 이유로 제거하지 않았다. 배열 콜백의 `_` 인자도 인덱스 위치가 필요하다.
- `trainingState.repeats`·`repertoire`·`careerScore` 등의 옛 필드 정리, 예전 저장 키·기록 포맷 이관, 과거 수상 복구는 사용 중인 호환 코드다.
- 감사 스크립트·옛 결과 JSON·스크린샷은 자동 import가 없어도 수동 실행·비교 이력·사용자 생성물일 수 있다. 외부 사용을 확인할 근거 없이 삭제하지 않았다. 외부 소비자 전부의 존재 여부는 저장소만으로 증명할 수 없다.
- `fflate`의 미사용 배포 API를 잘라내지 않았다. 원본 provenance·라이선스를 보존하고 임의로 유지보수할 부분을 늘리지 않기 위해서다. 새 의존성이나 테스트 체계는 추가하지 않았다.
- CSS 전역 상속·여러 단계의 덮어쓰기와 현재 사용하는 우승 효과는 단순 검색으로 불필요하다고 단정하지 않았다. DOM에 없는 **양의 클래스 선택자**를 중심으로 제한했다. 공통화 자체가 목적이 되는 새 유틸리티 모듈도 만들지 않았다.

## 검증

- **정리 전·후 각각 `node --test tests/*.test.js`: 232개 통과, 실패 0**. 테스트 내용은 유지했다. 저장·불러오기·구버전·은퇴 보관·훈련·경기·수상·병역·이적 검사를 포함한다.
- Acorn 구문 트리로 런타임·스크립트·테스트의 **JS/MJS 65개** 선언과 참조를 확인했다. 상대 import **102개**의 파일 존재를 확인했고 런타임 16개 모듈의 공개 export **218개**가 전후 동일했다. 이는 저장소에 없는 외부 호출을 전부 추적했다는 의미는 아니다. 분석 도구는 기존 Node에 포함된 파서를 임시로 사용했으며 프로젝트 의존성에 추가하지 않았다. Python 도구 2개는 AST 구문 검사를 통과했다.
- 시드 `11, 83, 313, 571, 977, 1453` × 타자·선발·중간계투·마무리의 **24개 2030년 시즌** 전체 JSON(개발용 투구 로그 포함)을 비교했다. 두 역할 × 18·30·40세 × 무훈련·각 단일 프로그램·두 프로그램 조합의 **48개 훈련 조건**도 함께 비교했다. 모든 결과를 차례로 해시한 SHA-256은 전후 동일한 `6f9a5ad717533b805caa2fcb6dc9009c46f65613aeaa39d8c904fef8b073c0b5`다. 성능 향상률이나 전체 게임 밸런스를 새로 입증한 시험은 아니다.
- Chrome의 390px·1280px에서 선수 생성, 타자 결과, 투수 결과, 시즌 준비, 시즌 시작, 은퇴, 기록·리그·이력·보관·도움말의 **22개 화면 조건**을 대조했다. DOM 항목 수·텍스트·계산된 주요 스타일·경계 좌표·크기의 해시가 모두 같았고 가로 넘침·스크립트 오류는 없었다. `position_result` 알림은 이전 app/CSS를 직접 로드한 화면과 별도로 비교해 동일함을 확인했다. 모든 의사결정 이벤트·브라우저·화면 폭 조합을 전수 실행한 것은 아니다.
- `git diff --check` 통과. 파일 삭제·저장 스키마 변경·공개 export 삭제·의존성 변경은 없다. 임시 비교 자료는 `/tmp`에 두고 기존 검증 결과를 덮어쓰지 않았다.
