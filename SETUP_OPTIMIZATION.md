# PostgreSQL 함수 기반 최적화 설정 가이드

## 설정 단계

### 1. Supabase SQL 함수 및 인덱스 생성

1. Supabase Dashboard에 접속: https://supabase.com/dashboard
2. 프로젝트 선택
3. 좌측 메뉴에서 **SQL Editor** 클릭
4. **New Query** 클릭
5. `supabase_preference_matching_setup.sql` 파일의 전체 내용을 복사하여 붙여넣기
6. **Run** 버튼 클릭하여 실행

**실행 확인:**
- 에러가 없으면 성공적으로 설정된 것입니다
- Functions 탭에서 `calculate_tag_match_score`와 `get_preference_based_cards` 함수가 생성되었는지 확인할 수 있습니다

### 2. 코드 변경 확인

다음 파일들이 이미 업데이트되었습니다:
- ✅ `src/App.tsx` - `fetchCardsOptimized` 사용
- ✅ `src/components/PageTurnCardStack.tsx` - `fetchCardsOptimized` 사용
- ✅ `src/lib/supabaseCardsOptimized.ts` - 최적화된 함수 구현

### 3. 동작 확인

1. 개발 서버 실행:
   ```bash
   npm run dev
   ```

2. 브라우저 콘솔에서 다음 로그 확인:
   - `[fetchCardsOptimized] User preference tags: [...]` - 사용자 태그 추출 확인
   - `[fetchCardsOptimized] Retrieved X cards using PostgreSQL function` - PostgreSQL 함수 사용 확인

3. PostgreSQL 함수가 없거나 에러 발생 시:
   - 자동으로 기존 방식(`fetchCardsFallback`)으로 폴백됩니다
   - 콘솔에 에러 메시지가 표시됩니다

## 성능 개선 효과

### 이전 방식 (JavaScript 기반)
- 전체 상품을 클라이언트로 전송 (최대 10,000개)
- 클라이언트에서 매칭 점수 계산 및 정렬
- 네트워크 전송량: 높음
- 처리 시간: 느림

### 최적화된 방식 (PostgreSQL 함수)
- 데이터베이스에서 매칭 점수 계산 및 정렬
- 필요한 30개만 클라이언트로 전송
- 네트워크 전송량: 낮음 (약 97% 감소)
- 처리 시간: 빠름 (인덱스 활용)

## 문제 해결

### PostgreSQL 함수가 실행되지 않는 경우

1. **함수가 생성되지 않음:**
   - SQL Editor에서 `supabase_preference_matching_setup.sql` 다시 실행
   - Functions 탭에서 함수 존재 여부 확인

2. **RPC 호출 에러:**
   - 브라우저 콘솔에서 에러 메시지 확인
   - Supabase Dashboard > Logs에서 상세 에러 확인
   - 자동으로 기존 방식으로 폴백되므로 앱은 정상 동작합니다

3. **매칭 점수가 0인 경우:**
   - 사용자 취향 태그가 제대로 추출되었는지 확인
   - `ai_tags` 컬럼에 데이터가 있는지 확인
   - 태그 형식이 일치하는지 확인 (대소문자, 공백 등)

## 추가 최적화 옵션

### 인덱스 확인
```sql
-- 인덱스가 제대로 생성되었는지 확인
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'cards' 
AND indexname LIKE '%ai_tags%';
```

### 함수 테스트
```sql
-- 함수가 제대로 동작하는지 테스트
SELECT calculate_tag_match_score(
  '데일리,캐주얼,미니멀',
  ARRAY['데일리', '캐주얼']::TEXT[]
);
-- 예상 결과: 1.0 (2개 태그 모두 매칭)

SELECT * FROM get_preference_based_cards(
  ARRAY['데일리', '캐주얼']::TEXT[],
  NULL::TEXT[],
  10
);
```

