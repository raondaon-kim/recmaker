// modules/AudioGenerator.js
const fs = require('fs').promises;
const path = require('path');
const OpenAI = require('openai');
const { ElevenLabsClient } = require("elevenlabs");
const ffmpeg = require('fluent-ffmpeg');
const fetch = require('node-fetch');
const config = require('./config');

class AudioGenerator {
    constructor(config) {
        this.openai = new OpenAI({
            apiKey: config.openaiApiKey
        });
        
        this.elevenLabs = new ElevenLabsClient({
            apiKey: "sk_a471a705e7af9d35f7b25f8cb98dbab2d325f1e35aa2c06a"
        });

        this.ttsProvider = config.ttsProvider || 'tts-1';
    }

    async generateAudioFromText() {
        try {
            const scriptPath = config.getFullPath('extracted', 'getFinalScript');
            const scriptData = JSON.parse(await fs.readFile(scriptPath, 'utf-8'));

            if (!scriptData.slideAnalysis || !Array.isArray(scriptData.slideAnalysis)) {
                throw new Error('올바른 스크립트 데이터가 아닙니다.');
            }

            const slides = scriptData.slideAnalysis;
            const audioFiles = await this.generateSlideAudios(slides);

            if (audioFiles.length > 0) {
                const finalAudioPath = config.getAudioPath('getFinalAudioName');
                // audio 디렉토리가 없으면 생성
                await fs.mkdir(path.dirname(finalAudioPath), { recursive: true });
                await this.mergeAudioFiles(audioFiles, finalAudioPath);
                return finalAudioPath;
            }

            return null;
        } catch (error) {
            console.error("오디오 생성 중 오류 발생:", error);
            throw error;
        }
    }

    async generateSlideAudios(slides) {
        const audioFiles = [];
    
        // audio 디렉토리가 없으면 생성
        await fs.mkdir(config.getDirPath('audio'), { recursive: true });
    
        for (const slide of slides) {
            const audioPath = config.getAudioPath('getSlideAudioName', slide.slideNumber);
            
            try {
                // 파일이 이미 존재하는지 확인
                let audioExists = false;
                try {
                    await fs.access(audioPath);
                    const stats = await fs.stat(audioPath);
                    if (stats.size > 0) {
                        audioExists = true;
                        console.log(`슬라이드 ${slide.slideNumber}의 오디오 파일이 이미 존재합니다.`);
                        audioFiles.push(audioPath); // 기존 파일도 목록에 추가
                    }
                } catch (err) {
                    // 파일이 없으면 생성 진행
                    audioExists = false;
                }
                
                // 파일이 없을 때만 새로 생성
                if (!audioExists) {
                    // generateWithOpenAI 메서드 사용
                    await this.generateWithOpenAI(slide.analysis, audioPath);
                    audioFiles.push(audioPath);
                }
            } catch (error) {
                console.error(`슬라이드 ${slide.slideNumber} 음성 변환 실패:`, error);
            }
        }
    
        return audioFiles;
    }

    async generateWithElevenLabs(text, outputPath) {
        try {
            console.log(`ElevenLabs로 오디오 생성 시작 (텍스트 길이: ${text.length}자)`);
            
            // 이전 방식으로 API 직접 호출 (elevenlabs 라이브러리 대신)
            const response = await fetch(
                `https://api.elevenlabs.io/v1/text-to-speech/v4AgT8B47uRCgbIYBLO2`,  // 음성 ID
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json',
                        'xi-api-key': process.env.ELEVENLABS_API_KEY,
                    },
                    body: JSON.stringify({
                        text: text,
                        model_id: "eleven_multilingual_v2",
                        voice_settings: {
                            stability: 0.5,
                            similarity_boost: 0.75
                        }
                    }),
                }
            );
    
            if (!response.ok) {
                throw new Error(`ElevenLabs API 오류: ${response.status} ${response.statusText}`);
            }
    
            const buffer = await response.buffer();
            await fs.writeFile(outputPath, buffer);
            
            console.log(`ElevenLabs 오디오 생성 완료: ${outputPath}`);
        } catch (error) {
            console.error('ElevenLabs 오디오 생성 중 오류:', error);
            console.log('OpenAI TTS로 대체하여 생성을 시도합니다...');
            
            // 오류 발생 시 OpenAI TTS로 대체
            //return await this.generateWithOpenAI(text, outputPath);
        }
    }

    async generateWithOpenAI(text, outputPath) {
        const response = await this.openai.audio.speech.create({
            model: "tts-1",
            voice: "echo",
            input: text,
        });

        const buffer = Buffer.from(await response.arrayBuffer());
        await fs.writeFile(outputPath, buffer);
    }

    async mergeAudioFiles(audioFiles, finalAudioPath) {
        const silencePath = path.join(__dirname, 'silence.mp3');

        return new Promise((resolve, reject) => {
            const mergedAudio = ffmpeg();

            audioFiles.forEach((file, index) => {
                mergedAudio.input(file);
                if (index < audioFiles.length - 1) {
                    mergedAudio.input(silencePath);
                }
            });

            // 출력 디렉토리 생성
            const outputDir = path.dirname(finalAudioPath);
            fs.mkdir(outputDir, { recursive: true })
                .then(() => {
                    mergedAudio
                        .on('end', () => {
                            console.log(`✅ 최종 오디오 파일 생성 완료: ${finalAudioPath}`);
                            resolve(finalAudioPath);
                        })
                        .on('error', (err) => {
                            console.error("🚨 오디오 병합 중 오류 발생:", err);
                            reject(err);
                        })
                        .mergeToFile(finalAudioPath, outputDir);
                })
                .catch(reject);
        });
    }

    async cleanupAudioFiles(audioFiles) {
        for (const file of audioFiles) {
            try {
                await fs.unlink(file);
            } catch (error) {
                console.warn(`임시 오디오 파일 삭제 실패: ${file}`, error);
            }
        }
    }
}

module.exports = AudioGenerator;