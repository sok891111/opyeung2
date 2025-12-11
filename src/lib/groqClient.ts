/**
 * Groq API 클라이언트
 * 사용자의 스와이프 데이터를 기반으로 옷 취향을 분석합니다.
 */

import Groq from 'groq-sdk';

export type SwipeData = {
  name: string;
  tag?: string;
  city?: string;
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
  `${idx + 1}. 상품명: ${item.name}${item.tag ? `, 태그: ${item.tag}` : ''}${item.city ? `, 지역: ${item.city}` : ''}`
).join('\n')}

싫어요한 상품:
${noped.map((item, idx) => 
  `${idx + 1}. 상품명: ${item.name}${item.tag ? `, 태그: ${item.tag}` : ''}${item.city ? `, 지역: ${item.city}` : ''}`
).join('\n')}

위 정보를 바탕으로 사용자의 패션 취향을 태그 형태로 간단하게 분석해주세요.
- 좋아요한 상품들의 공통 특징을 태그로 추출하세요 (예: 미니멀, 캐주얼, 실용적, 여성스러움, 트렌디 등)
- 싫어요한 상품들의 특징도 참고하여 선호하지 않는 스타일을 파악하세요
- 최종적으로 사용자가 좋아하는 취향에 대해 문장 설명과 함께 3-5개의 태그를 #태그 형태로 쉼표로 구분하여 제시하세요
- 싫어하는 내용에 대해서는 설명하지 마세요.
- 한국어로 작성하고, 친절하게 표현해주세요
- 사용자는 "고객님" 으로 명칭해주세요.
- 답변 포맷은 아래와 같이 작성해주세요. 그 외에 문장은 작성하지 마세요
{사용자가 좋아하는 취향에 대한 친절한 설명}

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

