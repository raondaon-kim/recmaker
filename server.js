// server.js
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;
const archiver = require('archiver');
// 모듈 불러오기
const config = require('./server/modules/config');
const sessionManager = require('./server/modules/session-utils');
const PPTConverter = require('./server/modules/PPTConverter');
const PDFImageConverter = require('./server/modules/PDFImageConverter');
const ContentExtractor = require('./server/modules/ContentExtractor');
const ContentAnalyzer = require('./server/modules/ContentAnalyzer');
const ScriptGenerator = require('./server/modules/ScriptGenerator');
const AudioGenerator = require('./server/modules/AudioGenerator');
const VideoGenerator = require('./server/modules/VideoGenerator');
const SubtitleGenerator = require('./server/modules/SubtitleGenerator');

class Server {
    constructor() {
        this.app = express();
        this.initializeMiddlewares();
        this.setupRoutes();
        this.initializeModules();
        this.processStatus = new Map();
        this.sessions = new Map(); // 세션 정보 저장

        // 오래된 상태 정보를 정리하기 위한 인터벌 설정
        setInterval(() => this.cleanupOldStatus(), 30 * 60 * 1000); // 30분마다 정리
        // 오래된 세션 정리 (30일마다)
        setInterval(() => sessionManager.cleanupOldSessions(30), 24 * 60 * 60 * 1000);
    }

    async initializeMiddlewares() {
        // 정적 파일 제공
        this.app.use('/recmaker', express.static('public'));

        // 세션별 콘텐츠에 접근할 수 있도록 sessions 디렉토리 노출
        this.app.use('/recmaker-sessions', express.static('sessions'));

        // multer 설정
        const storage = multer.diskStorage({
            destination: async (req, file, cb) => {
                // 세션 ID 생성 또는 사용
                const sessionId = req.body.sessionId || crypto.randomBytes(16).toString('hex');
                req.sessionId = sessionId;

                // 세션 생성
                await sessionManager.createSession(sessionId);

                // 세션별 config 설정
                config.setSessionId(sessionId);

                // 세션별 업로드 디렉토리 생성
                const uploadDir = config.getDirPath('upload');
                await fs.mkdir(uploadDir, { recursive: true });
                cb(null, uploadDir);
            },
            filename: (req, file, cb) => {
                const randomName = crypto.randomBytes(16).toString('hex');
                const ext = path.extname(file.originalname);
                cb(null, `${randomName}${ext}`);
            }
        });

        this.upload = multer({ storage });
    }

    initializeModules() {
        // 모듈 인스턴스 생성
        this.pptConverter = new PPTConverter();
        this.pdfConverter = new PDFImageConverter();
        this.contentExtractor = new ContentExtractor();
        this.contentAnalyzer = new ContentAnalyzer(process.env.OPENAI_API_KEY);
        this.scriptGenerator = new ScriptGenerator(process.env.OPENAI_API_KEY);
        this.audioGenerator = new AudioGenerator({
            openaiApiKey: process.env.OPENAI_API_KEY,
            elevenLabsApiKey: process.env.ELEVENLABS_API_KEY,
            ttsProvider: process.env.TTS_PROVIDER || 'tts-1'
        });

        this.videoGenerator = new VideoGenerator();
        this.subtitleGenerator = new SubtitleGenerator(process.env.OPENAI_API_KEY);
        // ContentExtractor에 컨버터 설정
        this.contentExtractor.setPPTConverter(this.pptConverter);
        this.contentExtractor.setPDFConverter(this.pdfConverter);

    }

    setupRoutes() {
        this.app.get('/recmaker', (req, res) => {
            // 기본 페이지 제공
            res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
        });
        this.app.post('/recmaker-api/analyze-ppt', this.upload.single('file'), this.handlePPTAnalysis.bind(this));
        this.app.use(express.json()); // JSON 파싱을 위한 미들웨어 추가
        this.app.post('/recmaker-api/update-script', this.handleScriptUpdate.bind(this));
        this.app.get('/recmaker-api/get-script', this.handleGetScript.bind(this));
        this.app.post('/recmaker-api/generate-slide-audio/:slideNumber', this.handleSlideAudioGeneration.bind(this));
        this.app.post('/recmaker-api/merge-audio', this.handleAudioMerge.bind(this));
        this.app.get('/recmaker-api/process-status', this.handleProcessStatus.bind(this));
        this.app.get('/recmaker-api/session-info/:sessionId', this.handleSessionInfo.bind(this));

        // 오디오 파일 확인 API 추가
        this.app.get('/recmaker-api/check-audio-files', this.handleCheckAudioFiles.bind(this));

        // 오디오 ZIP 다운로드 엔드포인트 추가
        this.app.get('/recmaker-api/download-audio-zip', this.handleAudioZipDownload.bind(this));

        // 비디오 관련 API 엔드포인트 추가
        this.app.post('/recmaker-api/generate-slide-video/:slideNumber', this.handleSlideVideoGeneration.bind(this));
        this.app.post('/recmaker-api/generate-full-video', this.handleFullVideoGeneration.bind(this));
        this.app.get('/recmaker-api/check-video-files', this.handleCheckVideoFiles.bind(this));
        this.app.get('/recmaker-api/download-video-zip', this.handleVideoZipDownload.bind(this));

        // 자막 관련 API 엔드포인트 추가
        this.app.post('/recmaker-api/generate-slide-subtitle/:slideNumber', this.handleSlideSubtitleGeneration.bind(this));
        this.app.post('/recmaker-api/merge-subtitles', this.handleSubtitleMerge.bind(this));
        this.app.get('/recmaker-api/check-subtitle-files', this.handleCheckSubtitleFiles.bind(this));
        this.app.get('/recmaker-api/download-subtitle-zip', this.handleSubtitleZipDownload.bind(this));

        // 세션별 페이지 접근을 위한 라우트 추가
        this.app.get('/recmaker/:sessionId([a-f0-9]{32})', this.handleSessionPage.bind(this));
        this.app.get('/recmaker/:invalidSessionId', (req, res) => {
            res.redirect('/recmaker');
        });
        this.app.post('/recmaker-api/regenerate-slide', this.handleSlideRegeneration.bind(this));

        // 라우트 추가
        this.app.get('/recmaker-api/download-all-content-zip', this.handleAllContentZipDownload.bind(this));
    }

