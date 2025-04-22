// modules/session-utils.js
const fs = require('fs').promises;
const path = require('path');

class SessionManager {
    constructor() {
        this.sessionsDir = path.join(process.cwd(), 'sessions');
        this.sessionInfoFile = path.join(process.cwd(), 'session_info.json');
        this.sessionInfo = {};
    }

    async initialize() {
        try {
            // sessions 디렉토리 생성
            await fs.mkdir(this.sessionsDir, { recursive: true });
            
            // 세션 정보 파일 로드 또는 생성
            try {
                const data = await fs.readFile(this.sessionInfoFile, 'utf-8');
                this.sessionInfo = JSON.parse(data);
            } catch (error) {
                // 파일이 없으면 새로 생성
                await this.saveSessionInfo();
            }
            
            console.log('세션 관리자 초기화 완료');
        } catch (error) {
            console.error('세션 관리자 초기화 실패:', error);
        }
    }

    async saveSessionInfo() {
        try {
            await fs.writeFile(
                this.sessionInfoFile,
                JSON.stringify(this.sessionInfo, null, 2),
                'utf-8'
            );
        } catch (error) {
            console.error('세션 정보 저장 실패:', error);
        }
    }

    async createSession(sessionId, metadata = {}) {
        try {
            // 세션 디렉토리 생성
            const sessionDir = path.join(this.sessionsDir, sessionId);
            await fs.mkdir(sessionDir, { recursive: true });
            
            // 세션 내부의 필요한 디렉토리 생성
            const directories = [
                path.join(sessionDir, 'upload'),
                path.join(sessionDir, 'extracted_content'),
                path.join(sessionDir, 'temp'),
                path.join(sessionDir, 'images')
            ];
            
            for (const dir of directories) {
                await fs.mkdir(dir, { recursive: true });
            }
            
            // public/audio 아래에 세션 디렉토리 생성
            const audioDir = path.join(process.cwd(), 'public', 'audio', sessionId);
            await fs.mkdir(audioDir, { recursive: true });
            
            // 세션 정보 저장
            this.sessionInfo[sessionId] = {
                id: sessionId,
                createdAt: new Date().toISOString(),
                lastAccessed: new Date().toISOString(),
                ...metadata
            };
            
            await this.saveSessionInfo();
            
            return sessionId;
        } catch (error) {
            console.error(`세션 생성 실패 (${sessionId}):`, error);
            throw error;
        }
    }
    
    async getSession(sessionId) {
        // 세션 정보 반환
        if (this.sessionInfo[sessionId]) {
            // 마지막 접근 시간 업데이트
            this.sessionInfo[sessionId].lastAccessed = new Date().toISOString();
            await this.saveSessionInfo();
            
            return this.sessionInfo[sessionId];
        }
        
        return null;
    }
    
    async checkSessionExists(sessionId) {
        try {
            // 세션 디렉토리 존재 여부 확인
            const sessionDir = path.join(this.sessionsDir, sessionId);
            await fs.access(sessionDir);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    async updateSessionMetadata(sessionId, metadata) {
        if (this.sessionInfo[sessionId]) {
            this.sessionInfo[sessionId] = {
                ...this.sessionInfo[sessionId],
                ...metadata,
                lastAccessed: new Date().toISOString()
            };
            
            await this.saveSessionInfo();
            return true;
        }
        
        return false;
    }
    
    async cleanupOldSessions(maxAgeInDays = 30) {
        try {
            const now = new Date();
            const maxAgeMs = maxAgeInDays * 24 * 60 * 60 * 1000;
            const sessionsToDelete = [];
            
            // 오래된 세션 찾기
            for (const [sessionId, info] of Object.entries(this.sessionInfo)) {
                const lastAccessed = new Date(info.lastAccessed);
                const ageMs = now - lastAccessed;
                
                if (ageMs > maxAgeMs) {
                    sessionsToDelete.push(sessionId);
                }
            }
            
            // 오래된 세션 삭제
            for (const sessionId of sessionsToDelete) {
                try {
                    // 세션 디렉토리 삭제
                    const sessionDir = path.join(this.sessionsDir, sessionId);
                    await fs.rmdir(sessionDir, { recursive: true });
                    
                    // 오디오 디렉토리 삭제
                    const audioDir = path.join(process.cwd(), 'public', 'audio', sessionId);
                    await fs.rmdir(audioDir, { recursive: true });
                    
                    // 세션 정보에서 제거
                    delete this.sessionInfo[sessionId];
                    
                    console.log(`오래된 세션 삭제됨: ${sessionId}`);
                } catch (error) {
                    console.error(`세션 삭제 실패 (${sessionId}):`, error);
                }
            }
            
            // 세션 정보 저장
            if (sessionsToDelete.length > 0) {
                await this.saveSessionInfo();
            }
            
            return sessionsToDelete.length;
        } catch (error) {
            console.error('세션 정리 중 오류:', error);
            throw error;
        }
    }
}

// 세션 관리자 인스턴스 생성 및 내보내기
const sessionManager = new SessionManager();

// 서버 시작 시 초기화
sessionManager.initialize().catch(console.error);

module.exports = sessionManager;