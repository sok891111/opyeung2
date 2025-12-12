# IDF 업데이트 방법

데이터가 추가되었을 때 IDF를 업데이트하는 방법입니다.

## 방법 1: Supabase Dashboard에서 직접 실행 (권장)

1. Supabase Dashboard 접속
2. 좌측 메뉴에서 **SQL Editor** 클릭
3. 다음 SQL 쿼리를 실행:

```sql
-- 방법 A: update_all_tag_idf() 함수 실행 (기존 데이터 유지하며 업데이트)
SELECT update_all_tag_idf();

-- 방법 B: regenerate_tag_idf() 함수 실행 (기존 데이터 삭제 후 재생성, 결과 메시지 반환)
SELECT regenerate_tag_idf();
```

### 실행 결과 확인

```sql
-- 업데이트된 태그 수 확인
SELECT COUNT(*) as total_tags FROM public.tag_idf;

-- IDF 점수 확인 (상위 20개)
SELECT tag, document_count, idf_score, updated_at
FROM public.tag_idf
ORDER BY idf_score DESC
LIMIT 20;

-- 전체 카드 수 확인
SELECT total_cards FROM public.card_statistics WHERE id = 1;
```

## 방법 2: 클라이언트 코드에서 실행 (개발/테스트용)

브라우저 콘솔에서 실행할 수 있는 코드:

```javascript
// Supabase 클라이언트 가져오기
const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
);

// update_all_tag_idf() 실행
const { data, error } = await supabase.rpc('update_all_tag_idf');

if (error) {
  console.error('Error updating IDF:', error);
} else {
  console.log('IDF updated successfully');
}

// 또는 regenerate_tag_idf() 실행 (결과 메시지 반환)
const { data: result, error } = await supabase.rpc('regenerate_tag_idf');
console.log(result); // "IDF regenerated. Total tags: XXX"
```

## 함수 설명

### `update_all_tag_idf()`
- 기존 IDF 데이터를 업데이트합니다
- 전체 카드 수를 다시 계산하고 모든 태그의 IDF 점수를 재계산합니다
- 반환값: 없음 (VOID)

### `regenerate_tag_idf()`
- 기존 IDF 데이터를 완전히 삭제하고 재생성합니다
- `update_all_tag_idf()`를 내부적으로 호출합니다
- 반환값: 결과 메시지 (예: "IDF regenerated. Total tags: 150")

## 자동 업데이트

IDF는 매일 새벽 3시 UTC에 자동으로 업데이트됩니다 (pg_cron 스케줄 설정됨).

수동으로 실행하려면 위의 방법 1을 사용하세요.

