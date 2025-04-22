// modules/VideoGenerator.js
const fs = require('fs').promises;
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const config = require('./config');

class VideoGenerator {
    constructor() {
        // 필요한 초기화 작업이 있으면 여기에 추가
    }

    async init() {
        // 필요한 디렉토리 생성
        await fs.mkdir(config.getDirPath('videos'), { recursive: true });
    }

    /**
     * 단일 슬라이드에 대한 비디오 생성
     * @param {number} slideNumber - 슬라이드 번호
     * @param {string} audioPath - 오디오 파일 경로
     * @returns {Promise<string>} - 생성된 비디오 파일 경로
     */
    async generateSlideVideo(slideNumber) {
        try {
            await this.init();

            // 필요한 파일 경로 구성
            const audioPath = config.getAudioPath('getSlideAudioName', slideNumber);
        
            // extracted_content 폴더에서 이미지 찾기
            const sessionId = config.sessionId;
            const originalImagePath = path.join(
                process.cwd(), 
                'sessions', 
                sessionId, 
                'extracted_content', 
                `slide-${String(slideNumber).padStart(2, '0')}.png`
            );
            
            console.log(`이미지 경로 시도: ${originalImagePath}`);
            
            const outputPath = config.getVideoPath('getSlideVideoName', slideNumber);

            // 파일 존재 확인
            await fs.access(audioPath);
            await fs.access(originalImagePath);

            // videos 디렉토리가 없으면 생성
            await fs.mkdir(path.dirname(outputPath), { recursive: true });

            console.log(`슬라이드 ${slideNumber} 비디오 생성 시작...`);
            console.log(`이미지: ${originalImagePath}`);
            console.log(`오디오: ${audioPath}`);
            console.log(`출력: ${outputPath}`);
            // ffmpeg를 사용하여 비디오 생성
            return new Promise((resolve, reject) => {
                ffmpeg()
                    .input(originalImagePath)
                    .inputOptions(['-loop 1'])
                    .input(audioPath)
                    .outputOptions([
                        '-c:v libx264',
                        '-tune stillimage',
                        '-c:a aac',
                        '-b:a 192k',
                        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
                        '-pix_fmt yuv420p',
                        '-shortest'
                    ])
                    .output(outputPath)
                    .on('start', (commandLine) => {
                        console.log('FFmpeg 명령어:', commandLine);
                    })
                    .on('progress', (progress) => {
                        console.log(`처리 중: ${progress.percent ? progress.percent.toFixed(1) : '?'}% 완료`);
                    })
                    .on('end', () => {
                        console.log(`슬라이드 ${slideNumber} 비디오 생성 완료!`);
                        resolve(outputPath);
                    })
                    .on('error', (err) => {
                        console.error(`슬라이드 ${slideNumber} 비디오 생성 오류:`, err);
                        reject(err);
                    })
                    .run();
            });
        } catch (error) {
            console.error(`슬라이드 ${slideNumber} 비디오 생성 실패:`, error);
            throw error;
        }
    }

    /**
     * 모든 슬라이드를 하나의 전체 비디오로 생성
     * @param {number} slideCount - 총 슬라이드 수
     * @returns {Promise<string>} - 생성된 비디오 파일 경로
     */
    async generateFullVideo(slideCount) {
        try {
            await this.init();

            // 개별 슬라이드 비디오 경로 목록 생성
            const slideVideoPaths = [];
            for (let i = 1; i <= slideCount; i++) {
                const videoPath = config.getVideoPath('getSlideVideoName', i);

                // 파일 존재 확인
                try {
                    await fs.access(videoPath);
                    slideVideoPaths.push(videoPath);
                } catch (error) {
                    // 해당 슬라이드의 비디오가 없으면 건너뛰고 로그 기록
                    console.warn(`슬라이드 ${i}의 비디오가 없어 전체 비디오에서 제외됩니다:`, error.message);
                }
            }

            if (slideVideoPaths.length === 0) {
                throw new Error('병합할 슬라이드 비디오가 없습니다. 먼저 개별 슬라이드 비디오를 생성해주세요.');
            }

            // 임시 파일 리스트 생성
            const tempListFile = path.join(config.getDirPath('temp'), 'video_list.txt');
            let fileContent = slideVideoPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
            await fs.writeFile(tempListFile, fileContent, 'utf8');

            // 출력 경로 설정
            const outputPath = config.getVideoPath('getFinalVideoName');
            await fs.mkdir(path.dirname(outputPath), { recursive: true });

            console.log('전체 강의 비디오 생성 시작...');
            console.log(`입력: ${slideVideoPaths.length}개 비디오 파일`);
            console.log(`출력: ${outputPath}`);

            // ffmpeg를 사용하여 비디오 병합
            return new Promise((resolve, reject) => {
                ffmpeg()
                    .input(tempListFile)
                    .inputOptions(['-f concat', '-safe 0'])
                    .outputOptions([
                        '-c copy'  // 단순 연결 (빠름)
                    ])
                    .output(outputPath)
                    .on('start', (commandLine) => {
                        console.log('FFmpeg 명령어:', commandLine);
                    })
                    .on('progress', (progress) => {
                        console.log(`처리 중: ${progress.percent ? progress.percent.toFixed(1) : '?'}% 완료`);
                    })
                    .on('end', async () => {
                        // 임시 파일 삭제
                        try {
                            await fs.unlink(tempListFile);
                        } catch (err) {
                            console.warn('임시 파일 삭제 실패:', err);
                        }

                        console.log('전체 강의 비디오 생성 완료!');
                        resolve(outputPath);
                    })
                    .on('error', async (err) => {
                        // 임시 파일 삭제 시도
                        try {
                            await fs.unlink(tempListFile);
                        } catch (cleanupErr) {
                            console.warn('임시 파일 삭제 실패:', cleanupErr);
                        }

                        console.error('전체 비디오 생성 오류:', err);
                        reject(err);
                    })
                    .run();
            });
        } catch (error) {
            console.error('전체 비디오 생성 실패:', error);
            throw error;
        }
    }

