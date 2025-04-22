const OpenAI = require('openai');
const fs = require('fs').promises;
const config = require('./config');

class ContentAnalyzer {
    constructor(apiKey) {
        this.openai = new OpenAI({
            apiKey: apiKey
        });
    }

    async analyzePPTContent(slides, analysisType = 'standard') {
        try {
            console.log(`슬라이드 분석 시작... (분석 타입: ${analysisType})`);
            
            const slidesMetadata = this.generateMetadata(slides);
            const analysisResults = await this.analyzeSlides(slidesMetadata, analysisType);
            await this.saveAnalysisResults(analysisResults);
    
            return analysisResults;
        } catch (error) {
            console.error('콘텐츠 분석 중 오류 발생:', error);
            throw error;
        }
    }

    generateMetadata(slides) {
        return slides.map((slide, index) => ({
            slideNumber: index + 1,
            totalSlides: slides.length,
            hasImages: slide.images.length > 0,
            imagePaths: slide.images.map(img => img.path)
        }));
    }

    detectContentType(slide) {
        const text = slide.text.join(' ').toLowerCase();
        const hasNumbers = /\d+([.,]\d+)?%?/.test(text);
        const hasTheory = /(개념|이론|원리|정의)/.test(text);
        const hasCase = /(사례|케이스|예시|예제)/.test(text);
        
        if (hasNumbers && slide.images.some(img => img.path.includes('chart'))) {
            return 'DATA';
        } else if (hasTheory) {
            return 'CONCEPT';
        } else if (hasCase) {
            return 'CASE';
        } else if (slide.images.length > 0) {
            return 'VISUAL';
        }
        return 'GENERAL';
    }

    getSlidePosition(index, total) {
        if (index === 0) return 'INTRO';
        if (index === total - 1) return 'CONCLUSION';
        if (index < total * 0.2) return 'OPENING';
        if (index > total * 0.8) return 'CLOSING';
        return 'MAIN';
    }

    async analyzeSlides(slidesMetadata, analysisType = 'standard') {
        console.log('개별 슬라이드 분석 중...');
        
        // 이미지 처리 재시도 설정
        const maxRetries = 3;
        const retryDelay = 1000; // 1초
    
        const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        
        const analysisPromises = slidesMetadata.map(async (metadata) => {
            const slideAnalysis = {
                slideNumber: metadata.slideNumber,
                analysis: null,
                metadata: metadata
            };
    
            const contextInfo = this.createContextInfo(metadata);
            
            try {
                const messages = [{
                    role: "user",
                    content: []
                }];
    
                // 1. 텍스트 프롬프트 추가
                messages[0].content.push({
                    type: "text",
                    text: this.generatePrompt(metadata, contextInfo ,analysisType)
                });
    
                // 2. 이미지 처리 (재시도 로직 포함)
                if (metadata.hasImages) {
                    for (const imagePath of metadata.imagePaths) {
                        let retryCount = 0;
                        let success = false;
                        let lastError = null;
    
                        while (retryCount < maxRetries && !success) {
                            try {
                                if (retryCount > 0) {
                                    console.log(`이미지 처리 재시도 중 (${retryCount}/${maxRetries}): ${imagePath}`);
                                    await wait(retryDelay * retryCount); // 점진적인 대기 시간
                                }
    
                                // 이미지 파일 존재 확인
                                await fs.access(imagePath);
                                
                                // 이미지 크기 확인
                                const stats = await fs.stat(imagePath);
                                if (stats.size === 0) {
                                    throw new Error('이미지 파일이 비어있습니다');
                                }
    
                                const imageBuffer = await fs.readFile(imagePath);
                                const base64Image = imageBuffer.toString('base64');
    
                                // base64 인코딩 유효성 검사
                                if (!base64Image || base64Image.length === 0) {
                                    throw new Error('유효하지 않은 base64 인코딩');
                                }
    
                                messages[0].content.push({
                                    type: "image_url",
                                    image_url: {
                                        url: `data:image/png;base64,${base64Image}`
                                    }
                                });
    
                                success = true;
                                console.log(`이미지 처리 성공: ${imagePath}`);
    
                            } catch (err) {
                                lastError = err;
                                retryCount++;
                                console.warn(`이미지 처리 실패 (시도 ${retryCount}/${maxRetries}): ${imagePath}`, err);
                            }
                        }
    
                        if (!success) {
                            console.error(`이미지 처리 최종 실패: ${imagePath}`, lastError);
                            // 이미지 처리 실패를 프롬프트에 알림
                            messages[0].content[0].text += `\n\n[주의: 이미지 처리 실패로 인해 일부 시각적 정보가 누락되었을 수 있습니다.]`;
                        }
                    }
                }
    
                // 3. API 호출 (재시도 로직 포함)
                let apiRetryCount = 0;
                let apiSuccess = false;
                let apiLastError = null;
    
                while (apiRetryCount < maxRetries && !apiSuccess) {
                    try {
                        if (apiRetryCount > 0) {
                            console.log(`API 호출 재시도 중 (${apiRetryCount}/${maxRetries})`);
                            await wait(retryDelay * apiRetryCount);
                        }
    
                        const response = await this.openai.chat.completions.create({
                            model: "gpt-4o",
                            messages: messages
                        });
    
                        slideAnalysis.analysis = response.choices[0].message.content;
                        apiSuccess = true;
    
                    } catch (err) {
                        apiLastError = err;
                        apiRetryCount++;
                        console.warn(`API 호출 실패 (시도 ${apiRetryCount}/${maxRetries}):`, err);
                    }
                }
    
                if (!apiSuccess) {
                    console.error('API 호출 최종 실패:', apiLastError);
                    throw apiLastError;
                }
    
                // 4. 분석 결과 임시 저장
                const tempPath = config.getFullPath('temp', 'getSlideJsonName', metadata.slideNumber);
                await fs.writeFile(tempPath, JSON.stringify(slideAnalysis, null, 2));
                config.addTempFile(tempPath);
    
            } catch (error) {
                console.error(`슬라이드 ${metadata.slideNumber} 분석 중 오류:`, error);
                slideAnalysis.analysis = `슬라이드 ${metadata.slideNumber}의 분석 중 오류가 발생했습니다. 다시 시도해 주세요.`;
            }
    
            return slideAnalysis;
        });
    
        return Promise.all(analysisPromises);
    }

