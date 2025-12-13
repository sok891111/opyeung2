# Vercel 시간대 설정 가이드

## 개요

Vercel의 서버 시간대는 변경할 수 없습니다 (UTC 고정). 하지만 환경 변수를 통해 애플리케이션에서 사용할 시간대 오프셋을 설정할 수 있습니다.

## 환경 변수 설정

### Vercel Dashboard에서 설정

1. Vercel Dashboard에 로그인
2. 프로젝트 선택
3. **Settings** → **Environment Variables** 이동
4. 다음 환경 변수 추가:
   - **Key**: `VITE_TIMEZONE_OFFSET_HOURS`
   - **Value**: `9` (한국 시간대, UTC+9)
   - **Environment**: Production, Preview, Development 모두 선택

### Vercel CLI로 설정

```bash
vercel env add VITE_TIMEZONE_OFFSET_HOURS
# 값 입력: 9
# 환경 선택: Production, Preview, Development
```

## 시간대 오프셋 값

- **한국 시간대 (KST)**: `9` (기본값)
- **일본 시간대 (JST)**: `9`
- **중국 시간대 (CST)**: `8`
- **미국 동부 시간대 (EST)**: `-5` (또는 `-4` 서머타임)
- **미국 서부 시간대 (PST)**: `-8` (또는 `-7` 서머타임)

## 주의사항

1. **서버 시간대는 변경되지 않습니다**
   - Vercel의 서버는 여전히 UTC를 사용합니다
   - 이 설정은 클라이언트 측 코드에서 시간 계산 시 사용됩니다

2. **클라이언트 측 실행**
   - 이 애플리케이션은 클라이언트 사이드 React 앱입니다
   - 브라우저에서 실행되므로 브라우저의 로컬 시간대를 사용할 수도 있습니다
   - 하지만 일관성을 위해 환경 변수로 설정된 오프셋을 사용합니다

3. **Supabase 저장**
   - Supabase는 UTC로 저장됩니다 (표준)
   - 환경 변수 설정은 쿼리 시 필터링에만 영향을 줍니다

## 코드에서의 사용

환경 변수가 설정되지 않은 경우 기본값 9 (KST)를 사용합니다:

```typescript
// src/lib/timezoneUtils.ts
const TIMEZONE_OFFSET_HOURS = Number(import.meta.env.VITE_TIMEZONE_OFFSET_HOURS) || 9;
```

## 배포 후 확인

배포 후 환경 변수가 제대로 설정되었는지 확인:

1. 브라우저 개발자 도구 열기
2. Console에서 확인:
   ```javascript
   console.log('Timezone offset:', import.meta.env.VITE_TIMEZONE_OFFSET_HOURS);
   ```

## 추가 정보

- Vercel 환경 변수 문서: https://vercel.com/docs/concepts/projects/environment-variables
- 시간대 오프셋 목록: https://en.wikipedia.org/wiki/List_of_UTC_time_offsets

