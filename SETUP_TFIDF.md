# TF-IDF 기반 상품 추천 시스템 설정 가이드

## 개요

TF-IDF (Term Frequency-Inverse Document Frequency)는 정보 검색에서 문서의 중요도를 측정하는 방법입니다. 이를 상품 추천에 적용하면:

- **TF (Term Frequency)**: 특정 태그가 카드에 나타나는 빈도
- **IDF (Inverse Document Frequency)**: 전체 카드 중 해당 태그를 가진 카드의 역수
- **TF-IDF 점수**: TF × IDF

**장점:**
- 자주 나타나는 태그(예: "데일리")는 낮은 IDF 값을 가져 덜 중요하게 취급
- 드물게 나타나는 태그는 높은 IDF 값을 가져 더 중요하게 취급
- 사용자가 드문 태그를 선호한다면 더 높은 점수를 받음

## 설정 단계

### 1. Supabase SQL 함수 및 테이블 생성

1. Supabase Dashboard에 접속: https://supabase.com/dashboard
2. 프로젝트 선택
3. 좌측 메뉴에서 **SQL Editor** 클릭
4. **New Query** 클릭
5. `supabase_tfidf_setup.sql` 파일의 전체 내용을 복사하여 붙여넣기
6. **Run** 버튼 클릭하여 실행

**실행 확인:**
- 에러가 없으면 성공적으로 설정된 것입니다
- Tables 탭에서 `tag_idf`와 `card_statistics` 테이블이 생성되었는지 확인
- Functions 탭에서 `calculate_tfidf_score`와 `get_tfidf_based_cards` 함수가 생성되었는지 확인

### 2. 초기 IDF 데이터 생성

SQL 실행 후 자동으로 초기 IDF 데이터가 생성됩니다. 수동으로 업데이트하려면:

```sql
SELECT update_all_tag_idf();
```

### 3. 코드 변경 확인

다음 파일들이 이미 업데이트되었습니다:
- ✅ `src/lib/supabaseCardsOptimized.ts` - TF-IDF 기반 함수 사용
- ✅ 자동 폴백: TF-IDF 함수가 없으면 기본 매칭 함수로 폴백

## 동작 확인

1. 개발 서버 실행:
   ```bash
   npm run dev
   ```

2. 브라우저 콘솔에서 다음 로그 확인:
   - `[fetchCardsOptimized] Retrieved X cards using TF-IDF based PostgreSQL function` - TF-IDF 함수 사용 확인

3. TF-IDF 점수 확인 (선택사항):
   ```sql
   -- 상위 IDF 점수를 가진 태그 확인
   SELECT tag, document_count, idf_score, updated_at
   FROM public.tag_idf
   ORDER BY idf_score DESC
   LIMIT 20;
   ```

## IDF 업데이트 전략

### 자동 업데이트 (권장하지 않음)
- 카드가 추가/업데이트될 때마다 IDF를 업데이트하면 성능 저하 발생
- 트리거는 주석 처리되어 있습니다

### 배치 업데이트 (권장)
정기적으로 IDF를 업데이트하는 것이 좋습니다:

```sql
-- 매일 또는 주기적으로 실행
SELECT update_all_tag_idf();
```

**Supabase Cron Job 설정 (선택사항):**
1. Supabase Dashboard > Database > Extensions
2. `pg_cron` 확장 활성화
3. Cron Job 생성:
   ```sql
   SELECT cron.schedule(
     'update-tag-idf-daily',
     '0 2 * * *',  -- 매일 새벽 2시
     $$SELECT update_all_tag_idf();$$
   );
   ```

### 수동 업데이트
새로운 카드가 많이 추가되었을 때:

```sql
SELECT update_all_tag_idf();
```

## TF-IDF 점수 계산 예시

### 예시 1: 자주 나타나는 태그
- 태그: "데일리"
- 전체 카드 수: 1000개
- "데일리" 태그를 가진 카드: 800개
- IDF = ln(1000 / (800 + 1)) ≈ 0.22 (낮은 점수)

### 예시 2: 드물게 나타나는 태그
- 태그: "빈티지"
- 전체 카드 수: 1000개
- "빈티지" 태그를 가진 카드: 10개
- IDF = ln(1000 / (10 + 1)) ≈ 4.5 (높은 점수)

### TF-IDF 점수 계산
사용자 태그: ["데일리", "빈티지"]
카드 A: ai_tags = "데일리,캐주얼" (2개 태그)
- "데일리" TF = 1/2 = 0.5, IDF = 0.22 → TF-IDF = 0.11
- 총 TF-IDF = 0.11

카드 B: ai_tags = "빈티지,레트로" (2개 태그)
- "빈티지" TF = 1/2 = 0.5, IDF = 4.5 → TF-IDF = 2.25
- 총 TF-IDF = 2.25

**결과:** 카드 B가 더 높은 점수를 받아 우선적으로 추천됩니다.

## 성능 최적화

### 인덱스 확인
```sql
-- 인덱스가 제대로 생성되었는지 확인
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('tag_idf', 'cards');
```

### 함수 테스트
```sql
-- TF-IDF 점수 계산 테스트
SELECT calculate_tfidf_score(
  '데일리,캐주얼,미니멀',
  ARRAY['데일리', '빈티지']::TEXT[]
);

-- TF-IDF 기반 카드 조회 테스트
SELECT * FROM get_tfidf_based_cards(
  ARRAY['데일리', '빈티지']::TEXT[],
  NULL::TEXT[],
  10
);
```

## 문제 해결

### IDF 점수가 0인 경우
- `update_all_tag_idf()` 함수를 실행하여 IDF 데이터 생성
- `tag_idf` 테이블에 데이터가 있는지 확인

### TF-IDF 함수가 실행되지 않는 경우
1. SQL Editor에서 `supabase_tfidf_setup.sql` 다시 실행
2. Functions 탭에서 함수 존재 여부 확인
3. 자동으로 기본 매칭 함수로 폴백되므로 앱은 정상 동작합니다

### 성능 이슈
- IDF 업데이트는 배치로 처리하는 것을 권장
- 카드가 추가될 때마다 업데이트하지 않도록 트리거는 비활성화되어 있습니다