    createContextInfo(metadata) {
        return {
            currentSlide: metadata,
            isFirstSlide: metadata.slideNumber === 1,
            isLastSlide: metadata.slideNumber === metadata.totalSlides,
            totalSlides: metadata.totalSlides
        };
    }

    async analyzeSlideWithCustomPrompt(imagePath, context, direction = 'normal', additionalText = "") {
        try {
            // 이미지 처리
            const imageBuffer = await fs.readFile(imagePath);
            const base64Image = imageBuffer.toString('base64');
            
            // 방향에 따른 프롬프트 조정
            let directionPrompt = "";
            switch(direction) {
                case 'simplify':
                    directionPrompt = "이 슬라이드의 내용을 더 간결하고 이해하기 쉽게 설명해주세요. 핵심 개념만 집중하여 설명하고, 복잡한 용어나 개념은 단순화해서 설명해주세요.";
                    break;
                case 'deepen':
                    directionPrompt = "이 슬라이드의 내용을 더 깊이있게 분석하고 추가적인 통찰을 제공해주세요. 관련된 고급 개념과 이론적 배경, 다양한 관점에서의 해석을 포함해주세요.";
                    break;
                case 'academic':
                    directionPrompt = "이 슬라이드의 내용을 학문적 관점에서 접근하고, 관련 문헌과 연구를 인용해주세요. 해당 분야의 주요 연구자들의 관점과 학술적 담론을 포함해주세요.";
                    break;
                case 'practical':
                    directionPrompt = "이 슬라이드의 내용을 실제 사례와 응용 방법 중심으로 설명해주세요. 이론이 실무에서 어떻게 적용되는지, 관련 성공 사례와 실패 사례를 포함해 설명해주세요.";
                    break;
                case 'normal':
                default:
                    directionPrompt = "이 슬라이드의 내용을 강의 스크립트로 생성해주세요. 전체 강의 흐름과의 연결성을 고려하면서, 명확하고 정확한 설명을 제공해주세요.";
                    break;
            }
            
            // 프롬프트 구성
            const basePrompt = this.generateCustomAnalysisPrompt(context, directionPrompt, additionalText);
            
            // 메시지 구성
            const messages = [{
                role: "user",
                content: [
                    {
                        type: "text",
                        text: basePrompt
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/png;base64,${base64Image}`
                        }
                    }
                ]
            }];
            
            // 호출 옵션 설정
            const options = {
                model: "gpt-4o",
                messages: messages
            };
            
            // OpenAI API 호출
            const response = await this.openai.chat.completions.create(options);
            
            return response.choices[0].message.content;
        } catch (error) {
            console.error('슬라이드 분석 중 오류:', error);
            throw error;
        }
    }
    
    // 커스텀 분석 프롬프트 생성 메서드
    generateCustomAnalysisPrompt(context, directionPrompt, additionalText = "") {
        // 기본 프롬프트 구성
        let prompt = `
    [슬라이드 분석 요청]
    이 강의 슬라이드를 분석하고 강의 스크립트를 작성해주세요. 이 슬라이드는 전체 강의의 일부입니다.
    
    [슬라이드 정보]
    - 슬라이드 번호: ${context.currentSlide.slideNumber} / ${context.totalSlides}
    - 위치: ${context.currentSlide.slideNumber === 1 ? '첫 슬라이드' : 
            context.currentSlide.slideNumber === context.totalSlides ? '마지막 슬라이드' : '중간 슬라이드'}
    
    [방향성 지침]
    ${directionPrompt}
    
    [전체 강의 맥락 유지]
    - 전체 강의 흐름과의 일관성을 유지해주세요.
    - 다른 슬라이드와의 연결성을 고려해주세요.
    - "이번 슬라이드에서는"과 같은 표현으로 시작하지 말아주세요.
    `;
    
        // 이전/다음 슬라이드 정보 추가 (연결성 유지)
        if (context.previousSlide) {
            prompt += `
    [이전 슬라이드 내용 요약]
    ${context.previousSlide.analysis.substring(0, 200)}...
    `;
        }
        
        if (context.nextSlide) {
            prompt += `
    [다음 슬라이드 내용 요약]
    ${context.nextSlide.analysis.substring(0, 200)}...
    `;
        }
        
        // 사용자 추가 지시사항 추가
        if (additionalText && additionalText.trim()) {
            prompt += `
    [추가 지시사항]
    ${additionalText.trim()}
    `;
        }
        
        return prompt;
    }

    generatePrompt(metadata, contextInfo, analysisType = 'standard') {
        const imageAnalysisGuidelines = `
    [이미지 분석 심화 지침]
    이미지에 포함된 요소를 텍스트와 연계하여 종합적으로 분석하세요:
    
       - 슬라이드 텍스트와 삽화 혹은 표의 의미적 연결성 파악
    `;
        // 기존 프롬프트는 'standard' 타입으로 처리
        if (analysisType === 'standard') {
            return `
            [이미지 분석 요청]
            주어진 슬라이드 이미지를 분석하세요.
    
            [분석 및 통찰 단계]
    
            1. 심층 의미 분석
            기본 분석을 넘어 더 깊은 의미를 탐색하세요:
            - 표면적 데이터나 정보가 시사하는 근본적인 의미
            - 명시적으로 드러나지 않은 함축적 의미
    
            2. 맥락 확장
            주제를 더 넓은 맥락에서 해석하세요:
            - 산업/기술/사회적 영향과 의미
            - 현재 트렌드와의 연관성
            - 미래 발전 방향에 대한 예측
            - 잠재적 기회와 도전 과제
    
    
            [통찰력 있는 분석 예시]
            "표면적으로는 AI 도입 기업의 성과 지표를 보여주고 있지만, 더 깊이 들여다보면 기업의 디지털 전환이 단순한 기술 도입을 넘어 근본적인 비즈니스 모델의 변화를 요구하고 있음을 시사합니다.
    
            30%의 생산성 향상이라는 수치 이면에는 업무 프로세스의 재정의, 의사결정 체계의 변화, 그리고 조직 문화의 전환이 전제되어 있습니다. 특히 주목할 점은 성과가 높은 기업들의 공통된 특징이 기술 자체보다는 '조직의 수용성'과 '변화 관리 역량'에 있다는 것입니다.
    
            이는 향후 AI 도입 전략에서 기술적 요소와 함께 다음과 같은 관점이 중요해질 것을 시사합니다:
            1) 조직 구성원의 디지털 리터러시 향상
            2) 데이터 기반 의사결정 문화 정착
            3) 부서간 협업 모델 재정립
    
            또한 슬라이드 하단의 시계열 데이터는 이러한 변화가 단계적으로 이루어져야 함을 보여주며, 이는 성급한 전환보다 체계적이고 점진적인 접근이 더 효과적임을 암시합니다."
    
            [강조할 점]
            - 표면적 분석을 넘어선 깊이 있는 통찰
            - 다양한 관점에서의 해석
            - 시사점 도출
    
            [지양할 점]
            - 단순한 사실 나열
            - 피상적인 데이터 해석
            - 일반적이고 뻔한 결론
            `;
        } 
        // 새로운 '학문적 분석' 타입 추가
        else if (analysisType === 'academic') {
            return `
            [이미지 분석 요청]
            주어진 슬라이드 이미지를 분석하세요.

            [분석 프레임워크]

            - 제시된 개념, 이론, 용어의 정확한 정의
            - 개념 간의 관계와 위계 구조 파악
            - 개념의 역사적 발전 과정과 학문적 맥락
            - 제시된 데이터나 실험의 방법론적 검토
            - 통계적 분석의 정확성과 의미
            - 관련 학술 문헌과의 연계성


             ${imageAnalysisGuidelines}
    
            [분석 예시]
            "신경언어학적 관점에서 이중언어 사용자의 언어 처리 메커니즘을 제시하고 있습니다. 핵심적으로 Grosjean(1989)의 언어 모드 연속체(Language Mode Continuum) 개념을 토대로, 이중언어 사용자의 언어 활성화가 상황 의존적인 연속선상에 있음을 보여줍니다.
    
            제시된 뇌 영상 데이터는 fMRI를 활용한 Green(1998)의 억제 통제 모델(Inhibitory Control Model)을 실증적으로 뒷받침합니다. 좌측 전두엽의 활성화 패턴은 언어 전환 시 발생하는 인지적 억제 기제를 명확히 보여주며, 이는 Abutalebi와 Green(2007)의 메타분석 결과와도 일치합니다. 특히 그래프에 제시된 반응 시간 지연(평균 78ms)은 Costa와 Santesteban(2004)의 언어 전환 비용(language switching cost) 연구 결과(70-85ms)와 통계적으로 유의미한 범위 내에 있습니다.
    
            언어학적 상대성 원리(Linguistic Relativity)를 지지하는 증거를 제공하면서도, 인지심리학의 작업기억 모델과 연결되는 지점을 보여줍니다. Baddeley(2000)의 작업기억 모델에서 제시한 음운적 루프(phonological loop)와 두 언어 간의 상호작용이 특히 주목할 만합니다.
    
            방법론적으로 피험자 내 설계(within-subject design)를 채택했으며, 언어 능숙도를 공변량으로 통제했습니다. 다만, 표본 크기(n=42)가 다소 제한적이며, 언어 쌍의 유형학적 거리(typological distance)에 따른 효과 크기 차이를 충분히 고려하지 않은 한계점이 있습니다."
    
            [분석 지침]
            - 전문 용어와 이론을 정확하게 사용하고 필요시 간결하게 설명
            - 데이터와 통계를 학문적 맥락에서 해석
            - 과학적 증거와 이론적 프레임워크 간의 연결성 제시
            - 해당 분야의 학술적 논쟁이나 담론 맥락 제공
            - 방법론적 강점과 한계 평가
            - 학문적 정확성을 위해 구체적인 수치와 출처 언급
            
            [지양할 점]
            - 대중적 단순화
            - 학문적 엄밀성 없는 일반화
            - 이론이나 방법론에 대한 피상적 언급
            - 개인적 의견이나 비학문적 평가
            - "이 슬라이드는"과 같은 직접적 언급으로 시작하는 방식
            `;
        }
    }

    
    async saveAnalysisResults(analysisResults) {
        try {
            // 메타데이터에서 불필요한 필드 제거
            const cleanedResults = analysisResults.map(result => {
                const { metadata, ...rest } = result;
                const cleanedMetadata = {
                    slideNumber: metadata.slideNumber,
                    totalSlides: metadata.totalSlides,
                    hasImages: metadata.hasImages,
                    imagePaths: metadata.imagePaths
                };
                return {
                    ...rest,
                    metadata: cleanedMetadata
                };
            });
    
            const analysisPath = config.getFullPath('extracted', 'getFinalAnalysis');
            await fs.writeFile(
                analysisPath,
                JSON.stringify(cleanedResults, null, 2),
                'utf-8'
            );
        } catch (error) {
            console.error('분석 결과 저장 중 오류:', error);
            throw error;
        }
    }
}

module.exports = ContentAnalyzer;