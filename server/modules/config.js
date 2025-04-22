// modules/config.js
const path = require('path');

class Config {
    constructor(baseDir = process.cwd()) {
        this.sessionId = '';
        
        // 기본 디렉토리 구조 - subtitles 추가
        this.dirs = {
            upload: path.join(baseDir, 'upload'),
            extracted: path.join(baseDir, 'extracted_content'),
            temp: path.join(baseDir, 'temp'),
            images: path.join(baseDir, 'images'),
            original_images: path.join(baseDir, 'original_images'),
            audio: path.join(baseDir, 'public', 'audio'),
            videos: path.join(baseDir, 'public', 'videos'),
            subtitles: path.join(baseDir, 'public', 'subtitles')
        };

        // 파일 네이밍 규칙 - 자막 관련 함수 추가
        this.fileNames = {
            getPdfName: () => `presentation.pdf`,
            getSlideName: (slideNum) => `slide-${String(slideNum).padStart(2, '0')}.png`,
            getSlideJsonName: (slideNum) => `slide_${slideNum}.json`,
            getSlideAudioName: (slideNum) => `slide_${slideNum}.mp3`,
            getSlideVideoName: (slideNum) => `slide_${slideNum}.mp4`,
            // 자막 파일 이름 생성 함수 추가
            getSlideSubtitleName: (slideNum, format) => `slide_${slideNum}.${format}`,
            getFinalAudioName: () => 'final_lecture_audio.mp3',
            getFinalVideoName: () => 'final_lecture_video.mp4',
            // 최종 자막 파일 이름 생성 함수 추가
            getFinalSubtitleName: (format) => `final_lecture_subtitle.${format}`,
            getPresentationSummary: () => 'presentation_summary.json',
            getFinalAnalysis: () => 'final_analysis.json',
            getFinalScript: () => 'final_lecture_script.json'
        };

        // 임시 파일 관리
        this.tempFiles = new Set();
    }

    // 세션 ID 설정 메서드 추가
    setSessionId(sessionId) {
        this.sessionId = sessionId;
        
        // 세션별 폴더 경로 업데이트
        this.dirs = {
            upload: path.join(process.cwd(), sessionId ? path.join('sessions', sessionId, 'upload') : 'upload'),
            extracted: path.join(process.cwd(), sessionId ? path.join('sessions', sessionId, 'extracted_content') : 'extracted_content'),
            temp: path.join(process.cwd(), sessionId ? path.join('sessions', sessionId, 'temp') : 'temp'),
            images: path.join(process.cwd(), sessionId ? path.join('sessions', sessionId, 'images') : 'images'),
            original_images: path.join(process.cwd(), sessionId ? path.join('sessions', sessionId, 'original_images') : 'original_images'),
            audio: path.join(process.cwd(), 'public', 'audio', sessionId || ''),
            videos: path.join(process.cwd(), 'public', 'videos', sessionId || ''),
            subtitles: path.join(process.cwd(), 'public', 'subtitles', sessionId || '')
        };
        
        return this;
    }

    // 파일 경로 생성 메서드
    getPath(type, fileName) {
        return path.join(this.dirs[type], fileName);
    }

    // 임시 파일 추적
    addTempFile(filePath) {
        this.tempFiles.add(filePath);
    }

    // 디렉토리 경로 가져오기
    getDirPath(type) {
        return this.dirs[type];
    }

    // 파일 이름 생성
    getFileName(type, ...args) {
        if (typeof this.fileNames[type] !== 'function') {
            throw new Error(`Filename generator function '${type}' is not defined`);
        }
        return this.fileNames[type](...args);
    }

    // 전체 파일 경로 생성
    getFullPath(dirType, fileNameType, ...args) {
        const fileName = this.getFileName(fileNameType, ...args);
        return path.join(this.dirs[dirType], fileName);
    }

    // 오디오 파일 경로 생성
    getAudioPath(fileNameType, ...args) {
        const fileName = this.getFileName(fileNameType, ...args);
        return path.join(this.dirs.audio, fileName);
    }
    
    // 비디오 파일 경로 생성
    getVideoPath(fileNameType, ...args) {
        const fileName = this.getFileName(fileNameType, ...args);
        return path.join(this.dirs.videos, fileName);
    }
    
    // 자막 파일 경로 생성 메서드 추가
    getSubtitlePath(fileNameType, ...args) {
        const fileName = this.getFileName(fileNameType, ...args);
        return path.join(this.dirs.subtitles, fileName);
    }
    
    // 오디오 파일의 웹 접근 경로 생성
    getPublicAudioPath(fileNameType, ...args) {
        const fileName = this.getFileName(fileNameType, ...args);
        const prefix = this.sessionId ? `/${this.sessionId}` : '';
        return `/audio${prefix}/${fileName}`;
    }
    
    // 비디오 파일의 웹 접근 경로 생성
    getPublicVideoPath(fileNameType, ...args) {
        const fileName = this.getFileName(fileNameType, ...args);
        const prefix = this.sessionId ? `/${this.sessionId}` : '';
        return `/videos${prefix}/${fileName}`;
    }
    
    // 자막 파일의 웹 접근 경로 생성 메서드 추가
    getPublicSubtitlePath(fileNameType, ...args) {
        const fileName = this.getFileName(fileNameType, ...args);
        const prefix = this.sessionId ? `/${this.sessionId}` : '';
        return `/subtitles${prefix}/${fileName}`;
    }
    
    // 추출된 콘텐츠의 웹 접근 경로 생성
    getPublicExtractedPath(fileName) {
        const prefix = this.sessionId ? `/sessions/${this.sessionId}` : '';
        return `${prefix}/extracted_content/${fileName}`;
    }
    
    // 원본 이미지의 웹 접근 경로 생성
    getPublicOriginalImagePath(slideNum) {
        const fileName = this.getFileName('getSlideName', slideNum);
        const prefix = this.sessionId ? `/sessions/${this.sessionId}` : '';
        return `${prefix}/original_images/${fileName}`;
    }
}

// 설정 인스턴스 생성 및 내보내기
const config = new Config();
module.exports = config;