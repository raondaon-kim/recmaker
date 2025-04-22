// modules/SubtitleGenerator.js
const fs = require('fs').promises;
const path = require('path');
const config = require('./config');
const OpenAI = require('openai');
const { createReadStream } = require('fs');

class SubtitleGenerator {
    constructor(apiKey) {
        this.openai = new OpenAI({
            apiKey: apiKey
        });
    }

    /**
     * Whisper API를 사용하여 오디오에서 자막 생성
     * @param {string} audioPath - 오디오 파일 경로
     * @param {string} scriptText - 원본 스크립트 텍스트 (비교용)
     * @returns {Promise<Object>} - 생성된 자막 정보
     */
    async generateSubtitlesWithWhisper(audioPath, scriptText) {
        try {
            console.log(`Whisper API를 통한 자막 생성 시작: ${audioPath}`);
            
            // 오디오 파일을 Whisper API에 전송
            const transcription = await this.openai.audio.transcriptions.create({
                file: createReadStream(audioPath),
                model: "whisper-1",
                response_format: "verbose_json", // 시간 정보 포함된 결과 요청
                timestamp_granularities: ["segment"],
                language: "ko"
            });
            
            console.log(`Whisper API 응답 성공, ${transcription.segments?.length || 0}개 세그먼트 수신`);
            
            // 원본 스크립트와 인식된 텍스트 비교 (디버깅 및 로깅용)
            const recognizedText = transcription.text;
            console.log("=== 스크립트 비교 ===");
            console.log(`[원본]: ${scriptText.substring(0, 200)}...`);
            console.log(`[인식]: ${recognizedText.substring(0, 200)}...`);
            
            // 세그먼트(타임스탬프) 정보 추출
            if (!transcription.segments || transcription.segments.length === 0) {
                console.warn("Whisper API가 세그먼트 정보를 반환하지 않았습니다. 대체 방법 사용.");
                // 대체 방법: 스크립트 텍스트로 기본 자막 생성
                return this.generateSrtFromScript(scriptText, audioPath);
            }
            
            // SRT 형식 생성
            let srtContent = '';
            transcription.segments.forEach((segment, index) => {
                const startTime = segment.start;
                const endTime = segment.end;
                const text = segment.text.trim();
                
                if (text) {
                    srtContent += `${index + 1}\n`;
                    srtContent += `${this.formatSrtTime(startTime)} --> ${this.formatSrtTime(endTime)}\n`;
                    srtContent += `${text}\n\n`;
                }
            });
            
            // VTT 형식으로 변환
            const vttContent = this.convertSrtToVtt(srtContent);
            
            return {
                srtContent,
                vttContent,
                recognizedText
            };
        } catch (error) {
            console.error('Whisper API 자막 생성 오류:', error);
            console.log('대체 방법으로 스크립트 기반 자막 생성 시도...');
            
            // 오류 발생 시 스크립트 텍스트 기반으로 대체 방법 사용
            return this.generateSrtFromScript(scriptText, audioPath);
        }
    }

    /**
     * 스크립트 텍스트 기반으로 자막 생성 (대체 방법)
     * @param {string} scriptText - 스크립트 텍스트
     * @param {string} audioPath - 오디오 파일 경로 (길이 계산용)
     * @returns {Promise<Object>} - 생성된 자막 정보
     */
    async generateSrtFromScript(scriptText, audioPath) {
        // 오디오 길이 가져오기
        const audioDuration = await this.getAudioDuration(audioPath);
        
        // 텍스트를 문장 단위로 분리
        const sentences = this.splitTextIntoSentences(scriptText);
        
        // 전체 오디오 길이를 문장 수로 나누어 각 문장의 평균 지속 시간 계산
        const avgDuration = audioDuration / sentences.length;
        
        let srtContent = '';
        let startTime = 0;
        
        sentences.forEach((sentence, index) => {
            if (sentence.trim() === '') return;
            
            // 이 문장의 지속 시간 (문장 길이에 비례하여 조정)
            const sentenceLength = sentence.length;
            const sentenceDuration = (sentenceLength / 50) * avgDuration; // 50자를 기준으로 조정
            
            // 시작 시간과 종료 시간 계산
            const endTime = startTime + sentenceDuration;
            
            // SRT 형식으로 변환
            srtContent += `${index + 1}\n`;
            srtContent += `${this.formatSrtTime(startTime)} --> ${this.formatSrtTime(endTime)}\n`;
            srtContent += `${sentence.trim()}\n\n`;
            
            // 다음 문장의 시작 시간 설정
            startTime = endTime;
        });
        
        // VTT 형식으로 변환
        const vttContent = this.convertSrtToVtt(srtContent);
        
        return {
            srtContent,
            vttContent,
            recognizedText: scriptText
        };
    }

