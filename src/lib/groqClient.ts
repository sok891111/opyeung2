/**
 * Groq API 클라이언트
 * 사용자의 스와이프 데이터를 기반으로 옷 취향을 분석합니다.
 */

import Groq from 'groq-sdk';

export type SwipeData = {
  name: string;
  tag?: string;
  city?: string;
  description?: string;
  direction: 'like' | 'nope';
};

export async function analyzeUserPreference(
  swipeData: SwipeData[],
  apiKey: string
): Promise<{ preference: string | null; error: Error | null }> {
  if (!apiKey) {
    return { preference: null, error: new Error('Groq API key not configured') };
  }

  if (swipeData.length === 0) {
    return { preference: null, error: new Error('No swipe data provided') };
  }

  try {
    // 좋아요한 상품과 싫어요한 상품 분리
    const liked = swipeData.filter((s) => s.direction === 'like');
    const noped = swipeData.filter((s) => s.direction === 'nope');

    // 프롬프트 구성
    const prompt = `다음은 사용자가 좋아요/싫어요한 패션 상품 정보입니다.

좋아요한 상품:
${liked.map((item, idx) => 
  `${idx + 1}. 상품명: ${item.name}${item.description ? `, 상품설명: ${item.description}` : ''}${item.tag ? `, 태그: ${item.tag}` : ''}`
).join('\n')}

싫어요한 상품:
${noped.map((item, idx) => 
  `${idx + 1}. 상품명: ${item.name}${item.description ? `, 상품설명: ${item.description}` : ''}${item.tag ? `, 태그: ${item.tag}` : ''}`
).join('\n')}


#제니 (BLACKPINK) :
Quiet Luxury + 샤넬 인간화, 미니멀 블랙&화이트, 트위드 재킷, 미니 원피스, 고급스러운 모노톤, 섹시하지만 과하지 않은 실루엣

#지수 (BLACKPINK)
Old Money & 디올 공주, 클래식·우아·로맨틱, 베이지·네이비·아이보리 톤, 리본·레이스·플리츠, 레이디라이크 룩

#로제 (BLACKPINK)
보헤미안 시크 + 생 로랑 록시크, 블랙 가죽, 플로럴 맥시 드레스, 슬림한 실루엣, 빈티지 느낌

#리사 (BLACKPINK)
힙합 스트릿 + 셀린느, 오버사이즈 후디, 카고 팬츠, 크롭탑, 스니커즈, 볼드 체인·모자

#장원영 (IVE)
Y2K 프린세스 + 발레코어, 미니 스커트, 리본, 크롭탑, 메리제인 슈즈, 파스텔·화이트 중심, 인형 같은 완벽 비율 룩

#안유진 (IVE)
뉴트럴 Quiet Luxury + 테일러드, 오버사이즈 블레이저, 와이드 슬랙스, 버터옐로우·베이지 톤, 세련된 오피스 룩 변형

#카리나 (aespa)
Y2K 퓨처리즘 + 메탈릭, 크롬 실버, 레더 재킷, 플랫폼 부츠, 과감한 크롭, 사이버펑크 느낌

#윈터 (aespa)
미니멀 스트릿 + 깔끔한 모노톤, 블랙 스키니, 오버사이즈 데님 재킷, 스니커즈, 쿨톤 매치

#민지 (NewJeans)
발레코어 + 스쿨룩, 리본 블라우스, 플리츠 스커트, 발레 플랫, 화이트 삭스, 청순+힙한 조합

#해린 (NewJeans)
Old Money 미니멀, 오버사이즈 셔츠, 와이드 팬츠, 로퍼, 베이지·그레이 톤, 노출 거의 없는 깔끔함

#허윤진 (LE SSERAFIM)
Y2K 힙합 + 고프코어, 로우라이즈 카고, 크롭탑, 빈티지 스니커즈, 미국식 캐주얼

#카즈하 (LE SSERAFIM)
발레코어 + 우아 스트릿, 레그워머, 오프숄더 니트, 슬림한 실루엣, 발레리나 오프듀티

#아이유
청순 레트로 + 자연미, 플로럴 원피스, 카디건, 데님+티셔츠, 파스텔·베이지, 동네 소녀 같은 편안함

#태연 (소녀시대)
캐주얼 레이어드 마스터, 오버사이즈 후디·셔츠, 와이드 진, 빈티지 느낌, 절대 평범하지 않은 디테일

#수지
청순 미니멀 + 페미닌, 화이트 원피스, 트렌치코트, 플랫 슈즈, 맑고 깨끗한 국민 첫사랑 스타일

#김지원
실제 Old Money 끝판왕, 고급스러운 실크 블라우스, 테일러드 코트, 뉴트럴 톤, 드라마 속 재벌 3세 그대로

#한소희
섹시 스트릿 + 시크, 가죽 팬츠, 크롭 가디건, 스모키 메이크업, 반항적인 분위기

#윤아 (소녀시대)
클래식 페미닌, 원피스+하이힐, 깔끔한 헤어, 공주 같은 우아함, 브랜드 행사 룩의 정석

#강민경
글램 & 바디라인 강조, 타이트 원피스, 하이웨이스트, 화려한 액세서리, 인스타 감성 섹시룩

#twice 나연
상큼 발랄 + Y2K, 컬러풀 코디, 리본·하트 패턴, 귀여운 미니 백, 버니즈 스타일

위 정보를 바탕으로 사용자의 패션 취향을 태그 형태로 간단하게 분석해주세요.
- 좋아요한 상품들의 공통 특징을 태그로 추출하세요 (예: 미니멀, 캐주얼, 실용적, 여성스러움, 트렌디 등)
- 싫어요한 상품들의 특징도 참고하여 선호하지 않는 스타일을 파악하세요
- 최종적으로 사용자가 좋아하는 취향에 대해 문장 설명과 함께 3-5개의 태그를 #태그 형태로 쉼표로 구분하여 제시하세요
- 싫어하는 내용에 대해서는 설명하지 마세요.
- 한국어로 작성하고, 친절하게 표현해주세요
- 사용자는 "고객님" 으로 명칭해주세요.
- 한국의 대표 여자 연애인중 20명 중 가장 비슷한 스타일을 가진 연예인을 1명만 골라서 이름과 이유도 설명해주세요.
- 답변 포맷은 아래와 같이 작성해주세요. 그 외에 문장은 작성하지 마세요
{사용자가 좋아하는 취향에 대한 친절한 설명}

###비슷한 스타일의 연애인
{유사 연애인과 이유}

{태그}`;

    // 프롬프트를 console.log로 출력
    console.log('[Groq API] Request Prompt:', prompt);

    // Groq SDK 초기화
    const groq = new Groq({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });

    // 스트리밍 비활성화하여 일반 응답 받기
    const chatCompletion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        {
          role: 'system',
          content: '당신은 패션 스타일 분석 전문가입니다. 사용자의 상품 선호도를 바탕으로 취향을 태그 형태로 간단하게 분석합니다.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_completion_tokens: 8192,
      stream: false,
      reasoning_effort: "medium"
        
    });

    const preference = chatCompletion.choices[0]?.message?.content?.trim();

    // 응답을 console.log로 출력
    console.log('[Groq API] Response:', preference);
    console.log('[Groq API] Full Response:', JSON.stringify(chatCompletion, null, 2));

    if (!preference) {
      throw new Error('No preference text returned from Groq API');
    }

    return { preference, error: null };
  } catch (err) {
    console.error('Groq API error:', err);
    return { preference: null, error: err as Error };
  }
}