    /**
     * 직접 전체 강의 비디오 생성 (오디오 파일과 이미지를 개별적으로 조합) - 대안 방식
     * @returns {Promise<string>} - 생성된 비디오 파일 경로
     */
    async generateFullLectureVideo() {
        try {
            await this.init();

            // 전체 강의 오디오 파일 경로
            const finalAudioPath = config.getAudioPath('getFinalAudioName');

            // 출력 경로 설정
            const outputPath = config.getVideoPath('getFinalVideoName');
            await fs.mkdir(path.dirname(outputPath), { recursive: true });

            // 스크립트 파일에서 슬라이드 정보 가져오기
            const scriptPath = config.getFullPath('extracted', 'getFinalScript');
            const scriptData = JSON.parse(await fs.readFile(scriptPath, 'utf-8'));

            // 이미지 목록 준비
            const imageListFile = path.join(config.getDirPath('temp'), 'image_list.txt');
            let imageListContent = '';

            for (const slide of scriptData.slideAnalysis) {
                const originalImagePath = path.join(
                    config.getDirPath('original_images'),
                    config.getFileName('getSlideName', slide.slideNumber)
                );

                // 이미지 파일 존재 확인
                try {
                    await fs.access(originalImagePath);
                    // 각 이미지가 표시될 지속 시간은 나중에 설정됨
                    imageListContent += `file '${originalImagePath.replace(/'/g, "'\\''")}'
duration 5\n`;  // 기본값으로 5초 설정
                } catch (error) {
                    console.warn(`슬라이드 ${slide.slideNumber}의 이미지가 없어 건너뜁니다:`, error.message);
                }
            }

            // 마지막 이미지 다시 추가 (마지막 지속 시간을 위해)
            const lastSlide = scriptData.slideAnalysis[scriptData.slideAnalysis.length - 1];
            const lastImagePath = path.join(
                config.getDirPath('original_images'),
                config.getFileName('getSlideName', lastSlide.slideNumber)
            );
            imageListContent += `file '${lastImagePath.replace(/'/g, "'\\''")}'`;

            // 이미지 목록 파일 저장
            await fs.writeFile(imageListFile, imageListContent, 'utf8');

            console.log('전체 강의 비디오 생성 시작 (슬라이드쇼 방식)...');
            console.log(`오디오: ${finalAudioPath}`);
            console.log(`출력: ${outputPath}`);

            // ffmpeg를 사용하여 슬라이드쇼 비디오 생성
            return new Promise((resolve, reject) => {
                ffmpeg()
                    .input(imageListFile)
                    .inputOptions(['-f concat', '-safe 0'])
                    .input(finalAudioPath)
                    .outputOptions([
                        '-c:v libx264',
                        '-pix_fmt yuv420p',
                        '-c:a aac',
                        '-b:a 192k',
                        '-shortest'
                    ])
                    .output(outputPath)
                    .on('start', (commandLine) => {
                        console.log('FFmpeg 명령어:', commandLine);
                    })
                    .on('progress', (progress) => {
                        console.log(`처리 중: ${progress.percent ? progress.percent.toFixed(1) : '?'}% 완료`);
                    })
                    .on('end', async () => {
                        // 임시 파일 삭제
                        try {
                            await fs.unlink(imageListFile);
                        } catch (err) {
                            console.warn('임시 파일 삭제 실패:', err);
                        }

                        console.log('전체 강의 비디오 생성 완료!');
                        resolve(outputPath);
                    })
                    .on('error', async (err) => {
                        // 임시 파일 삭제 시도
                        try {
                            await fs.unlink(imageListFile);
                        } catch (cleanupErr) {
                            console.warn('임시 파일 삭제 실패:', cleanupErr);
                        }

                        console.error('전체 비디오 생성 오류:', err);
                        reject(err);
                    })
                    .run();
            });
        } catch (error) {
            console.error('전체 강의 비디오 생성 실패:', error);
            throw error;
        }
    }

    /**
     * 생성된 비디오 파일을 ZIP으로 압축
     * @returns {Promise<string>} - 생성된 ZIP 파일 경로
     */
    async createVideoZip() {
        // 이 기능은 server.js에서 기존 오디오 ZIP 다운로드 기능을 확장하여 구현
        // 여기서는 메서드 시그니처만 정의
    }
}

module.exports = VideoGenerator;