    /**
     * 음성 파일의 길이를 계산 (초 단위)
     * @param {string} audioFilePath - 오디오 파일 경로
     * @returns {Promise<number>} - 오디오 길이 (초)
     */
    async getAudioDuration(audioFilePath) {
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);

        try {
            const { stdout } = await execPromise(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioFilePath}"`);
            return parseFloat(stdout.trim());
        } catch (error) {
            console.error('오디오 길이 계산 오류:', error);
            // 오류 발생 시 기본값 반환 (30초)
            return 30;
        }
    }

    /**
     * 시간을 SRT 형식으로 변환 (HH:MM:SS,mmm)
     * @param {number} timeInSeconds - 초 단위 시간
     * @returns {string} - SRT 형식의 시간
     */
    formatSrtTime(timeInSeconds) {
        const hours = Math.floor(timeInSeconds / 3600);
        const minutes = Math.floor((timeInSeconds % 3600) / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        const milliseconds = Math.floor((timeInSeconds - Math.floor(timeInSeconds)) * 1000);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
    }

    /**
     * 텍스트를 문장 단위로 분리
     * @param {string} text - 분리할 텍스트
     * @returns {string[]} - 문장 배열
     */
    splitTextIntoSentences(text) {
        // 문장 구분자로 텍스트 분리 (마침표, 물음표, 느낌표)
        const sentences = text.split(/(?<=[.!?])\s+/);
        
        // 너무 긴 문장은 추가로 분리
        const result = [];
        sentences.forEach(sentence => {
            if (sentence.length > 80) {
                // 쉼표, 세미콜론 등으로 긴 문장 추가 분리
                const subSentences = sentence.split(/(?<=[,;])\s+/);
                result.push(...subSentences);
            } else {
                result.push(sentence);
            }
        });
        
        return result;
    }

    /**
     * SRT 형식을 VTT 형식으로 변환
     * @param {string} srtContent - SRT 내용
     * @returns {string} - VTT 형식의 내용
     */
    convertSrtToVtt(srtContent) {
        // WEBVTT 헤더 추가
        let vttContent = 'WEBVTT\n\n';
        
        // SRT에서 VTT로 변환 (쉼표를 점으로 변경)
        vttContent += srtContent.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
        
        return vttContent;
    }

    /**
     * 슬라이드별 자막 생성
     * @param {number} slideNumber - 슬라이드 번호
     * @param {string} audioPath - 오디오 파일 경로 
     * @param {string} scriptText - 스크립트 텍스트
     * @returns {Promise<Object>} - 생성된 자막 파일 경로
     */
    async generateSlideSubtitles(slideNumber, audioPath, scriptText) {
        try {
            // Whisper API로 자막 생성
            const subtitleData = await this.generateSubtitlesWithWhisper(audioPath, scriptText);
            
            // 자막 디렉토리 생성
            const subtitlesDir = config.getDirPath('subtitles');
            await fs.mkdir(subtitlesDir, { recursive: true });
            
            // config.getFileName 대신 직접 파일 이름 생성
            const srtFileName = `slide_${slideNumber}.srt`;
            const vttFileName = `slide_${slideNumber}.vtt`;
            
            // 자막 파일 경로
            const srtPath = path.join(subtitlesDir, srtFileName);
            const vttPath = path.join(subtitlesDir, vttFileName);
            
            // 자막 파일 저장
            await fs.writeFile(srtPath, subtitleData.srtContent, 'utf-8');
            await fs.writeFile(vttPath, subtitleData.vttContent, 'utf-8');
            
            // 공개 경로 생성
            const sessionPrefix = config.sessionId ? `/${config.sessionId}` : '';
            const srtPublicPath = `/subtitles${sessionPrefix}/${srtFileName}`;
            const vttPublicPath = `/subtitles${sessionPrefix}/${vttFileName}`;
            
            return {
                srtPath,
                vttPath,
                srtPublicPath,
                vttPublicPath
            };
        } catch (error) {
            console.error(`슬라이드 ${slideNumber} 자막 생성 오류:`, error);
            throw error;
        }
    }

    /**
     * 여러 SRT 파일을 타임스탬프 조정 후 하나로 병합
     * @param {number} slideCount - 전체 슬라이드 수
     * @returns {Promise<Object>} - 합쳐진 자막 파일 경로
     */
    async mergeSubtitles(slideCount) {
        try {
            // 자막 디렉토리
            const subtitlesDir = config.getDirPath('subtitles');
            
            // 각 슬라이드별 SRT 자막 로드
            const slideSrtContents = [];
            let totalDuration = 0;
            
            for (let i = 1; i <= slideCount; i++) {
                try {
                    // 슬라이드별 SRT 파일 경로 (직접 계산)
                    const srtFileName = `slide_${i}.srt`;
                    const srtPath = path.join(subtitlesDir, srtFileName);
                    
                    // 파일 존재 확인
                    await fs.access(srtPath);
                    
                    // SRT 내용 읽기
                    const srtContent = await fs.readFile(srtPath, 'utf-8');
                    
                    // 슬라이드 오디오 길이 계산
                    const audioPath = config.getAudioPath('getSlideAudioName', i);
                    const slideDuration = await this.getAudioDuration(audioPath);
                    
                    // 내용과 지속 시간 저장
                    slideSrtContents.push({
                        content: srtContent,
                        duration: slideDuration
                    });
                    
                    totalDuration += slideDuration;
                } catch (error) {
                    console.warn(`슬라이드 ${i}의 자막 파일을 찾을 수 없습니다:`, error.message);
                }
            }
            
            if (slideSrtContents.length === 0) {
                throw new Error('합칠 자막 파일이 없습니다.');
            }
            
            // 자막 병합
            let mergedSrtContent = '';
            let currentIndex = 1;
            let currentTime = 0;
            
            for (const slide of slideSrtContents) {
                // 각 슬라이드의 자막 내용 파싱
                const subtitleBlocks = slide.content.trim().split('\n\n');
                
                for (const block of subtitleBlocks) {
                    if (!block.trim()) continue;
                    
                    const lines = block.split('\n');
                    if (lines.length < 3) continue;
                    
                    // 시간 정보 추출
                    const timeInfo = lines[1];
                    const [startTime, endTime] = timeInfo.split(' --> ').map(t => this.parseTimeToSeconds(t));
                    
                    // 새로운 시간 계산
                    const newStartTime = currentTime + startTime;
                    const newEndTime = currentTime + endTime;
                    
                    // 새 블록 추가
                    mergedSrtContent += `${currentIndex}\n`;
                    mergedSrtContent += `${this.formatSrtTime(newStartTime)} --> ${this.formatSrtTime(newEndTime)}\n`;
                    
                    // 자막 텍스트 (3번째 줄부터 끝까지)
                    for (let i = 2; i < lines.length; i++) {
                        mergedSrtContent += `${lines[i]}\n`;
                    }
                    
                    mergedSrtContent += '\n';
                    currentIndex++;
                }
                
                // 다음 슬라이드의 시작 시간 조정
                currentTime += slide.duration;
            }
            
            // VTT로 변환
            const mergedVttContent = this.convertSrtToVtt(mergedSrtContent);
            
            // 직접 파일 이름 생성
            const finalSrtFileName = 'final_lecture_subtitle.srt';
            const finalVttFileName = 'final_lecture_subtitle.vtt';
            
            // 최종 자막 파일 저장
            const finalSrtPath = path.join(subtitlesDir, finalSrtFileName);
            const finalVttPath = path.join(subtitlesDir, finalVttFileName);
            
            await fs.writeFile(finalSrtPath, mergedSrtContent, 'utf-8');
            await fs.writeFile(finalVttPath, mergedVttContent, 'utf-8');
            
            // 공개 경로 생성
            const sessionPrefix = config.sessionId ? `/${config.sessionId}` : '';
            const srtPublicPath = `/subtitles${sessionPrefix}/${finalSrtFileName}`;
            const vttPublicPath = `/subtitles${sessionPrefix}/${finalVttFileName}`;
            
            return {
                srtPath: finalSrtPath,
                vttPath: finalVttPath,
                srtPublicPath,
                vttPublicPath
            };
        } catch (error) {
            console.error('자막 병합 오류:', error);
            throw error;
        }
    }

    /**
     * SRT 시간 형식을 초로 변환
     * @param {string} timeString - SRT 시간 문자열 (HH:MM:SS,mmm)
     * @returns {number} - 초 단위 시간
     */
    parseTimeToSeconds(timeString) {
        const [time, millisStr] = timeString.split(',');
        const [hours, minutes, seconds] = time.split(':').map(Number);
        const milliseconds = parseInt(millisStr);
        
        return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
    }
}

module.exports = SubtitleGenerator;