    async handleSlideRegeneration(req, res) {
        try {
            const { fullScript, slideNumber, direction, additionalText } = req.body;
            const sessionId = req.query.sessionId;

            if (!fullScript || !slideNumber) {
                throw new Error('필수 데이터가 누락되었습니다.');
            }

            // 설정 업데이트
            config.setSessionId(sessionId);

            // 대상 슬라이드 찾기
            const targetIndex = slideNumber - 1;
            if (targetIndex < 0 || targetIndex >= fullScript.slideAnalysis.length) {
                throw new Error('유효하지 않은 슬라이드 번호입니다.');
            }

            const targetSlide = fullScript.slideAnalysis[targetIndex];
            config.setSessionId(sessionId);
        
            console.log('설정된 세션 ID:', config.sessionId);
           

            // 해당 슬라이드 이미지 경로 가져오기
            /*const imagePath = path.join(
                config.getDirPath('extracted_content'),
                config.getFileName('getSlideName', slideNumber)
            );*/
            const imagePath = path.join(
                process.cwd(), 
                'sessions', 
                sessionId, 
                'extracted_content', 
                `slide-${String(slideNumber).padStart(2, '0')}.png`
            );

            // 이미지 존재 확인
            try {
                await fs.access(imagePath);
                console.log(`이미지 경로 접근 성공: ${imagePath}`);
            } catch (error) {
                console.error(`이미지 접근 오류: ${imagePath}`, error);
                
                // 대체 경로 시도
                const alternativePath = path.join(
                    config.getDirPath('extracted_content'),
                    config.getFileName('getSlideName', slideNumber)
                );
                
                try {
                    await fs.access(alternativePath);
                    console.log(`대체 경로 접근 성공: ${alternativePath}`);
                    imagePath = alternativePath; // 경로 업데이트
                } catch (altError) {
                    throw new Error(`슬라이드 이미지를 찾을 수 없습니다. 시도한 경로: ${imagePath}, ${alternativePath}`);
                }
            }

            // 재분석을 위한 컨텍스트 구성 (전후 슬라이드 참조)
            const analysisContext = {
                currentSlide: targetSlide,
                previousSlide: slideNumber > 1 ? fullScript.slideAnalysis[slideNumber - 2] : null,
                nextSlide: slideNumber < fullScript.slideAnalysis.length ? fullScript.slideAnalysis[slideNumber] : null,
                fullPresentation: fullScript,
                totalSlides: fullScript.slideAnalysis.length
            };

            console.log(`슬라이드 ${slideNumber} 재생성 시작 (방향: ${direction})`);

            // 슬라이드 재분석
            const updatedAnalysis = await this.contentAnalyzer.analyzeSlideWithCustomPrompt(
                imagePath,
                analysisContext,
                direction,
                additionalText
            );

            // 전체 스크립트에서 해당 슬라이드만 업데이트
            fullScript.slideAnalysis[targetIndex].analysis = updatedAnalysis;

            // 업데이트된 스크립트 저장
            const scriptPath = config.getFullPath('extracted', 'getFinalScript');
            await fs.writeFile(scriptPath, JSON.stringify(fullScript, null, 2), 'utf-8');

            // 결과 반환
            res.json({
                status: 'success',
                message: '슬라이드 재생성 완료',
                updatedScript: fullScript
            });

        } catch (error) {
            console.error('슬라이드 재생성 중 오류:', error);
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }
    // 세션 정보 조회 핸들러
    async handleSessionInfo(req, res) {
        try {
            const sessionId = req.params.sessionId;

            if (!sessionId) {
                return res.status(400).json({
                    status: 'error',
                    message: '세션 ID가 필요합니다.'
                });
            }

            // 세션 존재 여부 확인
            const exists = await sessionManager.checkSessionExists(sessionId);

            if (!exists) {
                return res.status(404).json({
                    status: 'error',
                    message: '세션을 찾을 수 없습니다.'
                });
            }

            // 세션 정보 조회
            const sessionInfo = await sessionManager.getSession(sessionId);

            res.json({
                status: 'success',
                sessionInfo: sessionInfo
            });

        } catch (error) {
            console.error('세션 정보 조회 중 오류:', error);
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }

    async handleCheckAudioFiles(req, res) {
        try {
            const sessionId = req.query.sessionId || '';
            const slideCount = parseInt(req.query.slideCount || '0', 10);

            if (!sessionId) {
                return res.status(400).json({
                    status: 'error',
                    message: '세션 ID가 필요합니다.'
                });
            }

            if (slideCount <= 0) {
                return res.status(400).json({
                    status: 'error',
                    message: '유효한 슬라이드 수를 지정해주세요.'
                });
            }

            // 세션 업데이트
            config.setSessionId(sessionId);

            // 오디오 디렉토리 경로
            const audioDir = config.getDirPath('audio');

            // 디렉토리 존재 여부 확인
            try {
                await fs.access(audioDir);
            } catch (error) {
                // 디렉토리가 없으면 빈 결과 반환
                return res.json({
                    status: 'success',
                    existingAudios: [],
                    hasFinalAudio: false
                });
            }

            console.log(`오디오 파일 확인: 세션=${sessionId}, 디렉토리=${audioDir}`);

            // 디렉토리 내 파일 목록 확인
            const files = await fs.readdir(audioDir);

            // 각 슬라이드별 오디오 파일 존재 여부 확인
            const existingAudios = [];
            for (let i = 1; i <= slideCount; i++) {
                const audioFileName = config.getFileName('getSlideAudioName', i);
                const audioPath = path.join(audioDir, audioFileName);

                try {
                    await fs.access(audioPath);
                    const stats = await fs.stat(audioPath);

                    // 파일이 존재하고 크기가 0보다 크면 유효한 오디오로 간주
                    if (stats.isFile() && stats.size > 0) {
                        existingAudios.push(i);
                    }
                } catch (error) {
                    // 파일이 없으면 무시
                    continue;
                }
            }

            // 최종 합본 오디오 파일 존재 여부 확인
            const finalAudioName = config.getFileName('getFinalAudioName');
            const finalAudioPath = path.join(audioDir, finalAudioName);
            let hasFinalAudio = false;

            try {
                await fs.access(finalAudioPath);
                const stats = await fs.stat(finalAudioPath);
                hasFinalAudio = stats.isFile() && stats.size > 0;
            } catch (error) {
                // 파일이 없으면 무시
                hasFinalAudio = false;
            }

            console.log(`오디오 파일 확인 결과: 개별 오디오=${existingAudios.length}개, 최종 오디오=${hasFinalAudio}`);

            res.json({
                status: 'success',
                existingAudios: existingAudios,
                hasFinalAudio: hasFinalAudio
            });

        } catch (error) {
            console.error('오디오 파일 확인 중 오류:', error);
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }

    async handleAudioZipDownload(req, res) {
        try {
            const sessionId = req.query.sessionId || '';

            // config 설정 업데이트
            if (sessionId) {
                config.setSessionId(sessionId);
            }

            // 오디오 폴더 경로
            const audioDir = config.getDirPath('audio');
            // 자막 폴더 경로
            const subtitlesDir = config.getDirPath('subtitles');

            // ZIP 파일 이름 설정
            const zipFileName = sessionId
                ? `lecture_audio_${sessionId}.zip`
                : 'lecture_audio.zip';

            console.log(`오디오 ZIP 다운로드 요청: ${zipFileName}`);

            // 디렉토리 존재 여부 확인
            try {
                await fs.access(audioDir);
            } catch (error) {
                throw new Error('오디오 파일 디렉토리를 찾을 수 없습니다.');
            }

            // 디렉토리 내 파일 목록 확인
            const audioFiles = await fs.readdir(audioDir);
            const mp3Files = audioFiles.filter(file => file.endsWith('.mp3'));

            if (mp3Files.length === 0) {
                throw new Error('ZIP으로 묶을 오디오 파일이 없습니다. 먼저 오디오를 생성해주세요.');
            }

            // ZIP 파일 생성 준비
            res.attachment(zipFileName);

            const archive = archiver('zip', {
                zlib: { level: 9 } // 최대 압축 레벨
            });

            // 에러 처리
            archive.on('error', (err) => {
                console.error('ZIP 생성 중 오류:', err);
                res.status(500).send('ZIP 파일 생성 중 오류가 발생했습니다.');
            });

            // 스트림 파이핑
            archive.pipe(res);

            // 오디오 파일 추가
            for (const file of mp3Files) {
                const filePath = path.join(audioDir, file);
                console.log(`ZIP에 오디오 파일 추가: ${file}`);

                // stat으로 파일 사이즈 확인
                const stats = await fs.stat(filePath);

                if (stats.isFile() && stats.size > 0) {
                    archive.file(filePath, { name: `audio/${file}` });
                } else {
                    console.warn(`유효하지 않은 파일 무시: ${file} (크기: ${stats.size})`);
                }
            }

            // 자막 디렉토리가 있으면 자막 파일도 추가
            try {
                await fs.access(subtitlesDir);

                const subtitleFiles = await fs.readdir(subtitlesDir);
                const validSubtitles = subtitleFiles.filter(file => file.endsWith('.srt') || file.endsWith('.vtt'));

                for (const file of validSubtitles) {
                    const filePath = path.join(subtitlesDir, file);
                    console.log(`ZIP에 자막 파일 추가: ${file}`);

                    const stats = await fs.stat(filePath);

                    if (stats.isFile() && stats.size > 0) {
                        archive.file(filePath, { name: `subtitles/${file}` });
                    }
                }
            } catch (error) {
                console.log('자막 파일이 없거나 디렉토리에 접근할 수 없습니다:', error.message);
            }

            // 최종 강의 오디오가 있다면 맨 처음으로 추가
            const finalAudioName = config.getFileName('getFinalAudioName');
            const finalAudioPath = path.join(audioDir, finalAudioName);

            try {
                await fs.access(finalAudioPath);
                const stats = await fs.stat(finalAudioPath);

                if (stats.isFile() && stats.size > 0) {
                    // 최종 강의 오디오는 이름 변경해서 추가
                    archive.file(finalAudioPath, { name: 'audio/00_full_lecture.mp3' });
                    console.log('최종 강의 오디오 추가: audio/00_full_lecture.mp3');
                }
            } catch (error) {
                console.log('최종 강의 오디오를 찾을 수 없습니다.');
            }

            // 최종 자막 파일도 추가
            const finalSrtPath = path.join(subtitlesDir, config.getFileName('getFinalSubtitleName', 'srt'));
            const finalVttPath = path.join(subtitlesDir, config.getFileName('getFinalSubtitleName', 'vtt'));

            try {
                await fs.access(finalSrtPath);
                const stats = await fs.stat(finalSrtPath);

                if (stats.isFile() && stats.size > 0) {
                    archive.file(finalSrtPath, { name: 'subtitles/00_full_lecture.srt' });
                    console.log('최종 자막 SRT 추가: subtitles/00_full_lecture.srt');
                }
            } catch (error) {
                console.log('최종 SRT 자막을 찾을 수 없습니다.');
            }

            try {
                await fs.access(finalVttPath);
                const stats = await fs.stat(finalVttPath);

                if (stats.isFile() && stats.size > 0) {
                    archive.file(finalVttPath, { name: 'subtitles/00_full_lecture.vtt' });
                    console.log('최종 자막 VTT 추가: subtitles/00_full_lecture.vtt');
                }
            } catch (error) {
                console.log('최종 VTT 자막을 찾을 수 없습니다.');
            }

            // ZIP 파일 생성 완료
            await archive.finalize();
            console.log('ZIP 파일 생성 및 전송 완료');

        } catch (error) {
            console.error('오디오 ZIP 다운로드 중 오류:', error);
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }

    async handleSlideVideoGeneration(req, res) {
        try {
            const slideNumber = parseInt(req.params.slideNumber);
            const sessionId = req.query.sessionId || '';

            // 세션 ID 확인
            if (sessionId) {
                // 세션 존재 여부 확인
                const exists = await sessionManager.checkSessionExists(sessionId);
                if (!exists) {
                    throw new Error('유효하지 않은 세션 ID입니다.');
                }

                // config 설정 업데이트
                config.setSessionId(sessionId);
            }

            // 비디오 생성
            const videoPath = await this.videoGenerator.generateSlideVideo(slideNumber);

            // 웹 접근 경로 설정
            const publicPath = config.getPublicVideoPath('getSlideVideoName', slideNumber);

            res.json({
                status: 'success',
                message: '비디오 생성 완료',
                videoPath: publicPath,
                sessionId: sessionId
            });
        } catch (error) {
            console.error('비디오 생성 중 오류:', error);
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async handleFullVideoGeneration(req, res) {
        try {
            const sessionId = req.query.sessionId || '';
            const method = req.query.method || 'concat'; // 'concat' 또는 'slideshow'

            // 세션 ID 확인
            if (sessionId) {
                // 세션 존재 여부 확인
                const exists = await sessionManager.checkSessionExists(sessionId);
                if (!exists) {
                    throw new Error('유효하지 않은 세션 ID입니다.');
                }

                // config 설정 업데이트
                config.setSessionId(sessionId);
            }

            let videoPath;

            // 선택한 방식에 따라 비디오 생성
            if (method === 'slideshow') {
                videoPath = await this.videoGenerator.generateFullLectureVideo();
            } else {
                // 스크립트 데이터에서 슬라이드 수 가져오기
                const scriptPath = config.getFullPath('extracted', 'getFinalScript');
                const scriptData = JSON.parse(await fs.readFile(scriptPath, 'utf-8'));
                const slideCount = scriptData.slideAnalysis.length;

                videoPath = await this.videoGenerator.generateFullVideo(slideCount);
            }

            // 웹 접근 경로 설정
            const publicPath = config.getPublicVideoPath('getFinalVideoName');

            res.json({
                status: 'success',
                message: '전체 강의 비디오 생성 완료',
                videoPath: publicPath,
                sessionId: sessionId
            });
        } catch (error) {
            console.error('전체 비디오 생성 중 오류:', error);
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async handleCheckVideoFiles(req, res) {
        try {
            const sessionId = req.query.sessionId || '';
            const slideCount = parseInt(req.query.slideCount || '0', 10);

            if (!sessionId) {
                return res.status(400).json({
                    status: 'error',
                    message: '세션 ID가 필요합니다.'
                });
            }

            if (slideCount <= 0) {
                return res.status(400).json({
                    status: 'error',
                    message: '유효한 슬라이드 수를 지정해주세요.'
                });
            }

            // 세션 업데이트
            config.setSessionId(sessionId);

            // 비디오 디렉토리 경로
            const videoDir = config.getDirPath('videos');

            // 디렉토리 존재 여부 확인
            try {
                await fs.access(videoDir);
            } catch (error) {
                // 디렉토리가 없으면 빈 결과 반환
                return res.json({
                    status: 'success',
                    existingVideos: [],
                    hasFinalVideo: false
                });
            }

            console.log(`비디오 파일 확인: 세션=${sessionId}, 디렉토리=${videoDir}`);

            // 디렉토리 내 파일 목록 확인
            const files = await fs.readdir(videoDir);

            // 각 슬라이드별 비디오 파일 존재 여부 확인
            const existingVideos = [];
            for (let i = 1; i <= slideCount; i++) {
                const videoFileName = config.getFileName('getSlideVideoName', i);
                const videoPath = path.join(videoDir, videoFileName);

                try {
                    await fs.access(videoPath);
                    const stats = await fs.stat(videoPath);

                    // 파일이 존재하고 크기가 0보다 크면 유효한 비디오로 간주
                    if (stats.isFile() && stats.size > 0) {
                        existingVideos.push(i);
                    }
                } catch (error) {
                    // 파일이 없으면 무시
                    continue;
                }
            }

            // 최종 비디오 파일 존재 여부 확인
            const finalVideoName = config.getFileName('getFinalVideoName');
            const finalVideoPath = path.join(videoDir, finalVideoName);
            let hasFinalVideo = false;

            try {
                await fs.access(finalVideoPath);
                const stats = await fs.stat(finalVideoPath);
                hasFinalVideo = stats.isFile() && stats.size > 0;
            } catch (error) {
                // 파일이 없으면 무시
                hasFinalVideo = false;
            }

            console.log(`비디오 파일 확인 결과: 개별 비디오=${existingVideos.length}개, 최종 비디오=${hasFinalVideo}`);

            res.json({
                status: 'success',
                existingVideos: existingVideos,
                hasFinalVideo: hasFinalVideo
            });

        } catch (error) {
            console.error('비디오 파일 확인 중 오류:', error);
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }

    // 새로운 핸들러: 비디오 ZIP 다운로드
    async handleVideoZipDownload(req, res) {
        try {
            const sessionId = req.query.sessionId || '';

            // config 설정 업데이트
            if (sessionId) {
                config.setSessionId(sessionId);
            }

            // 비디오 폴더 경로
            const videoDir = config.getDirPath('videos');
            // 자막 폴더 경로
            const subtitlesDir = config.getDirPath('subtitles');

            // ZIP 파일 이름 설정
            const zipFileName = sessionId
                ? `lecture_video_${sessionId}.zip`
                : 'lecture_video.zip';

            console.log(`비디오 ZIP 다운로드 요청: ${zipFileName}`);

            // 디렉토리 존재 여부 확인
            try {
                await fs.access(videoDir);
            } catch (error) {
                throw new Error('비디오 파일 디렉토리를 찾을 수 없습니다.');
            }

            // 디렉토리 내 파일 목록 확인
            const videoFiles = await fs.readdir(videoDir);
            const mp4Files = videoFiles.filter(file => file.endsWith('.mp4'));

            if (mp4Files.length === 0) {
                throw new Error('ZIP으로 묶을 비디오 파일이 없습니다. 먼저 비디오를 생성해주세요.');
            }

            // ZIP 파일 생성 준비
            res.attachment(zipFileName);

            const archive = archiver('zip', {
                zlib: { level: 9 } // 최대 압축 레벨
            });

            // 에러 처리
            archive.on('error', (err) => {
                console.error('ZIP 생성 중 오류:', err);
                res.status(500).send('ZIP 파일 생성 중 오류가 발생했습니다.');
            });

            // 스트림 파이핑
            archive.pipe(res);

            // 비디오 파일 추가
            for (const file of mp4Files) {
                const filePath = path.join(videoDir, file);
                console.log(`ZIP에 비디오 파일 추가: ${file}`);

                // stat으로 파일 사이즈 확인
                const stats = await fs.stat(filePath);

                if (stats.isFile() && stats.size > 0) {
                    archive.file(filePath, { name: `videos/${file}` });
                } else {
                    console.warn(`유효하지 않은 파일 무시: ${file} (크기: ${stats.size})`);
                }
            }

            // 자막 디렉토리가 있으면 자막 파일도 추가
            try {
                await fs.access(subtitlesDir);

                const subtitleFiles = await fs.readdir(subtitlesDir);
                const validSubtitles = subtitleFiles.filter(file => file.endsWith('.srt') || file.endsWith('.vtt'));

                for (const file of validSubtitles) {
                    const filePath = path.join(subtitlesDir, file);
                    console.log(`ZIP에 자막 파일 추가: ${file}`);

                    const stats = await fs.stat(filePath);

                    if (stats.isFile() && stats.size > 0) {
                        archive.file(filePath, { name: `subtitles/${file}` });
                    }
                }
            } catch (error) {
                console.log('자막 파일이 없거나 디렉토리에 접근할 수 없습니다:', error.message);
            }

            // 최종 강의 비디오가 있다면 맨 처음으로 추가
            const finalVideoName = config.getFileName('getFinalVideoName');
            const finalVideoPath = path.join(videoDir, finalVideoName);

            try {
                await fs.access(finalVideoPath);
                const stats = await fs.stat(finalVideoPath);

                if (stats.isFile() && stats.size > 0) {
                    // 최종 강의 비디오는 이름 변경해서 추가
                    archive.file(finalVideoPath, { name: 'videos/00_full_lecture.mp4' });
                    console.log('최종 강의 비디오 추가: videos/00_full_lecture.mp4');
                }
            } catch (error) {
                console.log('최종 강의 비디오를 찾을 수 없습니다.');
            }

            // 최종 자막 파일도 추가
            const finalSrtPath = path.join(subtitlesDir, config.getFileName('getFinalSubtitleName', 'srt'));
            const finalVttPath = path.join(subtitlesDir, config.getFileName('getFinalSubtitleName', 'vtt'));

            try {
                await fs.access(finalSrtPath);
                const stats = await fs.stat(finalSrtPath);

                if (stats.isFile() && stats.size > 0) {
                    archive.file(finalSrtPath, { name: 'subtitles/00_full_lecture.srt' });
                    console.log('최종 자막 SRT 추가: subtitles/00_full_lecture.srt');
                }
            } catch (error) {
                console.log('최종 SRT 자막을 찾을 수 없습니다.');
            }

            try {
                await fs.access(finalVttPath);
                const stats = await fs.stat(finalVttPath);

                if (stats.isFile() && stats.size > 0) {
                    archive.file(finalVttPath, { name: 'subtitles/00_full_lecture.vtt' });
                    console.log('최종 자막 VTT 추가: subtitles/00_full_lecture.vtt');
                }
            } catch (error) {
                console.log('최종 VTT 자막을 찾을 수 없습니다.');
            }

            // ZIP 파일 생성 완료
            await archive.finalize();
            console.log('ZIP 파일 생성 및 전송 완료');

        } catch (error) {
            console.error('비디오 ZIP 다운로드 중 오류:', error);
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }

    // 세션 페이지 처리 핸들러
    // 세션 페이지 처리 핸들러
// 세션 페이지 처리 핸들러 수정
async handleSessionPage(req, res) {
    const sessionId = req.params.sessionId;
    
    // 세션 존재 여부 확인
    const exists = await sessionManager.checkSessionExists(sessionId);

    if (exists) {
        // 세션 접근 시간 업데이트
        await sessionManager.getSession(sessionId);
        // 세션 폴더가 존재하면 메인 페이지 제공
        res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
    } else {
        // 세션이 존재하지 않으면 기본 페이지로 리다이렉트
        res.redirect('/recmaker');
    }
}

    handleProcessStatus(req, res) {
        const jobId = req.query.jobId;
        const sessionId = req.query.sessionId || '';

        if (jobId.startsWith('temp-')) {
            // 세션 ID가 있고, 그 세션에 상태가 있으면 항상 최신 상태를 가져옴
            if (sessionId && this.processStatus.has(sessionId)) {
                const sessionStatus = this.processStatus.get(sessionId);
                console.log(`임시 ID에 세션 상태 동기화: ${sessionId} -> ${jobId}`);
                console.log(`세션 상태:`, sessionStatus);
                this.processStatus.set(jobId, { ...sessionStatus });
            }
            // 임시 ID에 상태가 없으면 초기 상태 설정
            else if (!this.processStatus.has(jobId)) {
                console.log(`임시 작업 ID 초기화: ${jobId}`);
                this.processStatus.set(jobId, {
                    jobId: jobId,
                    status: 'processing',
                    stage: 'extract',
                    percentage: 5,
                    message: '초기화 중...',
                    updatedAt: Date.now()
                });
            }
        }

        // 해당 작업의 상태 정보 확인
        let status = this.processStatus.get(jobId);

        // jobId로 찾지 못했지만 sessionId가 있는 경우 sessionId로도 시도
        if (!status && sessionId) {
            status = this.processStatus.get(sessionId);
            console.log(`세션 ID로 작업 상태 확인: ${sessionId}`, status ? '찾음' : '못찾음');

            // 상태를 찾았다면 임시 작업 ID에도 등록
            if (status) {
                this.processStatus.set(jobId, status);
                console.log(`임시 작업 ID(${jobId})에 세션 ID(${sessionId})의 상태를 복사했습니다.`);
            }
        }

        if (!status) {
            console.log(`작업 정보를 찾을 수 없음: jobId=${jobId}, sessionId=${sessionId}`);
            console.log('현재 추적 중인 작업 목록:', Array.from(this.processStatus.keys()));

            // 기본 초기 상태 반환
            return res.json({
                status: 'initializing',
                jobId: jobId,
                sessionId: sessionId,
                stage: 'extract',
                percentage: 1,
                message: '작업 초기화 중...'
            });
        }

        res.json(status);
    }

    updateProcessStatus(jobId, stage, percentage, message = null, detail = null) {
        const status = {
            jobId,
            status: percentage >= 100 ? 'completed' : 'processing',
            stage,
            percentage,
            message,
            detail,
            updatedAt: Date.now()
        };

        // 상태 정보 맵에 저장
        this.processStatus.set(jobId, status);

        // 임시 ID들에도 상태 복사
        const tempIds = Array.from(this.processStatus.keys())
            .filter(key => key.startsWith('temp-'));
        for (const tempId of tempIds) {
            this.processStatus.set(tempId, { ...status });
        }

        return status;
    }

    // 오래된 상태 정보 정리
    cleanupOldStatus() {
        const now = Date.now();
        const maxAge = 60 * 60 * 1000; // 1시간

        for (const [jobId, status] of this.processStatus.entries()) {
            if (now - status.updatedAt > maxAge) {
                this.processStatus.delete(jobId);
            }
        }
    }

    async handleSlideAudioGeneration(req, res) {
        try {
            const slideNumber = parseInt(req.params.slideNumber);
            const sessionId = req.query.sessionId || '';

            // 세션 ID 확인
            if (sessionId) {
                // 세션 존재 여부 확인
                const exists = await sessionManager.checkSessionExists(sessionId);
                if (!exists) {
                    throw new Error('유효하지 않은 세션 ID입니다.');
                }

                // config 설정 업데이트
                config.setSessionId(sessionId);
            }

            const scriptPath = config.getFullPath('extracted', 'getFinalScript');
            const scriptData = JSON.parse(await fs.readFile(scriptPath, 'utf-8'));

            const slide = scriptData.slideAnalysis.find(s => s.slideNumber === slideNumber);
            if (!slide) {
                throw new Error('슬라이드를 찾을 수 없습니다.');
            }

            // 오디오 경로 설정
            const audioPath = config.getAudioPath('getSlideAudioName', slideNumber);

            // audio 디렉토리가 없다면 생성
            await fs.mkdir(path.dirname(audioPath), { recursive: true });

            await this.audioGenerator.generateWithOpenAI(slide.analysis, audioPath);
            //await this.audioGenerator.generateWithElevenLabs(slide.analysis, audioPath);
            // 웹 접근 경로 설정
            const publicPath = config.getPublicAudioPath('getSlideAudioName', slideNumber);
            const subtitles = await this.subtitleGenerator.generateSlideSubtitles(
                slideNumber,
                audioPath,
                slide.analysis
            );
            res.json({
                status: 'success',
                message: '음성 및 자막 생성 완료',
                audioPath: publicPath,
                subtitles: {
                    srt: subtitles.srtPublicPath,
                    vtt: subtitles.vttPublicPath
                },
                sessionId: sessionId
            });
        } catch (error) {
            console.error('음성 생성 중 오류:', error);
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }

    async handleAudioMerge(req, res) {
        try {
            const sessionId = req.query.sessionId || '';

            // 세션 ID 확인
            if (sessionId) {
                // 세션 존재 여부 확인
                const exists = await sessionManager.checkSessionExists(sessionId);
                if (!exists) {
                    throw new Error('유효하지 않은 세션 ID입니다.');
                }

                // config 설정 업데이트
                config.setSessionId(sessionId);
            }

            const audioPath = await this.audioGenerator.generateAudioFromText();

            // 웹 접근 경로 설정
            const publicPath = config.getPublicAudioPath('getFinalAudioName');

            res.json({
                status: 'success',
                message: '음성 병합 완료',
                audioPath: publicPath,
                sessionId: sessionId
            });
        } catch (error) {
            console.error('음성 병합 중 오류:', error);
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }

    async handleScriptUpdate(req, res) {
        console.log('스크립트 업데이트 요청 받음');

        try {
            const { updatedScript } = req.body;
            const sessionId = req.query.sessionId || '';

            if (!updatedScript) {
                throw new Error('스크립트 내용이 없습니다.');
            }

            // 세션 ID 확인
            if (sessionId) {
                // 세션 존재 여부 확인
                const exists = await sessionManager.checkSessionExists(sessionId);
                if (!exists) {
                    throw new Error('유효하지 않은 세션 ID입니다.');
                }

                // config 설정 업데이트
                config.setSessionId(sessionId);
            }

            // 스크립트 파일 경로
            const scriptPath = config.getFullPath('extracted', 'getFinalScript');

            // 기존 스크립트 읽기 (검증용)
            try {
                await fs.access(scriptPath);
            } catch (error) {
                throw new Error('스크립트 파일이 존재하지 않습니다.');
            }

            // 스크립트 업데이트
            await fs.writeFile(scriptPath, JSON.stringify(updatedScript, null, 2), 'utf-8');

            console.log('스크립트 업데이트 완료');

            // 세션 메타데이터 업데이트
            if (sessionId) {
                await sessionManager.updateSessionMetadata(sessionId, {
                    lastUpdated: new Date().toISOString(),
                    slideCount: updatedScript.slideAnalysis.length
                });
            }

            res.json({
                status: 'success',
                message: '스크립트가 성공적으로 업데이트되었습니다.',
                sessionId: sessionId
            });

        } catch (error) {
            console.error('스크립트 업데이트 중 오류:', error);
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }
    // 통합 ZIP 다운로드 핸들러 (서버.js에 추가)
    async handleAllContentZipDownload(req, res) {
        try {
            const sessionId = req.query.sessionId || '';

            // config 설정 업데이트
            if (sessionId) {
                config.setSessionId(sessionId);
            }

            // 각종 디렉토리 경로
            const videoDir = config.getDirPath('videos');
            const audioDir = config.getDirPath('audio');
            const subtitlesDir = config.getDirPath('subtitles');
            const extractedDir = config.getDirPath('extracted');

            // ZIP 파일 이름 설정
            const zipFileName = sessionId
                ? `lecture_all_content_${sessionId}.zip`
                : 'lecture_all_content.zip';

            console.log(`통합 콘텐츠 ZIP 다운로드 요청: ${zipFileName}`);

            // ZIP 파일 생성 준비
            res.attachment(zipFileName);

            const archive = archiver('zip', {
                zlib: { level: 9 } // 최대 압축 레벨
            });

            // 에러 처리
            archive.on('error', (err) => {
                console.error('ZIP 생성 중 오류:', err);
                res.status(500).send('ZIP 파일 생성 중 오류가 발생했습니다.');
            });

            // 스트림 파이핑
            archive.pipe(res);

            // 1. 스크립트 파일 추가
            try {
                const scriptPath = config.getFullPath('extracted', 'getFinalScript');
                const scriptData = JSON.parse(await fs.readFile(scriptPath, 'utf-8'));
                
                // 마크다운 형식의 스크립트 생성
                let markdownContent = '# 강의 스크립트\n\n';
                
                if (sessionId) {
                    markdownContent += `세션 ID: ${sessionId}\n`;
                    markdownContent += `영구 접근 URL: ${req.protocol}://${req.get('host')}/${sessionId}\n\n`;
                }
                
                scriptData.slideAnalysis.forEach(slide => {
                    markdownContent += `## 슬라이드 ${slide.slideNumber}\n\n${slide.analysis}\n\n`;
                });
                
                // 스크립트 파일을 아카이브에 직접 추가
                archive.append(markdownContent, { name: '강의_스크립트.md' });
                console.log('스크립트 파일 추가: 강의_스크립트.md');
            } catch (error) {
                console.log('스크립트 파일 처리 중 오류:', error);
            }

            // 2. 오디오 파일 추가
            try {
                await fs.access(audioDir);
                const audioFiles = await fs.readdir(audioDir);
                const mp3Files = audioFiles.filter(file => file.endsWith('.mp3'));

                for (const file of mp3Files) {
                    const filePath = path.join(audioDir, file);
                    const stats = await fs.stat(filePath);

                    if (stats.isFile() && stats.size > 0) {
                        archive.file(filePath, { name: `audio/${file}` });
                    }
                }
                console.log(`${mp3Files.length}개 오디오 파일 추가`);
            } catch (error) {
                console.log('오디오 파일 추가 중 오류:', error);
            }

            // 3. 비디오 파일 추가
            try {
                await fs.access(videoDir);
                const videoFiles = await fs.readdir(videoDir);
                const mp4Files = videoFiles.filter(file => file.endsWith('.mp4'));

                for (const file of mp4Files) {
                    const filePath = path.join(videoDir, file);
                    const stats = await fs.stat(filePath);

                    if (stats.isFile() && stats.size > 0) {
                        archive.file(filePath, { name: `videos/${file}` });
                    }
                }
                console.log(`${mp4Files.length}개 비디오 파일 추가`);
            } catch (error) {
                console.log('비디오 파일 추가 중 오류:', error);
            }

            // 4. 자막 파일 추가
            try {
                await fs.access(subtitlesDir);
                const subtitleFiles = await fs.readdir(subtitlesDir);
                const subtFiles = subtitleFiles.filter(file => file.endsWith('.srt') || file.endsWith('.vtt'));

                for (const file of subtFiles) {
                    const filePath = path.join(subtitlesDir, file);
                    const stats = await fs.stat(filePath);

                    if (stats.isFile() && stats.size > 0) {
                        archive.file(filePath, { name: `subtitles/${file}` });
                    }
                }
                console.log(`${subtFiles.length}개 자막 파일 추가`);
            } catch (error) {
                console.log('자막 파일 추가 중 오류:', error);
            }

            // 5. 슬라이드 이미지 추가
            try {
                const originalImagesDir = config.getDirPath('original_images');
                await fs.access(originalImagesDir);
                const imageFiles = await fs.readdir(originalImagesDir);
                const pngFiles = imageFiles.filter(file => file.endsWith('.png'));

                for (const file of pngFiles) {
                    const filePath = path.join(originalImagesDir, file);
                    const stats = await fs.stat(filePath);

                    if (stats.isFile() && stats.size > 0) {
                        archive.file(filePath, { name: `images/${file}` });
                    }
                }
                console.log(`${pngFiles.length}개 이미지 파일 추가`);
            } catch (error) {
                console.log('이미지 파일 추가 중 오류:', error);
            }

            // ZIP 파일 생성 완료
            await archive.finalize();
            console.log('통합 ZIP 파일 생성 및 전송 완료');

        } catch (error) {
            console.error('통합 ZIP 다운로드 중 오류:', error);
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async handleGetScript(req, res) {
        console.log('스크립트 조회 요청 받음');
    
        try {
            const sessionId = req.query.sessionId || '';
    
            // 세션 ID 확인 (세션 ID가 없는 경우에도 기본 응답 제공)
            if (sessionId) {
                try {
                    // 세션 존재 여부 확인
                    const exists = await sessionManager.checkSessionExists(sessionId);
                    if (!exists) {
                        // 세션이 존재하지 않을 때 기본 빈 스크립트 반환
                        return res.json({
                            status: 'success',
                            script: {
                                slideAnalysis: []
                            },
                            sessionId: ''
                        });
                    }
    
                    // config 설정 업데이트
                    config.setSessionId(sessionId);
    
                    // 세션 접근 시간 업데이트
                    await sessionManager.getSession(sessionId);
                } catch (error) {
                    // 세션 확인 중 오류가 발생해도 기본 응답 제공
                    return res.json({
                        status: 'success',
                        script: {
                            slideAnalysis: []
                        },
                        sessionId: ''
                    });
                }
            } else {
                // 세션 ID가 없는 경우 기본 응답 제공
                return res.json({
                    status: 'success',
                    script: {
                        slideAnalysis: []
                    },
                    sessionId: ''
                });
            }
    
            // 여기서부터는 기존 코드 유지...
            const scriptPath = config.getFullPath('extracted', 'getFinalScript');
    
            // 파일 존재 확인
            try {
                await fs.access(scriptPath);
            } catch (error) {
                // 파일이 없는 경우에도 기본 빈 스크립트 반환
                return res.json({
                    status: 'success',
                    script: {
                        slideAnalysis: []
                    },
                    sessionId: sessionId
                });
            }
    
            // 스크립트 읽기
            const scriptContent = await fs.readFile(scriptPath, 'utf-8');
            const scriptData = JSON.parse(scriptContent);
    
            res.json({
                status: 'success',
                script: scriptData,
                sessionId: sessionId
            });
    
        } catch (error) {
            console.error('스크립트 조회 중 오류:', error);
            // 오류가 발생해도 빈 스크립트 반환
            res.json({
                status: 'success',
                script: {
                    slideAnalysis: []
                },
                sessionId: ''
            });
        }
    }
    // 자막 생성 핸들러 추가
    async handleSlideSubtitleGeneration(req, res) {
        try {
            const slideNumber = parseInt(req.params.slideNumber);
            const sessionId = req.query.sessionId || '';

            // 세션 ID 확인
            if (sessionId) {
                // 세션 존재 여부 확인
                const exists = await sessionManager.checkSessionExists(sessionId);
                if (!exists) {
                    throw new Error('유효하지 않은 세션 ID입니다.');
                }

                // config 설정 업데이트
                config.setSessionId(sessionId);
            }

            // 스크립트 데이터 읽기
            const scriptPath = config.getFullPath('extracted', 'getFinalScript');
            const scriptData = JSON.parse(await fs.readFile(scriptPath, 'utf-8'));

            const slide = scriptData.slideAnalysis.find(s => s.slideNumber === slideNumber);
            if (!slide) {
                throw new Error('슬라이드를 찾을 수 없습니다.');
            }

            // 오디오 파일 경로
            const audioPath = config.getAudioPath('getSlideAudioName', slideNumber);

            // 오디오 파일 존재 확인
            try {
                await fs.access(audioPath);
            } catch (error) {
                throw new Error('오디오 파일이 없습니다. 먼저 오디오를 생성해주세요.');
            }

            // 자막 생성
            const subtitles = await this.subtitleGenerator.generateSlideSubtitles(
                slideNumber,
                audioPath,
                slide.analysis
            );

            res.json({
                status: 'success',
                message: '자막 생성 완료',
                subtitles: {
                    srt: subtitles.srtPublicPath,
                    vtt: subtitles.vttPublicPath
                },
                sessionId: sessionId
            });
        } catch (error) {
            console.error('자막 생성 중 오류:', error);
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async handleSubtitleMerge(req, res) {
        try {
            const sessionId = req.query.sessionId || '';

            // 세션 ID 확인
            if (sessionId) {
                // 세션 존재 여부 확인
                const exists = await sessionManager.checkSessionExists(sessionId);
                if (!exists) {
                    throw new Error('유효하지 않은 세션 ID입니다.');
                }

                // config 설정 업데이트
                config.setSessionId(sessionId);
            }

            // 세션 정보에서 슬라이드 수 가져오기
            const sessionInfo = await sessionManager.getSession(sessionId);
            const slideCount = sessionInfo.slideCount || 0;

            if (slideCount <= 0) {
                throw new Error('슬라이드 정보를 찾을 수 없습니다.');
            }

            // 자막 합치기
            const mergedSubtitles = await this.subtitleGenerator.mergeSubtitles(slideCount);

            res.json({
                status: 'success',
                message: '자막 병합 완료',
                subtitles: {
                    srt: mergedSubtitles.srtPublicPath,
                    vtt: mergedSubtitles.vttPublicPath
                },
                sessionId: sessionId
            });
        } catch (error) {
            console.error('자막 병합 중 오류:', error);
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }
    // 자막 파일 확인 핸들러 추가
    async handleCheckSubtitleFiles(req, res) {
        try {
            const sessionId = req.query.sessionId || '';
            const slideCount = parseInt(req.query.slideCount || '0', 10);

            if (!sessionId) {
                return res.status(400).json({
                    status: 'error',
                    message: '세션 ID가 필요합니다.'
                });
            }

            if (slideCount <= 0) {
                return res.status(400).json({
                    status: 'error',
                    message: '유효한 슬라이드 수를 지정해주세요.'
                });
            }

            // 세션 업데이트
            config.setSessionId(sessionId);

            // 자막 디렉토리 경로
            const subtitlesDir = config.getDirPath('subtitles');

            // 디렉토리 존재 여부 확인
            try {
                await fs.access(subtitlesDir);
            } catch (error) {
                // 디렉토리가 없으면 빈 결과 반환
                return res.json({
                    status: 'success',
                    existingSubtitles: [],
                    hasFinalSubtitle: false
                });
            }

            console.log(`자막 파일 확인: 세션=${sessionId}, 디렉토리=${subtitlesDir}`);

            // 디렉토리 내 파일 목록 확인
            const files = await fs.readdir(subtitlesDir);

            // 각 슬라이드별 자막 파일 존재 여부 확인
            const existingSubtitles = [];
            for (let i = 1; i <= slideCount; i++) {
                const srtFileName = config.getFileName('getSlideSubtitleName', i, 'srt');
                const srtPath = path.join(subtitlesDir, srtFileName);

                try {
                    await fs.access(srtPath);
                    const stats = await fs.stat(srtPath);

                    // 파일이 존재하고 크기가 0보다 크면 유효한 자막으로 간주
                    if (stats.isFile() && stats.size > 0) {
                        existingSubtitles.push(i);
                    }
                } catch (error) {
                    // 파일이 없으면 무시
                    continue;
                }
            }

            // 최종 자막 파일 존재 여부 확인
            const finalSrtName = config.getFileName('getFinalSubtitleName', 'srt');
            const finalSrtPath = path.join(subtitlesDir, finalSrtName);
            let hasFinalSubtitle = false;

            try {
                await fs.access(finalSrtPath);
                const stats = await fs.stat(finalSrtPath);
                hasFinalSubtitle = stats.isFile() && stats.size > 0;
            } catch (error) {
                // 파일이 없으면 무시
                hasFinalSubtitle = false;
            }

            console.log(`자막 파일 확인 결과: 개별 자막=${existingSubtitles.length}개, 최종 자막=${hasFinalSubtitle}`);

            res.json({
                status: 'success',
                existingSubtitles: existingSubtitles,
                hasFinalSubtitle: hasFinalSubtitle
            });

        } catch (error) {
            console.error('자막 파일 확인 중 오류:', error);
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }

    async handleSubtitleZipDownload(req, res) {
        try {
            const sessionId = req.query.sessionId || '';

            // config 설정 업데이트
            if (sessionId) {
                config.setSessionId(sessionId);
            }

            // 자막 폴더 경로
            const subtitlesDir = config.getDirPath('subtitles');

            // ZIP 파일 이름 설정
            const zipFileName = sessionId
                ? `lecture_subtitles_${sessionId}.zip`
                : 'lecture_subtitles.zip';

            console.log(`자막 ZIP 다운로드 요청: ${zipFileName} (디렉토리: ${subtitlesDir})`);

            // 디렉토리 존재 여부 확인
            try {
                await fs.access(subtitlesDir);
            } catch (error) {
                throw new Error('자막 파일 디렉토리를 찾을 수 없습니다.');
            }

            // 디렉토리 내 파일 목록 확인
            const files = await fs.readdir(subtitlesDir);
            const subtitleFiles = files.filter(file => file.endsWith('.srt') || file.endsWith('.vtt'));

            if (subtitleFiles.length === 0) {
                throw new Error('ZIP으로 묶을 자막 파일이 없습니다. 먼저 자막을 생성해주세요.');
            }

            console.log(`자막 파일 ${subtitleFiles.length}개 발견`);

            // ZIP 파일 생성 준비
            res.attachment(zipFileName);

            const archive = archiver('zip', {
                zlib: { level: 9 } // 최대 압축 레벨
            });

            // 에러 처리
            archive.on('error', (err) => {
                console.error('ZIP 생성 중 오류:', err);
                res.status(500).send('ZIP 파일 생성 중 오류가 발생했습니다.');
            });

            // 스트림 파이핑
            archive.pipe(res);

            // 파일 추가
            for (const file of subtitleFiles) {
                const filePath = path.join(subtitlesDir, file);
                console.log(`ZIP에 파일 추가: ${file}`);

                // stat으로 파일 사이즈 확인
                const stats = await fs.stat(filePath);

                if (stats.isFile() && stats.size > 0) {
                    archive.file(filePath, { name: file });
                } else {
                    console.warn(`유효하지 않은 파일 무시: ${file} (크기: ${stats.size})`);
                }
            }

            // ZIP 파일 생성 완료
            await archive.finalize();
            console.log('ZIP 파일 생성 및 전송 완료');

        } catch (error) {
            console.error('자막 ZIP 다운로드 중 오류:', error);
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }

    // server.js 파일의 handlePPTAnalysis 메서드 수정

    // server.js 파일의 handlePPTAnalysis 메서드 수정

    async handlePPTAnalysis(req, res) {
        const startTime = Date.now();
        // 세션 ID 생성 또는 기존 ID 사용
       

        console.log('===== PPT 분석 시작 =====');
        console.log('요청 바디:', req.body);
        console.log('요청 파일:', req.file ? {
            originalname: req.file.originalname,
            size: req.file.size,
            path: req.file.path
        } : 'No file');

        try {
            const sessionId = req.sessionId || crypto.randomBytes(16).toString('hex');
            const jobId = sessionId; // 작업 ID와 세션 ID를 동일하게 사용
            console.log('세션 ID 생성:', sessionId);
            if (!req.file) {
                throw new Error('파일이 없습니다.');
            }

            // 메타데이터 저장
            const metadata = {
                fileName: req.file.originalname,
                fileSize: req.file.size,
                difficulty: req.body.difficulty || 'INTERMEDIATE',
                analysisType: req.body.analysisType || 'standard'
            };
            console.log('메타데이터:', metadata);

            // 세션 업데이트 또는 생성
            await sessionManager.updateSessionMetadata(sessionId, metadata);
            console.log('세션 메타데이터 업데이트 완료');

            // 중요: jobId와 sessionId를 모두 상태 맵에 저장
            // 첫 단계부터 내용분석 단계로 변경 (콘텐츠 추출은 별도 단계 없이 진행)
            this.updateProcessStatus(jobId, 'analyze', 0, 'PPT 파일 처리 준비 중...');
            console.log('프로세스 상태 업데이트 완료');
            if (jobId !== sessionId) {
                this.processStatus.set(sessionId, this.processStatus.get(jobId));
            }

            // 1. PPT 콘텐츠 추출 (단계 표시는 내용분석으로)
            console.log('1. PPT 콘텐츠 추출 중...');
            this.updateProcessStatus(jobId, 'analyze', 10, 'PPT 콘텐츠 추출 중...');
            const tempIds = Array.from(this.processStatus.keys())
                .filter(key => key.startsWith('temp-'));
            for (const tempId of tempIds) {
                console.log(`임시 ID 상태 동기화: ${jobId} -> ${tempId}`);
                this.processStatus.set(tempId, this.processStatus.get(jobId));
            }

            const { slides } = await this.contentExtractor.extractPptContent(req.file.path);
            console.log(`   - ${slides.length}개의 슬라이드 추출 완료`);
            this.updateProcessStatus(jobId, 'analyze', 30, 'PPT 콘텐츠 추출 완료', `${slides.length}개의 슬라이드 추출됨`);

            // 세션 메타데이터 업데이트
            await sessionManager.updateSessionMetadata(sessionId, {
                slideCount: slides.length
            });

            // 2. 콘텐츠 분석 (계속 내용분석 단계로 표시)
            console.log(`2. 콘텐츠 분석 중... (분석 타입: ${metadata.analysisType})`);
            this.updateProcessStatus(jobId, 'analyze', 60, '슬라이드 내용 분석 중...');

            // 분석 타입 전달
            const analysisResults = await this.contentAnalyzer.analyzePPTContent(slides, metadata.analysisType);
            console.log('   - 슬라이드 분석 완료');
            this.updateProcessStatus(jobId, 'analyze', 80, '슬라이드 내용 분석 완료', `${analysisResults.length}개의 슬라이드 분석됨`);

            // 3. 스크립트 생성 (두 번째 단계로 표시)
            console.log('3. 강의 스크립트 생성 중...');
            this.updateProcessStatus(jobId, 'generate', 85, '강의 스크립트 생성 중...');
            const difficulty = req.body.difficulty || 'INTERMEDIATE'; // 기본값 설정
            const finalScript = await this.scriptGenerator.generatePresentationSummary(
                analysisResults,
                difficulty
            );
            console.log('   - 스크립트 생성 완료');
            this.updateProcessStatus(jobId, 'generate', 100, '처리 완료', '스크립트 생성이 완료되었습니다.');

            // 세션 상태 업데이트
            await sessionManager.updateSessionMetadata(sessionId, {
                status: 'completed',
                completedAt: new Date().toISOString(),
                processingTime: (Date.now() - startTime) / 1000
            });

            // 4. 응답 전송
            const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`처리 완료 (${processingTime}초 소요)`);

            res.json({
                status: 'success',
                jobId: jobId,
                sessionId: sessionId, // 세션 ID 추가
                processingTime: `${processingTime}초`,
                slides: JSON.parse(finalScript).slideAnalysis
            });

        } catch (error) {
            console.error('처리 중 오류 발생:', error);
            this.updateProcessStatus(jobId, 'error', 0, '처리 중 오류 발생', error.message);

            // 세션 상태 업데이트
            await sessionManager.updateSessionMetadata(sessionId, {
                status: 'error',
                error: error.message
            });

            res.status(500).json({
                status: 'error',
                message: error.message
            });
        } finally {
            // 임시 파일 정리
            this.cleanupTempFiles();
        }
    }

    async cleanupTempFiles() {
        try {
            for (const filePath of config.tempFiles) {
                try {
                    await fs.unlink(filePath);
                    config.tempFiles.delete(filePath);
                } catch (error) {
                    console.warn(`임시 파일 삭제 실패: ${filePath}`, error);
                }
            }
        } catch (error) {
            console.error('임시 파일 정리 중 오류:', error);
        }
    }

    start(port = process.env.PORT || 8898) {
        // 필요한 디렉토리 생성
        Object.values(config.dirs).forEach(dir => {
            fs.mkdir(dir, { recursive: true }).catch(console.error);
        });

        // 세션 관리자 초기화
        sessionManager.initialize().catch(console.error);

        this.app.listen(port, () => {
            console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
            console.log('지원되는 디렉토리:');
            Object.entries(config.dirs).forEach(([key, value]) => {
                console.log(`- ${key}: ${value}`);
            });
        });
    }
}

// 서버 인스턴스 생성 및 시작
const server = new Server();
server.start();

module.exports = server;