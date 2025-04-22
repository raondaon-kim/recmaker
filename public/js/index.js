class PPTAnalyzer {
    constructor() {
        this.initialize();
        this.bindEvents();
        this.checkSessionId();
        this.handleGenerateAllAudio();
        this.handleGenerateAllVideos();
    }

    // index.js의 initialize 메서드 업데이트

    // index.js의 initialize 메서드 수정 부분
    // 페이지 로드 시 학문적 스타일을 기본으로 적용

    initialize() {
        // DOM 요소
        this.dropZone = document.getElementById('drop-zone');
        this.fileInput = document.getElementById('file-input');
        this.difficultySelect = document.getElementById('difficulty');
        this.analysisTypeSelect = document.getElementById('analysis-type'); // 새로 추가된 분석 타입 선택 요소
        this.processingSection = document.getElementById('processing');
        this.resultsSection = document.getElementById('results');
        this.slidesContainer = document.getElementById('slides-container');
        this.uploadSection = document.getElementById('upload-section');
        this.statusText = document.getElementById('status-text');
        this.progressBar = document.getElementById('progress-bar')?.querySelector('div');
        this.progressPercentage = document.getElementById('progress-percentage');
        this.downloadScriptBtn = document.getElementById('download-script-btn');
        this.sessionInfoDisplay = document.getElementById('session-info');
        this.sessionIdDisplay = document.getElementById('session-id-display');
        this.copySessionLinkBtn = document.getElementById('copy-session-link');
        this.sessionUrlBox = document.getElementById('session-url-box');
        this.permanentUrlDisplay = document.getElementById('permanent-url');
        this.copyUrlBtn = document.getElementById('copy-url-btn');
        this.copySuccessMsg = document.getElementById('copy-success');
        this.uploadPptBtn = document.getElementById('upload-ppt-btn');
        this.uploadScriptBtn = document.getElementById('upload-script-btn');
        this.pptUploadSection = document.getElementById('ppt-upload-section');
        this.scriptUploadSection = document.getElementById('script-upload-section');
        this.scriptDropZone = document.getElementById('script-drop-zone');
        this.scriptFileInput = document.getElementById('script-file-input');
        // 템플릿 요소
        this.slideItemTemplate = document.getElementById('slide-item-template');
        const showLogsBtn = document.getElementById('show-logs');
        if (showLogsBtn) {
            showLogsBtn.addEventListener('click', () => {
                const logsContainer = document.querySelector('.logs-container');
                if (logsContainer) {
                    logsContainer.classList.toggle('hidden');
                    showLogsBtn.querySelector('span').textContent = 
                        logsContainer.classList.contains('hidden') ? '▶' : '▼';
                }
            });
        }
         // 분석 접근법 탭 관련 요소 추가
    this.theoryBtn = document.getElementById('theory-approach-btn');
    this.contextBtn = document.getElementById('context-approach-btn');
    
    // 분석 접근법 탭 이벤트 바인딩
    if (this.theoryBtn && this.contextBtn) {
        this.theoryBtn.addEventListener('click', this.handleTheoryApproach.bind(this));
        this.contextBtn.addEventListener('click', this.handleContextApproach.bind(this));
    }
    
    // 기본 설정 - 학문적 옵션으로 초기화
    if (this.difficultySelect) {
        this.difficultySelect.value = 'ACADEMIC';
    }

    if (this.analysisTypeSelect) {
        this.analysisTypeSelect.value = 'academic';
    }

    // 결과 UI에 학문적 모드 스타일 적용
    document.body.classList.add('academic-mode');

        // 진행 단계
        this.steps = ['analyze', 'generate'];
        this.currentStep = 0;
        this.isEditing = false;

        // 진행률 관련 변수
        this.progressValue = 0;
        this.processingStartTime = null;
        this.slideImages = {};

        // 세션 ID 관련 변수 추가
        this.sessionId = null;

        // 기본값 설정 - 학문적 옵션으로 초기화
        if (this.difficultySelect) {
            this.difficultySelect.value = 'ACADEMIC';
        }

        if (this.analysisTypeSelect) {
            this.analysisTypeSelect.value = 'academic';
        }

        // 결과 UI에 학문적 모드 스타일 적용
        document.body.classList.add('academic-mode');

        // 분석 타입에 따른 UI 업데이트 처리
        if (this.analysisTypeSelect && this.difficultySelect) {
            // 분석 타입이 변경될 때 이벤트
            this.analysisTypeSelect.addEventListener('change', () => {
                if (this.analysisTypeSelect.value === 'academic') {
                    // 학문적 분석 모드일 때 난이도를 자동으로 '학문적'으로 설정
                    this.difficultySelect.value = 'ACADEMIC';
                    document.body.classList.add('academic-mode');
                } else {
                    document.body.classList.remove('academic-mode');
                }
            });

            // 난이도가 '학문적'으로 변경될 때 이벤트
            this.difficultySelect.addEventListener('change', () => {
                if (this.difficultySelect.value === 'ACADEMIC') {
                    // 난이도가 학문적이면 분석 타입도 '학문적'으로 설정
                    this.analysisTypeSelect.value = 'academic';
                    document.body.classList.add('academic-mode');
                } else if (this.analysisTypeSelect.value === 'academic') {
                    document.body.classList.remove('academic-mode');
                }
            });
        }

        if (this.uploadPptBtn) {
            this.uploadPptBtn.addEventListener('click', () => {
                this.pptUploadSection.classList.remove('hidden');
                this.scriptUploadSection.classList.add('hidden');
                this.uploadPptBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
                this.uploadPptBtn.classList.remove('bg-gray-400', 'hover:bg-gray-500');
                this.uploadScriptBtn.classList.add('bg-gray-400', 'hover:bg-gray-500');
                this.uploadScriptBtn.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
            });
        }

        if (this.uploadScriptBtn) {
            this.uploadScriptBtn.addEventListener('click', () => {
                this.pptUploadSection.classList.add('hidden');
                this.scriptUploadSection.classList.remove('hidden');
                this.uploadPptBtn.classList.add('bg-gray-400', 'hover:bg-gray-500');
                this.uploadPptBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                this.uploadScriptBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
                this.uploadScriptBtn.classList.remove('bg-gray-400', 'hover:bg-gray-500');
            });
        }
        // 스크립트 드래그 앤 드롭 이벤트
        if (this.scriptDropZone) {
            this.scriptDropZone.addEventListener('dragover', this.handleDragOver.bind(this));
            this.scriptDropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
            this.scriptDropZone.addEventListener('drop', this.handleScriptDrop.bind(this));
            this.scriptDropZone.addEventListener('click', () => this.scriptFileInput.click());
        }

        // 스크립트 파일 선택 이벤트
        if (this.scriptFileInput) {
            this.scriptFileInput.addEventListener('change', this.handleScriptFileSelect.bind(this));
        }
        const styleElement = document.createElement('style');
    styleElement.textContent = `
        /* 이미지 확대 모달 스타일 */
        .image-preview-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease, visibility 0.3s ease;
        }
        
        .image-preview-modal.show {
            opacity: 1;
            visibility: visible;
        }
        
        .image-preview-content {
            max-width: 90%;
            max-height: 90%;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
            animation: zoomIn 0.3s ease;
            position: relative;
        }
        
        .image-preview-img {
            display: block;
            max-width: 100%;
            max-height: 90vh;
            margin: 0 auto;
        }
        
        .image-preview-close {
            position: absolute;
            top: -30px;
            right: 0;
            color: white;
            font-size: 24px;
            cursor: pointer;
            background: none;
            border: none;
        }
        
        @keyframes zoomIn {
            from { transform: scale(0.5); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        
        /* 슬라이드 썸네일에 마우스 오버 효과 */
        .slide-thumbnail {
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .slide-thumbnail:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        
        /* 모달이 열렸을 때 body 스크롤 방지 */
        body.modal-open {
            overflow: hidden;
        }
        
        /* 진행 모달 UI 수정 - 요소 숨김 */
        #progress-modal #progress-percentage,
        #progress-modal .w-full.bg-gray-200.rounded-full.h-3.overflow-hidden,
        #progress-modal #progress-details {
            display: none !important;
        }
        
        /* 프로그레스 모달 스타일 개선 */
        #progress-modal .max-w-md {
            max-width: 320px;
        }
        
        #progress-modal h3 {
            font-size: 1.1rem;
            margin-bottom: 0.75rem;
        }
        
        #progress-modal .mb-4 {
            margin-bottom: 0.75rem;
        }
    `;
    document.head.appendChild(styleElement);
    
    // 이미지 확대 모달 초기화 함수 호출
    setTimeout(() => {
        if (typeof initImagePreview === 'function') {
            initImagePreview();
        } else {
            // 초기화 함수가 없으면 직접 구현
            this.setupImagePreview();
        }
    }, 500);
        this.initializeUnifiedContentGeneration();

    }
    handleScriptDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        this.scriptDropZone.classList.remove('drop-zone--over');

        const files = e.dataTransfer.files;
        if (files.length) {
            this.processScriptFile(files[0]);
        }
    }

    handleScriptFileSelect(e) {
        const files = e.target.files;
        if (files.length) {
            this.processScriptFile(files[0]);
        }
    }
    initializeUnifiedContentGeneration() {
        // 통합 콘텐츠 생성 버튼 찾기 또는 생성
        const resultsHeader = document.querySelector('.results-header');
        if (resultsHeader) {
            // 기존 버튼들 제거
            const existingButtons = resultsHeader.querySelectorAll('button:not(#download-script-btn)');
            existingButtons.forEach(button => {
                if (button.id !== 'download-script-btn') {
                    button.style.display = 'none';
                }
            });
            
            // 통합 버튼 추가
            if (!document.getElementById('unified-content-generation-btn')) {
                const unifiedBtn = document.createElement('button');
                unifiedBtn.id = 'unified-content-generation-btn';
                unifiedBtn.className = 'bg-pink-200 hover:bg-pink-300 text-gray-800 px-4 py-2 rounded-md flex items-center transition-all';
                unifiedBtn.innerHTML = '<i class="fas fa-magic mr-2"></i> 콘텐츠 생성 및 다운로드';
                unifiedBtn.addEventListener('click', this.startUnifiedContentGeneration.bind(this));
                
                // 스크립트 다운로드 버튼 옆에 추가
                const downloadScriptBtn = document.getElementById('download-script-btn');
                if (downloadScriptBtn) {
                    downloadScriptBtn.classList = 'bg-pink-200 hover:bg-pink-300 text-gray-800 px-4 py-2 rounded-md flex items-center transition-all';
                    downloadScriptBtn.parentNode.appendChild(unifiedBtn);
                } else {
                    resultsHeader.appendChild(unifiedBtn);
                }
            }
        }
        
        // 각 슬라이드에서 불필요한 버튼 숨기기 및 재생성 버튼만 표시
        const slideItems = document.querySelectorAll('.slide-item');
        slideItems.forEach(slideItem => {
            // 오디오 및 비디오 생성 버튼 숨기기
            const audioButton = slideItem.querySelector('.generate-audio-button');
            const videoButton = slideItem.querySelector('.generate-video-button');
            
            if (audioButton) audioButton.style.display = 'none';
            if (videoButton) videoButton.style.display = 'none';
            
            // 재생성 버튼만 표시
            const regenerateButton = slideItem.querySelector('.regenerate-slide-button');
            if (regenerateButton) {
                regenerateButton.classList.add('bg-pink-500', 'hover:bg-pink-600');
                regenerateButton.style.display = 'flex';
            }
        });
        
        // 진행 모달 생성
        this.createProgressModal();
        
        // 스타일 추가
        this.addUnifiedStyles();
    }
    
    // 진행 모달 생성
    createProgressModal() {
        if (!document.getElementById('progress-modal')) {
            const modal = document.createElement('div');
            modal.id = 'progress-modal';
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
            modal.innerHTML = `
                <div class="bg-white rounded-lg p-6 max-w-md w-full">
                    <h3 id="progress-title" class="text-xl font-bold mb-4">콘텐츠 생성 중...</h3>
                    
                    <div class="mb-4">
                        <div class="flex justify-between mb-1">
                            <span id="progress-step" class="font-medium">1/4: 음성 전체 생성</span>
                            <span id="progress-percentage" class="font-medium">0%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div id="progress-bar" class="h-3 rounded-full transition-all" style="width: 0%; background-color: #50b7f5;"></div>
                        </div>
                    </div>
                    
                    <div class="flex justify-between mb-2">
                        <span id="item-progress-label" class="text-sm font-medium">개별 진행상태:</span>
                        <span id="item-progress-count" class="text-sm font-medium">0/0 완료</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-3">
                        <div id="item-progress-bar" class="h-2 rounded-full transition-all" style="width: 0%; background-color: #50b7f5;"></div>
                    </div>
                    
                    <div id="progress-details" class="mb-4 text-sm text-gray-600 max-h-40 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50">
                        <p>콘텐츠 생성 준비 중...</p>
                    </div>
                    
                    <div class="flex justify-end space-x-2">
                        <button id="cancel-generation-btn" class="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors">취소</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // 취소 버튼 이벤트 연결
            const cancelBtn = document.getElementById('cancel-generation-btn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    if (window.generationCancelled !== true) {
                        window.generationCancelled = true;
                        document.getElementById('progress-details').innerHTML += '<p class="text-red-500">사용자에 의해 취소되었습니다.</p>';
                        
                        setTimeout(() => {
                            document.getElementById('progress-modal').classList.add('hidden');
                            this.resetProgress();
                        }, 3000);
                    }
                });
            }
            
            // 프로그레스 관련 스타일 추가
            this.addProgressStyles();
        }
    }
    
    
    
    // 스타일 추가
    addUnifiedStyles() {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .regenerate-slide-button {
                background-color: #ec4899 !important; /* pink-500 */
                color: white !important;
                padding: 0.25rem 0.75rem !important;
                border-radius: 0.375rem !important;
                display: flex !important;
                align-items: center !important;
                font-size: 0.875rem !important;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
                transition: all 0.2s !important;
            }
    
            .regenerate-slide-button:hover {
                background-color: #db2777 !important; /* pink-600 */
                transform: translateY(-1px) !important;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
            }
    
            #progress-modal {
                transition: opacity 0.3s ease;
            }
    
            #progress-modal.hidden {
                opacity: 0;
                pointer-events: none;
            }
    
            #progress-modal:not(.hidden) {
                opacity: 1;
            }
    
            #progress-bar {
                transition: width 0.5s ease;
            }
        `;
        document.head.appendChild(styleElement);
    }
    
    // 통합 콘텐츠 생성 프로세스 시작
    async startUnifiedContentGeneration() {
        // 취소 상태 초기화
        window.generationCancelled = false;
        
        // 진행 모달 표시
        const progressModal = document.getElementById('progress-modal');
        if (progressModal) progressModal.classList.remove('hidden');
        
        // 진행 상태 초기화
        this.resetProgress();
        
        try {
            // 슬라이드 수 확인
            const slideItems = document.querySelectorAll('.slide-item');
            const totalSlides = slideItems.length;
            
            // 1. 음성 전체 생성
            this.updateProgress(1, '음성 전체 생성', 0, 0, totalSlides);
            document.getElementById('progress-details').innerHTML += '<p>음성 전체 생성을 시작합니다...</p>';
            await this.generateAllAudioSequential(totalSlides);
            if (window.generationCancelled) return;
            
            // 2. 전체 비디오 생성
            this.updateProgress(2, '전체 비디오 생성', 25, 0, totalSlides);
            document.getElementById('progress-details').innerHTML += '<p>비디오 전체 생성을 시작합니다...</p>';
            await this.generateAllVideosSequential(totalSlides);
            if (window.generationCancelled) return;
            
            // 3. 슬라이드 영상 합치기
            this.updateProgress(3, '슬라이드 영상 합치기', 50, 0, 1);
            document.getElementById('progress-details').innerHTML += '<p>슬라이드 영상을 합치는 중입니다...</p>';
            await this.generateFullVideoSequential();
            if (window.generationCancelled) return;
            
            // 4. ZIP 파일 다운로드
            this.updateProgress(4, 'ZIP 파일 다운로드', 75, 0, 1);
            document.getElementById('progress-details').innerHTML += '<p>ZIP 파일 다운로드 준비 중입니다...</p>';
            await this.downloadVideoZipSequential();
            if (window.generationCancelled) return;
            
            // 모든 단계 완료
            this.updateProgress(4, '콘텐츠 생성 완료', 100, 1, 1);
            document.getElementById('progress-details').innerHTML += '<p class="text-green-600 font-bold">✓ 모든 콘텐츠가 성공적으로 생성되었습니다!</p>';
            
            // 성공 메시지 표시 후 3초 후에 모달 닫기
            setTimeout(function() {
                if (progressModal) progressModal.classList.add('hidden');
            }, 3000);
            
        } catch (error) {
            // 오류 발생 시 처리
            const progressDetails = document.getElementById('progress-details');
            if (progressDetails) {
                progressDetails.innerHTML += `<p class="text-red-500">오류 발생: ${error.message}</p>`;
            }
            
            const progressTitle = document.getElementById('progress-title');
            if (progressTitle) {
                progressTitle.textContent = '오류 발생';
            }
        }
    }
    
    // 진행 상태 초기화
    updateProgress(step, stepName, percentage) {
        document.getElementById('progress-step').textContent = `${step}/4: ${stepName}`;
        document.getElementById('progress-percentage').textContent = `${percentage}%`;
        document.getElementById('progress-bar').style.width = `${percentage}%`;
    }
    
    // 진행 상태 업데이트
    updateProgress(step, stepName, percentage) {
        document.getElementById('progress-step').textContent = `${step}/4: ${stepName}`;
        document.getElementById('progress-percentage').textContent = `${percentage}%`;
        document.getElementById('progress-bar').style.width = `${percentage}%`;
        document.getElementById('progress-details').innerHTML += `<p>- ${stepName} 중...</p>`;
    }
    
    // 기존의 handleGenerateAllAudio 메서드를 수정하여 시퀀셜한 버전으로 만들기
    async generateAllAudioSequential(totalSlides) {
        try {
            const progressDetails = document.getElementById('progress-details');
            if (progressDetails) {
                progressDetails.innerHTML += '<p>음성 파일 생성 중...</p>';
            }
            
            // 슬라이드 항목 가져오기
            const slideItems = document.querySelectorAll('.slide-item');
            
            // 이미 오디오가 있는 슬라이드 확인
            let existingAudioCount = 0;
            
            for (let i = 0; i < slideItems.length; i++) {
                const slideElement = slideItems[i];
                const audioContainer = slideElement.querySelector('.audio-container');
                const existingAudio = audioContainer?.querySelector('.audio-player');
                
                if (existingAudio) {
                    existingAudioCount++;
                }
            }
            
            // 처리할 슬라이드 목록 생성
            const processingSlides = [];
            for (let i = 0; i < slideItems.length; i++) {
                const slideElement = slideItems[i];
                const slideNumber = i + 1;
                
                // 오디오가 없는 경우에만 생성 대상에 추가
                const audioContainer = slideElement.querySelector('.audio-container');
                const existingAudio = audioContainer?.querySelector('.audio-player');
                
                if (!existingAudio) {
                    processingSlides.push({ slideNumber, slideElement });
                }
            }
            
            // 처리해야 할 슬라이드가 있는 경우
            if (processingSlides.length > 0) {
                // 진행 상태 업데이트 - 존재하는 오디오는 이미 완료된 것으로 표시
                this.updateProgress(1, '음성 전체 생성', 5, existingAudioCount, totalSlides);
                
                if (progressDetails) {
                    progressDetails.innerHTML += `<p>이미 생성된 음성: ${existingAudioCount}/${totalSlides}</p>`;
                    progressDetails.innerHTML += `<p>새로 생성할 음성: ${processingSlides.length}개</p>`;
                }
                
                // 슬라이드별 음성 생성
                const chunkSize = 3; // 한 번에 처리할 슬라이드 수
                let completedCount = 0;
                
                for (let i = 0; i < processingSlides.length; i += chunkSize) {
                    const chunk = processingSlides.slice(i, i + chunkSize);
                    const chunkPromises = chunk.map(async ({ slideNumber, slideElement }) => {
                        if (progressDetails) {
                            progressDetails.innerHTML += `<p>슬라이드 ${slideNumber} 음성 생성 중...</p>`;
                        }
                        
                        // 슬라이드 오디오 생성 함수 호출
                        await this.generateSlideAudio(slideNumber, slideElement);
                        
                        completedCount++;
                        const totalCompletedCount = existingAudioCount + completedCount;
                        
                        // 진행률 계산 - 음성 생성은 0-25% 구간
                        const percentage = 5 + (completedCount / processingSlides.length) * 20;
                        
                        // 진행 상태 업데이트
                        this.updateProgress(1, '음성 전체 생성', Math.round(percentage), totalCompletedCount, totalSlides);
                        
                        if (progressDetails) {
                            progressDetails.innerHTML += `<p>슬라이드 ${slideNumber} 음성 생성 완료 (${totalCompletedCount}/${totalSlides})</p>`;
                        }
                    });
                    
                    try {
                        // 각 청크를 병렬로 처리
                        await Promise.all(chunkPromises);
                    } catch (error) {
                        if (progressDetails) {
                            progressDetails.innerHTML += `<p class="text-red-500">일부 슬라이드 처리 중 오류 발생: ${error.message}</p>`;
                        }
                        // 오류가 있어도 계속 진행
                    }
                }
            } else {
                // 모든 슬라이드에 이미 오디오가 있는 경우
                this.updateProgress(1, '음성 전체 생성', 25, totalSlides, totalSlides);
                if (progressDetails) {
                    progressDetails.innerHTML += `<p>모든 슬라이드(${totalSlides}개)에 이미 음성이 생성되어 있습니다.</p>`;
                }
            }
            
            // 음성 병합 부분 제거
            if (progressDetails) {
                progressDetails.innerHTML += '<p class="text-green-500">✓ 음성 생성 완료</p>';
            }
            
        } catch (error) {
            throw new Error(`음성 생성 중 오류: ${error.message}`);
        }
    }
    
    
    
    // 기존의 handleGenerateAllVideos 메서드를 수정하여 시퀀셜한 버전으로 만들기
    async generateAllVideosSequential(totalSlides) {
        try {
            const progressDetails = document.getElementById('progress-details');
            if (progressDetails) {
                progressDetails.innerHTML += '<p>비디오 파일 생성 중...</p>';
            }
            
            // 슬라이드 항목 가져오기
            const slideItems = document.querySelectorAll('.slide-item');
            
            // 이미 비디오가 있는 슬라이드 확인
            let existingVideoCount = 0;
            
            for (let i = 0; i < slideItems.length; i++) {
                const slideElement = slideItems[i];
                const videoContainer = slideElement.querySelector('.video-container');
                const existingVideo = videoContainer?.querySelector('.video-player');
                
                if (existingVideo) {
                    existingVideoCount++;
                }
            }
            
            // 진행 상태 업데이트 - 존재하는 비디오는 이미 완료된 것으로 표시
            this.updateProgress(2, '전체 비디오 생성', 25, existingVideoCount, totalSlides);
            
            if (progressDetails) {
                progressDetails.innerHTML += `<p>이미 생성된 비디오: ${existingVideoCount}/${totalSlides}</p>`;
            }
            
            // 순차적으로 각 슬라이드의 비디오 생성
            let completedCount = 0;
            
            for (let i = 0; i < slideItems.length; i++) {
                if (window.generationCancelled) break;
                
                const slideElement = slideItems[i];
                const slideNumber = i + 1;
                
                // 이미 생성된 비디오가 있는지 확인
                const videoContainer = slideElement.querySelector('.video-container');
                const existingVideo = videoContainer?.querySelector('.video-player');
                
                // 비디오가 없는 경우에만 생성
                if (!existingVideo) {
                    if (progressDetails) {
                        progressDetails.innerHTML += `<p>슬라이드 ${slideNumber} 비디오 생성 중...</p>`;
                    }
                    
                    // 비디오 생성 함수 호출
                    await this.generateSlideVideo(slideNumber, slideElement);
                    
                    // 진행률 계산 - 비디오 생성은 25-50% 구간
                    completedCount++;
                    const totalCompletedCount = existingVideoCount + completedCount;
                    const percentage = 25 + (completedCount / (totalSlides - existingVideoCount)) * 25;
                    
                    // 진행 상태 업데이트
                    this.updateProgress(2, '전체 비디오 생성', Math.round(percentage), totalCompletedCount, totalSlides);
                    
                    if (progressDetails) {
                        progressDetails.innerHTML += `<p>슬라이드 ${slideNumber} 비디오 생성 완료 (${totalCompletedCount}/${totalSlides})</p>`;
                    }
                    
                    // 잠시 대기 (서버 부하 방지)
                    await this.sleep(500);
                }
            }
            
            if (progressDetails) {
                progressDetails.innerHTML += '<p class="text-green-500">✓ 전체 비디오 생성 완료</p>';
            }
            
        } catch (error) {
            throw new Error(`비디오 생성 중 오류: ${error.message}`);
        }
    }
    
    
    // handleFullVideoGeneration 메서드를 수정하여 시퀀셜한 버전으로 만들기
    async generateFullVideoSequential() {
        try {
            const progressDetails = document.getElementById('progress-details');
            if (progressDetails) {
                progressDetails.innerHTML += '<p>슬라이드 영상을 하나로 합치는 중...</p>';
            }
            
            // 진행률 시뮬레이션
            for (let i = 0; i <= 100; i += 10) {
                if (window.generationCancelled) return;
                
                // 진행률 계산 - 영상 합치기는 50-75% 구간
                const percentage = 50 + (i / 100) * 25;
                this.updateProgress(3, '슬라이드 영상 합치기', Math.round(percentage), Math.floor(i / 100), 1);
                
                await this.sleep(300);
            }
            
            // 실제 작업 수행
            await this.handleFullVideoGeneration();
            
            if (progressDetails) {
                progressDetails.innerHTML += '<p class="text-green-500">✓ 영상 합치기 완료</p>';
            }
            
        } catch (error) {
            throw new Error(`영상 합치기 중 오류: ${error.message}`);
        }
    }
    
    // handleVideoZipDownload 메서드를 수정하여 시퀀셜한 버전으로 만들기
    async downloadVideoZipSequential() {
        try {
            const progressDetails = document.getElementById('progress-details');
            if (progressDetails) {
                progressDetails.innerHTML += '<p>모든 콘텐츠 ZIP 파일 다운로드 준비 중...</p>';
            }
            
            // 스크립트 데이터 먼저 생성
            const scriptText = await this.generateScriptMarkdown();
            
            // 진행률 시뮬레이션
            for (let i = 0; i <= 100; i += 20) {
                if (window.generationCancelled) return;
                
                // 진행률 계산 - ZIP 다운로드는 75-100% 구간
                const percentage = 75 + (i / 100) * 25;
                this.updateProgress(4, '통합 ZIP 파일 다운로드', Math.round(percentage), Math.floor(i / 100), 1);
                
                await this.sleep(200);
            }
            
            // 새로운 API 호출 - 모든 콘텐츠를 하나의 ZIP으로
            let zipUrl = '/recmaker-api/download-all-content-zip';
            if (this.sessionId) {
                zipUrl += `?sessionId=${this.sessionId}`;
            }
            
            // 스크립트 내용을 로컬 스토리지에 임시 저장 - 서버가 스크립트를 가져갈 수 있도록
            localStorage.setItem('temp_script_content', scriptText);
            localStorage.setItem('temp_session_id', this.sessionId || '');
            
            // 새 탭에서 다운로드 시작
            window.location.href = zipUrl;
            
            if (progressDetails) {
                progressDetails.innerHTML += '<p class="text-green-500">✓ 통합 ZIP 파일 다운로드 완료</p>';
            }
            
        } catch (error) {
            throw new Error(`ZIP 다운로드 중 오류: ${error.message}`);
        }
    }
    
    async generateScriptMarkdown() {
        try {
            // 스크립트 데이터 가져오기
            let url = '/recmaker-api/get-script';;
            if (this.sessionId) {
                url += `?sessionId=${this.sessionId}`;
            }
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('스크립트를 가져올 수 없습니다.');
            }
            
            const data = await response.json();
            if (data.status === 'success' && data.script) {
                // 스크립트 텍스트 생성 - 첨부하신 형식과 동일하게 구성
                let scriptText = '# 강의 스크립트\n\n';
                
                if (this.sessionId) {
                    scriptText += `세션 ID: ${this.sessionId}\n`;
                    scriptText += `영구 접근 URL: ${window.location.origin}/${this.sessionId}\n\n`;
                }
                
                // 슬라이드별 내용 추가 (각 슬라이드는 "## 슬라이드 X" 형식으로 시작)
                data.script.slideAnalysis.forEach(slide => {
                    scriptText += `## 슬라이드 ${slide.slideNumber}\n\n${slide.analysis}\n\n`;
                });
                
                return scriptText;
            } else {
                throw new Error('스크립트 데이터가 유효하지 않습니다.');
            }
        } catch (error) {
            console.error('스크립트 생성 오류:', error);
            return '# 오류: 스크립트를 생성할 수 없습니다.';
        }
    }
    
    resetProgress() {
        const progressTitle = document.getElementById('progress-title');
        const progressStep = document.getElementById('progress-step');
        const progressPercentage = document.getElementById('progress-percentage');
        const progressBar = document.getElementById('progress-bar');
        const progressDetails = document.getElementById('progress-details');
        const itemProgressBar = document.getElementById('item-progress-bar');
        const itemProgressCount = document.getElementById('item-progress-count');
        
        if (progressTitle) progressTitle.textContent = '콘텐츠 생성 중...';
        if (progressStep) progressStep.textContent = '1/4: 음성 전체 생성';
        if (progressPercentage) progressPercentage.textContent = '0%';
        if (progressBar) {
            progressBar.style.width = '0%';
            progressBar.style.backgroundColor = '#50b7f5'; // 첫 단계는 파란색
        }
        if (progressDetails) progressDetails.innerHTML = '<p>콘텐츠 생성 준비 중...</p>';
        if (itemProgressBar) {
            itemProgressBar.style.width = '0%';
            itemProgressBar.style.backgroundColor = '#50b7f5';
        }
        if (itemProgressCount) itemProgressCount.textContent = '0/0 완료';
        
        // 단계별 상태 저장용 객체 초기화
        window.generationProgress = {
            currentStep: 1,
            totalSteps: 4,
            currentItemCount: 0,
            totalItemCount: 0
        };
    }
    
    addProgressStyles() {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            #progress-modal {
                transition: opacity 0.3s ease;
            }
    
            #progress-modal.hidden {
                opacity: 0;
                pointer-events: none;
            }
    
            #progress-modal:not(.hidden) {
                opacity: 1;
            }
    
            #progress-bar, #item-progress-bar {
                transition: width 0.3s ease, background-color 0.5s ease;
            }
            
            #progress-details {
                font-family: monospace;
                line-height: 1.4;
                max-height: 150px;
                overflow-y: auto;
                scroll-behavior: smooth;
            }
            
            #progress-details p {
                margin: 4px 0;
                padding: 2px 0;
                border-bottom: 1px dashed #e5e7eb;
            }
            
            #progress-details p:last-child {
                border-bottom: none;
            }
            
            .step-audio { background-color: #50b7f5 !important; }
            .step-video { background-color: rgb(220, 38, 38) !important; }
            .step-merge { background-color: #8b5cf6 !important; }
            .step-zip { background-color: #10b981 !important; }
        `;
        document.head.appendChild(styleElement);
    }
    
    // 유틸리티 함수
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async processScriptFile(file) {
        if (!file.name.match(/\.md$/i)) {
            alert('마크다운(.md) 파일만 업로드 가능합니다.');
            return;
        }
        const analysisTabs = document.querySelector('.analysis-tabs');
        if (analysisTabs) {
            analysisTabs.classList.add('hidden');
        }
        this.showProcessing();

        try {
            // 파일 내용 읽기
            const content = await this.readFileContent(file);

            // 마크다운 파싱
            const parsedData = this.parseMarkdownScript(content);

            if (!parsedData.sessionId) {
                throw new Error('세션 ID를 찾을 수 없습니다. 올바른 스크립트 파일인지 확인해주세요.');
            }

            // 세션 ID 설정
            this.sessionId = parsedData.sessionId;

            // 스크립트 업데이트 API 호출
            const response = await fetch(`/recmaker-api/update-script?sessionId=${this.sessionId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    updatedScript: {
                        slideAnalysis: parsedData.slides
                    }
                })
            });

            if (!response.ok) {
                throw new Error('스크립트 업데이트에 실패했습니다.');
            }

            const data = await response.json();

            if (data.status === 'success') {
                // URL 업데이트 (히스토리에 새 항목 추가하지 않고 현재 URL 변경)
                window.history.replaceState({}, '', `/recmaker/${this.sessionId}`);

                // 세션 데이터 로드
                await this.loadSessionData();

                this.hideProcessing();
                this.addLogEntry(`스크립트 업데이트 성공: ${this.sessionId}`, 'success');
            } else {
                throw new Error(data.message || '스크립트 업데이트에 실패했습니다.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('스크립트 처리 중 오류가 발생했습니다: ' + error.message);
            this.hideProcessing();
        }
    }
    handleTheoryApproach() {
        // 활성화 상태 변경
        this.theoryBtn.classList.add('active');
        this.contextBtn.classList.remove('active');
        
        // 체크 아이콘 표시/숨김
        const theoryCheckIcon = this.theoryBtn.querySelector('.check-icon');
        const contextCheckIcon = this.contextBtn.querySelector('.check-icon');
        
        if (theoryCheckIcon) {
            theoryCheckIcon.classList.remove('opacity-0');
            theoryCheckIcon.style.backgroundColor = '#dd6b20'; // 활성화된 오렌지색
        }
        
        if (contextCheckIcon) {
           // contextCheckIcon.classList.add('opacity-0');
            contextCheckIcon.style.backgroundColor = '#e2e8f0'; // 비활성화된 회색
        }
        
        // 테두리 색상 변경
        this.theoryBtn.classList.remove('border-gray-300');
        this.theoryBtn.classList.add('border-orange-500');
        this.contextBtn.classList.remove('border-orange-500');
        this.contextBtn.classList.add('border-blue-300');
        
        // 드롭다운 값 설정
        if (this.analysisTypeSelect) this.analysisTypeSelect.value = 'academic';
        if (this.difficultySelect) this.difficultySelect.value = 'ACADEMIC';
    }
    handleContextApproach() {
        // 활성화 상태 변경
        this.contextBtn.classList.add('active');
        this.theoryBtn.classList.remove('active');
        
        // 체크 아이콘 표시/숨김
        const theoryCheckIcon = this.theoryBtn.querySelector('.check-icon');
        const contextCheckIcon = this.contextBtn.querySelector('.check-icon');
        
        if (contextCheckIcon) {
            contextCheckIcon.classList.remove('opacity-0');
            contextCheckIcon.style.backgroundColor = '#dd6b20'; // 활성화된 오렌지색
        }
        
        if (theoryCheckIcon) {
            //theoryCheckIcon.classList.add('opacity-0');
            theoryCheckIcon.style.backgroundColor = '#e2e8f0'; // 비활성화된 회색
        }
        
        // 테두리 색상 변경
        this.contextBtn.classList.remove('border-gray-300', 'border-blue-300');
        this.contextBtn.classList.add('border-orange-500');
        this.theoryBtn.classList.remove('border-orange-500');
        this.theoryBtn.classList.add('border-blue-300');
        
        // 드롭다운 값 설정
        if (this.analysisTypeSelect) this.analysisTypeSelect.value = 'standard';
        if (this.difficultySelect) this.difficultySelect.value = 'INTERMEDIATE';
    }
    
    // 파일 내용 읽기 함수
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    }

    // 마크다운 스크립트 파싱 함수
    parseMarkdownScript(content) {
        // 세션 ID 추출
        const sessionIdMatch = content.match(/세션 ID:\s*([a-fA-F0-9]+)/);
        const sessionId = sessionIdMatch ? sessionIdMatch[1].trim() : null;

        // 슬라이드별 내용 추출
        const slidePattern = /## 슬라이드 (\d+)\s*\n\n([\s\S]*?)(?=## 슬라이드 \d+|$)/g;
        const slides = [];
        let match;

        while ((match = slidePattern.exec(content)) !== null) {
            const slideNumber = parseInt(match[1], 10);
            const analysis = match[2].trim();

            slides.push({
                slideNumber,
                analysis
            });
        }

        // 슬라이드 번호 기준으로 정렬
        slides.sort((a, b) => a.slideNumber - b.slideNumber);

        return {
            sessionId,
            slides
        };
    }
    // URL에서 세션 ID 확인하고 데이터 로드
    checkSessionId() {
        const pathParts = window.location.pathname.split('/');
        // "/recmaker/세션ID" 형식인 경우에만 세션 ID로 인식
        if (pathParts.length > 2 && pathParts[1] === 'recmaker' && pathParts[2].length === 32) {
            this.sessionId = pathParts[2];
            console.log('세션 ID 감지:', this.sessionId);
    
            // 세션 ID가 있으면 업로드 섹션 숨기기
            if (this.uploadSection) {
                this.uploadSection.classList.add('hidden');
            }
            
            // 분석 탭 숨기기
            const analysisTabs = document.querySelector('.analysis-tabs');
            if (analysisTabs) {
                analysisTabs.classList.add('hidden');
            }
    
            // 세션 ID가 있으면 해당 세션의 데이터 로드
            this.loadSessionData();
        } else {
            // 세션 ID가 없거나 유효하지 않으면 기본 업로드 화면 표시
            if (this.uploadSection) {
                this.uploadSection.classList.remove('hidden');
            }
            
            const analysisTabs = document.querySelector('.analysis-tabs');
            if (analysisTabs) {
                analysisTabs.classList.remove('hidden');
            }
            
            // 결과 섹션 숨기기
            if (this.resultsSection) {
                this.resultsSection.classList.add('hidden');
            }
        }
    }
    

    // 세션 ID 표시 업데이트
    /*updateSessionDisplay() {
        if (this.sessionId && this.sessionInfoDisplay && this.sessionIdDisplay) {
            this.sessionInfoDisplay.classList.remove('hidden');
            this.sessionIdDisplay.textContent = this.sessionId;
            
            // 세션 URL 정보 업데이트
            if (this.sessionUrlBox && this.permanentUrlDisplay) {
                const permanentUrl = `${window.location.origin}/${this.sessionId}`;
                this.sessionUrlBox.classList.remove('hidden');
                this.permanentUrlDisplay.textContent = permanentUrl;
                this.permanentUrlDisplay.href = permanentUrl;
            }
        }
    }*/
    updateButtonStates() {
        // 버튼 요소 가져오기
        const downloadScriptBtn = document.getElementById('download-script-btn');
        const mergeAudioBtn = document.querySelector('.merge-audio-button');
        const generateAllAudioBtn = document.querySelector('.generate-all-audio-button');
        const generateAllVideosBtn = document.querySelector('.generate-all-videos-button');
        const generateFullVideoBtn = document.querySelector('.generate-full-video-button');
        const downloadVideoBtn = document.querySelector('.download-video-button');

        // 오디오 및 비디오 상태 확인
        const audioElements = document.querySelectorAll('.audio-player');
        const videoElements = document.querySelectorAll('.video-player');
        const totalSlides = document.querySelectorAll('.slide-item').length;
        const hasAllAudio = audioElements.length === totalSlides;
        const hasAllVideo = videoElements.length === totalSlides;
        const hasFinalAudio = document.querySelector('.merged-audio-container') !== null;
        const hasFinalVideo = document.querySelector('.full-video-container') !== null;

        // 버튼 초기화
        if (downloadScriptBtn) {
            downloadScriptBtn.disabled = false;
        }

        // 음성 다운로드 버튼 상태 업데이트
        if (mergeAudioBtn) {
            mergeAudioBtn.disabled = !hasAllAudio;
            this.addTooltip(mergeAudioBtn, '모든 슬라이드의 음성을 먼저 생성해야 합니다', !hasAllAudio);
        }

        // 음성 전체 생성 버튼은 항상 활성화
        if (generateAllAudioBtn) {
            generateAllAudioBtn.disabled = false;
        }

        // 전체 비디오 생성 버튼 상태 업데이트
        if (generateAllVideosBtn) {
            generateAllVideosBtn.disabled = !hasAllAudio;
            this.addTooltip(generateAllVideosBtn, '모든 슬라이드의 음성을 먼저 생성해야 합니다', !hasAllAudio);
        }

        // 스크립트 영상 합치기 버튼 상태 업데이트
        if (generateFullVideoBtn) {
            generateFullVideoBtn.disabled = !hasAllVideo;
            this.addTooltip(generateFullVideoBtn, '모든 슬라이드의 비디오를 먼저 생성해야 합니다', !hasAllVideo);
        }

        // 비디오 다운로드 버튼 상태 업데이트
        if (downloadVideoBtn) {
            downloadVideoBtn.disabled = !hasFinalVideo && !hasAllVideo;
            this.addTooltip(downloadVideoBtn, '비디오가 생성되어야 다운로드할 수 있습니다', !hasFinalVideo && !hasAllVideo);
        }

        // 버튼에 배지 추가하기
        this.updateButtonBadges(totalSlides, audioElements.length, videoElements.length);
    }
    // 5. 버튼 배지 업데이트 함수
    updateButtonBadges(totalSlides, audioCount, videoCount) {
        // 음성 배지 업데이트
        const audioBtn = document.querySelector('.generate-all-audio-button');
        if (audioBtn) {
            let audioBadge = audioBtn.querySelector('.btn-badge');
            if (!audioBadge) {
                audioBadge = document.createElement('span');
                audioBadge.className = 'btn-badge';
                // 버튼 내부의 .btn-content 요소 앞에 배지 삽입
                const btnContent = audioBtn.querySelector('.btn-content');
                if (btnContent) {
                    audioBtn.insertBefore(audioBadge, btnContent);
                } else {
                    audioBtn.appendChild(audioBadge);
                }
            }

            if (audioCount === 0) {
                audioBadge.textContent = '준비 전';
                audioBadge.className = 'btn-badge pending';
            } else if (audioCount === totalSlides) {
                audioBadge.textContent = '완료';
                audioBadge.className = 'btn-badge ready';
            } else {
                audioBadge.textContent = `${audioCount}/${totalSlides}`;
                audioBadge.className = 'btn-badge pending';
            }
        }

        // 비디오 배지 업데이트
        const videoBtn = document.querySelector('.generate-all-videos-button');
        if (videoBtn) {
            let videoBadge = videoBtn.querySelector('.btn-badge');
            if (!videoBadge) {
                videoBadge = document.createElement('span');
                videoBadge.className = 'btn-badge';
                // 버튼 내부의 .btn-content 요소 앞에 배지 삽입
                const btnContent = videoBtn.querySelector('.btn-content');
                if (btnContent) {
                    videoBtn.insertBefore(videoBadge, btnContent);
                } else {
                    videoBtn.appendChild(videoBadge);
                }
            }

            if (videoCount === 0) {
                videoBadge.textContent = '준비 전';
                videoBadge.className = 'btn-badge pending';
            } else if (videoCount === totalSlides) {
                videoBadge.textContent = '완료';
                videoBadge.className = 'btn-badge ready';
            } else {
                videoBadge.textContent = `${videoCount}/${totalSlides}`;
                videoBadge.className = 'btn-badge pending';
            }
        }
    }
    // 버튼에 툴팁 추가 메서드
    addTooltip(button, message, show) {
        if (!button) return;

        // 이미 툴팁 래퍼가 있는지 확인
        let tooltipWrapper = button.parentElement;
        if (!tooltipWrapper.classList.contains('tooltip')) {
            // 버튼을 툴팁 래퍼로 감싸기
            const parent = button.parentElement;
            tooltipWrapper = document.createElement('div');
            tooltipWrapper.className = 'tooltip';
            parent.replaceChild(tooltipWrapper, button);
            tooltipWrapper.appendChild(button);
        }

        // 툴팁 텍스트 요소 찾기 또는 생성
        let tooltipText = tooltipWrapper.querySelector('.tooltip-text');
        if (!tooltipText) {
            tooltipText = document.createElement('span');
            tooltipText.className = 'tooltip-text';
            tooltipWrapper.appendChild(tooltipText);
        }

        // 툴팁 메시지 설정
        tooltipText.textContent = message;

        // 툴팁 표시 여부 설정
        if (show) {
            tooltipText.style.display = 'block';
        } else {
            tooltipText.style.display = 'none';
        }
    }

    showWorkflowGuide() {
        const workflowGuide = document.createElement('div');
        workflowGuide.className = 'workflow-guide bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded-r-md';
        workflowGuide.innerHTML = `
                <h3 class="text-lg font-semibold text-blue-700 mb-2">작업 순서 가이드</h3>
                <ol class="list-decimal pl-5 text-blue-600 space-y-1">
                    <li>음성 전체 생성 또는 각 슬라이드 음성 생성</li>
                    <li>음성 다운로드 (선택사항)</li>
                    <li>전체 비디오 생성 또는 각 슬라이드 비디오 생성</li>
                    <li>스크립트 영상 합치기</li>
                    <li>비디오 다운로드</li>
                </ol>
                <p class="text-sm text-blue-500 mt-2">* 각 단계는 이전 단계가 완료되어야 진행 가능합니다</p>
            `;

        // results-header 앞에 삽입
        const resultsHeader = document.querySelector('.results-header');
        if (resultsHeader && !document.querySelector('.workflow-guide')) {
            resultsHeader.parentNode.insertBefore(workflowGuide, resultsHeader);
        }
    }

    // 상태 배지 업데이트 메서드
    updateStatusBadges(totalSlides, audioCount, videoCount) {
        // 음성 상태 배지
        const audioBtn = document.querySelector('.generate-all-audio-button');
        if (audioBtn) {
            let audioBadge = audioBtn.querySelector('.status-badge');
            if (!audioBadge) {
                audioBadge = document.createElement('span');
                audioBadge.className = 'status-badge';
                audioBtn.appendChild(audioBadge);
            }

            if (audioCount === 0) {
                audioBadge.textContent = '시작 전';
                audioBadge.className = 'status-badge pending';
            } else if (audioCount === totalSlides) {
                audioBadge.textContent = '완료';
                audioBadge.className = 'status-badge completed';
            } else {
                audioBadge.textContent = `${audioCount}/${totalSlides}`;
                audioBadge.className = 'status-badge pending';
            }
        }

        // 비디오 상태 배지
        const videoBtn = document.querySelector('.generate-all-videos-button');
        if (videoBtn) {
            let videoBadge = videoBtn.querySelector('.status-badge');
            if (!videoBadge) {
                videoBadge = document.createElement('span');
                videoBadge.className = 'status-badge';
                videoBtn.appendChild(videoBadge);
            }

            if (videoCount === 0) {
                videoBadge.textContent = '시작 전';
                videoBadge.className = 'status-badge pending';
            } else if (videoCount === totalSlides) {
                videoBadge.textContent = '완료';
                videoBadge.className = 'status-badge completed';
            } else {
                videoBadge.textContent = `${videoCount}/${totalSlides}`;
                videoBadge.className = 'status-badge pending';
            }
        }
    }
    // 세션 데이터 로드
    async loadSessionData() {
        try {
            this.addLogEntry(`세션 데이터 로드 중...`);

            // 세션 ID로 스크립트 데이터 가져오기
           
            const response = await fetch(`/recmaker-api/get-script?sessionId=${this.sessionId}`);
        
            if (!response.ok) {
                throw new Error('세션 데이터를 불러올 수 없습니다.');
            }

            const data = await response.json();

            if (data.status === 'success' && data.script) {
                // 슬라이드 이미지 경로 설정
                this.fetchSlideImages(data.script.slideAnalysis.length);

                // 슬라이드 데이터 저장
                this.slideData = data.script.slideAnalysis;

                // 결과 표시
                this.displayResults({
                    slides: data.script.slideAnalysis
                });

                // 기존 오디오 파일 확인
                await this.checkExistingAudioFiles(data.script.slideAnalysis.length);
                // 기존 비디오 파일 확인 
                await this.checkExistingVideoFiles(data.script.slideAnalysis.length);

                this.addLogEntry('세션 데이터 로드 완료', 'success');
            } else {
                
                if (this.uploadSection) {
                    this.uploadSection.classList.remove('hidden');
                }
                
                // 결과 섹션 숨기기
                if (this.resultsSection) {
                    this.resultsSection.classList.add('hidden');
                }
            }
        } catch (error) {
            console.error('세션 데이터 로드 실패:', error);
            alert(`세션 데이터를 불러오는 데 실패했습니다: ${error.message}`);
        }
    }


    bindEvents() {
        // 드래그 앤 드롭 이벤트
        if (this.dropZone) {
            this.dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
            this.dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
            this.dropZone.addEventListener('drop', this.handleDrop.bind(this));
            this.dropZone.addEventListener('click', () => this.fileInput.click());
        }

        // 파일 선택 이벤트
        if (this.fileInput) {
            this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        }

        // 다운로드 버튼 이벤트
        if (this.downloadScriptBtn) {
            this.downloadScriptBtn.addEventListener('click', this.handleScriptDownload.bind(this));
        }

        // 세션 링크 복사 버튼 이벤트
        if (this.copySessionLinkBtn) {
            this.copySessionLinkBtn.addEventListener('click', this.copySessionLink.bind(this));
        }

        // URL 복사 버튼 이벤트
        if (this.copyUrlBtn) {
            this.copyUrlBtn.addEventListener('click', this.copyPermanentUrl.bind(this));
        }
    }
    // 전체 비디오 생성 
    async handleGenerateAllVideos() {
        try {
            const generateButton = document.querySelector('.generate-all-videos-button');
            if (!generateButton) return;

            const originalText = generateButton.innerHTML;
            generateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 비디오 생성 중...';
            generateButton.disabled = true;

            this.addLogEntry('전체 슬라이드 비디오 생성 시작...', 'info');

            // 슬라이드 항목 가져오기
            const slideItems = document.querySelectorAll('.slide-item');

            // 순차적으로 각 슬라이드의 비디오 생성
            for (let i = 0; i < slideItems.length; i++) {
                const slideElement = slideItems[i];
                const slideNumber = i + 1;

                // 현재 처리 중인 슬라이드 표시
                generateButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 슬라이드 ${slideNumber}/${slideItems.length} 처리 중...`;

                // 이미 생성된 비디오가 있는지 확인
                const videoContainer = slideElement.querySelector('.video-container');
                const existingVideo = videoContainer?.querySelector('.video-player');

                // 비디오가 없는 경우에만 생성
                if (!existingVideo) {
                    this.addLogEntry(`슬라이드 ${slideNumber} 비디오 생성 중...`, 'info');

                    // 비디오 생성 버튼 찾기
                    const videoButton = slideElement.querySelector('.generate-video-button');

                    if (videoButton) {
                        // 슬라이드 비디오 생성 함수 호출
                        await this.generateSlideVideo(slideNumber, slideElement);

                        // 잠시 대기 (서버 부하 방지)
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } else {
                        this.addLogEntry(`슬라이드 ${slideNumber}의 비디오 생성 버튼을 찾을 수 없습니다.`, 'warning');
                    }
                } else {
                    this.addLogEntry(`슬라이드 ${slideNumber}의 비디오는 이미 생성되어 있습니다.`, 'info');
                }
            }

            // 완료 후 버튼 상태 복원
            generateButton.innerHTML = '<i class="fas fa-check"></i> 완료';
            setTimeout(() => {
                generateButton.innerHTML = originalText;
                generateButton.disabled = false;
            }, 3000);

            this.addLogEntry('전체 슬라이드 비디오 생성 완료', 'success');

        } catch (error) {
            const generateButton = document.querySelector('.generate-all-videos-button');
            if (generateButton) {
                generateButton.innerHTML = '<i class="fas fa-video"></i> 전체 비디오 생성';
                generateButton.disabled = false;
            }

            alert('비디오 전체 생성 중 오류가 발생했습니다: ' + error.message);
            this.addLogEntry(`비디오 전체 생성 오류: ${error.message}`, 'error');
        }
    }

    //전체 오디오 생성
    async handleGenerateAllAudio() {
        try {
            const generateButton = document.querySelector('.generate-all-audio-button');
            if (!generateButton) return;

            // 슬라이드 항목 가져오기
            const slideItems = document.querySelectorAll('.slide-item');

            // 이미 오디오가 있는 슬라이드 확인
            let existingAudioCount = 0;
            let totalSlides = slideItems.length;

            for (let i = 0; i < totalSlides; i++) {
                const slideElement = slideItems[i];
                const audioContainer = slideElement.querySelector('.audio-container');
                const existingAudio = audioContainer?.querySelector('.audio-player');

                if (existingAudio) {
                    existingAudioCount++;
                }
            }

            // 모든 슬라이드에 이미 오디오가 있는 경우
            if (existingAudioCount === totalSlides) {
                const shouldReset = confirm('모든 슬라이드에 이미 음성이 생성되어 있습니다. 기존 음성을 모두 삭제하고 다시 생성하시겠습니까?');

                if (shouldReset) {
                    // 기존 오디오 삭제
                    for (let i = 0; i < totalSlides; i++) {
                        const slideElement = slideItems[i];
                        const audioContainer = slideElement.querySelector('.audio-container');
                        const existingAudio = audioContainer?.querySelector('.audio-player');

                        if (existingAudio) {
                            existingAudio.remove();
                            audioContainer.style.display = 'none';

                            // 버튼 초기화
                            const audioButton = slideElement.querySelector('.generate-audio-button');
                            if (audioButton) {
                                audioButton.innerHTML = '<i class="fas fa-volume-up"></i> 음성 생성';
                                audioButton.classList.remove('completed');
                            }
                        }
                    }

                    // 병합된 오디오도 삭제
                    const mergedAudioContainer = document.querySelector('.merged-audio-container');
                    if (mergedAudioContainer) {
                        mergedAudioContainer.remove();
                    }

                    this.addLogEntry('기존 오디오 파일이 삭제되었습니다. 새로운 음성을 생성합니다.', 'info');
                } else {
                    this.addLogEntry('음성 재생성이 취소되었습니다.', 'info');
                    return; // 사용자가 취소한 경우 여기서 종료
                }
            }

            // 버튼 상태 변경
            const originalText = generateButton.innerHTML;
            generateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 음성 생성 준비 중...';
            generateButton.disabled = true;

            this.addLogEntry('전체 슬라이드 음성 병렬 생성 시작...', 'info');

            // 처리할 슬라이드 목록 생성
            const processingSlides = [];
            for (let i = 0; i < slideItems.length; i++) {
                const slideElement = slideItems[i];
                const slideNumber = i + 1;

                // 오디오가 없는 경우에만 생성 대상에 추가
                const audioContainer = slideElement.querySelector('.audio-container');
                const existingAudio = audioContainer?.querySelector('.audio-player');

                if (!existingAudio) {
                    const audioButton = slideElement.querySelector('.generate-audio-button');
                    if (audioButton) {
                        processingSlides.push({ slideNumber, slideElement });
                    }
                } else {
                    this.addLogEntry(`슬라이드 ${slideNumber}의 음성은 이미 생성되어 있습니다.`, 'info');
                }
            }

            // 처리할 슬라이드가 없는 경우
            if (processingSlides.length === 0) {
                generateButton.innerHTML = '<i class="fas fa-check"></i> 이미 완료됨';
                setTimeout(() => {
                    generateButton.innerHTML = originalText;
                    generateButton.disabled = false;
                }, 2000);

                this.addLogEntry('생성할 새 오디오가 없습니다.', 'info');
                return;
            }

            // 병렬 처리 상태 표시
            generateButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 슬라이드 ${processingSlides.length}개 처리 중...`;

            // 병렬로 처리하되 동시 처리 개수 제한 (서버 부하 방지)
            const chunkSize = 3; // 한 번에 처리할 슬라이드 수
            let completedCount = 0;

            for (let i = 0; i < processingSlides.length; i += chunkSize) {
                const chunk = processingSlides.slice(i, i + chunkSize);
                const chunkPromises = chunk.map(({ slideNumber, slideElement }) => {
                    this.addLogEntry(`슬라이드 ${slideNumber} 음성 생성 중...`, 'info');

                    // 슬라이드 오디오 생성 함수 호출
                    return this.generateSlideAudio(slideNumber, slideElement)
                        .then(() => {
                            completedCount++;
                            this.addLogEntry(`슬라이드 ${slideNumber} 음성 생성 완료 (${completedCount}/${processingSlides.length})`, 'success');

                            // 진행 상황 업데이트
                            generateButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${completedCount}/${processingSlides.length} 완료...`;
                        })
                        .catch(err => {
                            this.addLogEntry(`슬라이드 ${slideNumber} 음성 생성 실패: ${err.message}`, 'error');
                            return Promise.reject(err); // 에러 전파
                        });
                });

                try {
                    // 각 청크를 병렬로 처리
                    await Promise.all(chunkPromises);
                } catch (error) {
                    this.addLogEntry(`일부 슬라이드 처리 중 오류 발생: ${error.message}`, 'error');
                    // 오류가 있어도 계속 진행
                }
            }

            // 완료 후 버튼 상태 복원
            generateButton.innerHTML = '<i class="fas fa-check"></i> 완료';
            setTimeout(() => {
                generateButton.innerHTML = originalText;
                generateButton.disabled = false;
            }, 3000);

            this.addLogEntry('전체 슬라이드 음성 생성 완료', 'success');
            //this.updateButtonStates(); // 버튼 상태 업데이트

            // 모든 슬라이드에 오디오가 있는지 확인
            let allAudioGenerated = true;
            for (let i = 0; i < slideItems.length; i++) {
                const slideElement = slideItems[i];
                const audioContainer = slideElement.querySelector('.audio-container');
                const audioPlayer = audioContainer?.querySelector('.audio-player');

                if (!audioPlayer) {
                    allAudioGenerated = false;
                    break;
                }
            }

            // 모든 슬라이드에 오디오가 있으면 자동으로 병합까지 수행
            if (allAudioGenerated) {
                this.addLogEntry('모든 슬라이드 음성이 준비되었습니다. 음성 병합을 시작합니다...', 'info');
                await this.handleAudioMerge();
            } else {
                this.addLogEntry('일부 슬라이드의 음성이 생성되지 않았습니다. 모든 슬라이드 음성이 생성되면 음성 병합을 진행해주세요.', 'warning');
            }

        } catch (error) {
            // 오류 발생 시 버튼 상태 복원
            const generateButton = document.querySelector('.generate-all-audio-button');
            if (generateButton) {
                generateButton.innerHTML = '<i class="fas fa-volume-up"></i> 음성 전체 생성';
                generateButton.disabled = false;
            }

            alert('음성 전체 생성 중 오류가 발생했습니다: ' + error.message);
            this.addLogEntry(`음성 전체 생성 오류: ${error.message}`, 'error');
        }
    }

    async checkExistingAudioFiles(slideCount) {
        try {
            // API로 기존 오디오 파일 확인
            const response = await fetch(`/recmaker-api/check-audio-files?sessionId=${this.sessionId}&slideCount=${slideCount}`);

            if (!response.ok) {
                throw new Error('오디오 파일 확인 실패');
            }

            const data = await response.json();

            if (data.status === 'success') {
                // 오디오가 있는 슬라이드 처리
                for (const slideNumber of data.existingAudios) {
                    this.updateSlideWithExistingAudio(slideNumber);
                }

                // 최종 오디오 파일이 있으면 표시
                if (data.hasFinalAudio) {
                    //this.showFinalAudio();
                }

                if (data.existingAudios.length > 0) {
                    this.addLogEntry(`기존 오디오 파일 ${data.existingAudios.length}개를 로드했습니다.`, 'success');
                }
            }
        } catch (error) {
            console.error('오디오 파일 확인 중 오류:', error);
            this.addLogEntry(`오디오 파일 확인 중 오류: ${error.message}`, 'error');
        }
       // this.updateButtonStates();
    }

    showFinalAudio() {
        // 병합된 오디오 플레이어 생성
        const mergedAudioContainer = document.createElement('div');
        mergedAudioContainer.className = 'merged-audio-container fade-in';

        // 오디오 경로 설정
        const audioSrc = this.sessionId
            ? `/audio/${this.sessionId}/final_lecture_audio.mp3`
            : `/audio/final_lecture_audio.mp3`;

        mergedAudioContainer.innerHTML = `
            <h3><i class="fas fa-headphones"></i> 전체 강의 음성</h3>
            <audio controls>
                <source src="${audioSrc}" type="audio/mpeg">
                브라우저가 오디오 재생을 지원하지 않습니다.
            </audio>
            <div class="mt-2 text-right">
                <a href="${audioSrc}" download="강의_음성.mp3" class="text-primary hover:underline">
                    <i class="fas fa-download"></i> 다운로드
                </a>
            </div>
        `;

        // 기존 병합 오디오가 있다면 제거
        const existingMergedAudio = document.querySelector('.merged-audio-container');
        if (existingMergedAudio) {
            existingMergedAudio.remove();
        }

        // 슬라이드 컨테이너 이전에 추가
        this.resultsSection.insertBefore(mergedAudioContainer, this.slidesContainer);

        console.log('최종 오디오 파일을 표시했습니다.');
       // this.updateButtonStates();
    }

    updateSlideWithExistingAudio(slideNumber) {
        // 해당 슬라이드 요소 찾기
        const slideItems = document.querySelectorAll('.slide-item');

        if (!slideItems || slideItems.length < slideNumber) {
            console.warn(`슬라이드 ${slideNumber} 요소를 찾을 수 없습니다.`);
            return;
        }

        const slideElement = slideItems[slideNumber - 1];

        if (!slideElement) {
            return;
        }

        // 버튼과 오디오 컨테이너 찾기
        const button = slideElement.querySelector('.generate-audio-button');
        const audioContainer = slideElement.querySelector('.audio-container');

        if (!button || !audioContainer) {
            return;
        }

        // 오디오 경로 설정
        const audioSrc = this.sessionId
            ? `/audio/${this.sessionId}/slide_${slideNumber}.mp3`
            : `/audio/slide_${slideNumber}.mp3`;

        // 오디오 플레이어 생성
        const audioElement = document.createElement('div');
        audioElement.className = 'audio-player';
        audioElement.innerHTML = `
            <audio controls>
                <source src="${audioSrc}" type="audio/mpeg">
                브라우저가 오디오 재생을 지원하지 않습니다.
            </audio>
            <span class="audio-label">슬라이드 ${slideNumber} 음성</span>
        `;

        // 기존 오디오 플레이어가 있다면 제거
        const existingPlayer = audioContainer.querySelector('.audio-player');
        if (existingPlayer) {
            existingPlayer.remove();
        }

        // 오디오 컨테이너에 플레이어 추가
        audioContainer.appendChild(audioElement);
        audioContainer.style.display = 'block';

        // 버튼 텍스트를 '재생성'으로 변경
        button.innerHTML = '<i class="fas fa-sync-alt"></i> 음성 재생성';
        button.classList.add('completed');

        console.log(`슬라이드 ${slideNumber}의 기존 오디오를 표시했습니다.`);
    }
    async generateSlideVideo(slideNumber, slideElement) {
        const button = slideElement.querySelector('.generate-video-button');
        const status = slideElement.querySelector('.video-status');
        const videoContainer = slideElement.querySelector('.video-container');

        if (!button || !status || !videoContainer) {
            return;
        }

        try {
            button.style.display = 'none';
            status.style.display = 'flex';
            status.querySelector('span').textContent = '비디오 생성 중...';

            let url = `/recmaker-api/generate-slide-video/${slideNumber}`;

            // 세션 ID가 있으면 URL에 추가
            if (this.sessionId) {
                url += `?sessionId=${this.sessionId}`;
            }

            const response = await fetch(url, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('비디오 생성 실패');
            }

            const data = await response.json();

            // 비디오 소스 경로 설정
            const videoSrc = this.sessionId
                ? `/videos/${this.sessionId}/slide_${slideNumber}.mp4`
                : `/videos/slide_${slideNumber}.mp4`;

            // 비디오 플레이어 생성
            const videoElement = document.createElement('div');
            videoElement.className = 'video-player';
            videoElement.innerHTML = `
                <video controls class="w-full">
                    <source src="${videoSrc}" type="video/mp4">
                    브라우저가 비디오 재생을 지원하지 않습니다.
                </video>
                <div class="flex justify-between mt-2">
                    <span class="video-label text-sm">슬라이드 ${slideNumber} 비디오</span>
                    <a href="${videoSrc}" download="slide_${slideNumber}.mp4" class="text-blue-600 hover:underline text-sm">
                        <i class="fas fa-download"></i> 다운로드
                    </a>
                </div>
            `;

            // 기존 비디오 플레이어가 있다면 제거
            const existingPlayer = videoContainer.querySelector('.video-player');
            if (existingPlayer) {
                existingPlayer.remove();
            }

            videoContainer.appendChild(videoElement);
            videoContainer.style.display = 'block';

            // 버튼 스타일 변경
            button.innerHTML = '<i class="fas fa-sync-alt"></i> 영상 재생성';
            button.classList.add('completed');

            this.addLogEntry(`슬라이드 ${slideNumber} 비디오 생성 완료`, 'success');

        } catch (error) {
            button.innerHTML = '<i class="fas fa-exclamation-circle"></i> 재시도';
            alert('비디오 생성 중 오류가 발생했습니다: ' + error.message);
            this.addLogEntry(`비디오 생성 중 오류: ${error.message}`, 'error');
        } finally {
            button.style.display = 'block';
            status.style.display = 'none';
        }
    }
    async handleFullVideoGeneration() {
        try {
            const generateButton = document.querySelector('.generate-full-video-button');
            if (!generateButton) return;

            const originalText = generateButton.innerHTML;
            generateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 비디오 생성 중...';
            generateButton.disabled = true;

            let url = '/recmaker-api/generate-full-video';

            // 세션 ID가 있으면 URL에 추가
            if (this.sessionId) {
                url += `?sessionId=${this.sessionId}`;
            }

            this.addLogEntry('전체 강의 비디오 생성 시작...', 'info');

            const response = await fetch(url, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('전체 비디오 생성 실패');
            }

            const data = await response.json();

            // 비디오 플레이어 생성 및 표시
            this.showFullVideo();

            generateButton.innerHTML = '<i class="fas fa-check"></i> 완료';
            setTimeout(() => {
                generateButton.innerHTML = originalText;
                generateButton.disabled = false;
            }, 3000);

            this.addLogEntry('전체 강의 비디오 생성 완료', 'success');

        } catch (error) {
            const generateButton = document.querySelector('.generate-full-video-button');
            if (generateButton) {
                generateButton.innerHTML = '<i class="fas fa-video"></i> 전체 강의 비디오 생성';
                generateButton.disabled = false;
            }

            alert('전체 강의 비디오 생성 중 오류가 발생했습니다: ' + error.message);
            this.addLogEntry(`전체 비디오 생성 오류: ${error.message}`, 'error');
        }
    }

    // 비디오 다운로드 처리
    async handleVideoZipDownload() {
        try {
            const downloadButton = document.querySelector('.download-video-button');
            if (!downloadButton) return;

            const originalText = downloadButton.innerHTML;
            downloadButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 준비 중...';
            downloadButton.disabled = true;

            // ZIP 다운로드 URL 생성
            let zipUrl = '/recmaker-api/download-video-zip';
            if (this.sessionId) {
                zipUrl += `?sessionId=${this.sessionId}`;
            }

            this.addLogEntry('비디오 ZIP 다운로드 시작...', 'info');

            // 새 탭에서 직접 다운로드 시작
            window.location.href = zipUrl;

            // 다운로드 시작 후 버튼 상태 복원
            setTimeout(() => {
                downloadButton.innerHTML = originalText;
                downloadButton.disabled = false;

                this.addLogEntry('비디오 ZIP 다운로드가 시작되었습니다.', 'success');
            }, 2000);

        } catch (error) {
            const downloadButton = document.querySelector('.download-video-button');
            if (downloadButton) {
                downloadButton.innerHTML = '<i class="fas fa-download"></i> 비디오 다운로드';
                downloadButton.disabled = false;
            }

            alert('비디오 다운로드 준비 중 오류가 발생했습니다: ' + error.message);
            this.addLogEntry(`비디오 다운로드 오류: ${error.message}`, 'error');
        }
    }

    // 전체 비디오 표시
    showFullVideo() {
        // 전체 비디오 컨테이너 생성
        const fullVideoContainer = document.createElement('div');
        fullVideoContainer.className = 'full-video-container fade-in';

        // 비디오 경로 설정
        const videoSrc = this.sessionId
            ? `/videos/${this.sessionId}/final_lecture_video.mp4`
            : `/videos/final_lecture_video.mp4`;

        // 자막 경로 설정
        const subtitlesSrt = this.sessionId
            ? `/subtitles/${this.sessionId}/final_lecture_subtitle.srt`
            : `/subtitles/final_lecture_subtitle.srt`;

        const subtitlesVtt = this.sessionId
            ? `/subtitles/${this.sessionId}/final_lecture_subtitle.vtt`
            : `/subtitles/final_lecture_subtitle.vtt`;

        // 자막 파일 존재 여부 확인 (간단한 방식)
        let hasSrt = false;
        let hasVtt = false;

        try {
            const subtitleCheckResponse = fetch(subtitlesVtt, { method: 'HEAD' });
            hasVtt = true;
        } catch (e) {
            hasVtt = false;
        }

        try {
            const subtitleCheckResponse = fetch(subtitlesSrt, { method: 'HEAD' });
            hasSrt = true;
        } catch (e) {
            hasSrt = false;
        }

        fullVideoContainer.innerHTML = `
            <h3 class="text-xl font-bold mb-3"><i class="fas fa-film text-blue-600"></i> 전체 강의 비디오</h3>
            <div class="video-wrapper bg-black rounded-lg overflow-hidden">
                <video controls class="w-full" ${hasVtt ? 'crossorigin="anonymous"' : ''}>
                    <source src="${videoSrc}" type="video/mp4">
                    ${hasVtt ? `<track kind="subtitles" label="한국어" src="${subtitlesVtt}" srclang="ko" default>` : ''}
                    브라우저가 비디오 재생을 지원하지 않습니다.
                </video>
            </div>
            <div class="mt-3 flex justify-between items-center">
                <a href="${videoSrc}" download="강의_비디오.mp4" class="text-blue-600 hover:underline">
                    <i class="fas fa-download"></i> 비디오 다운로드
                </a>
                <div class="subtitles-download">
                    ${hasSrt ? `<a href="${subtitlesSrt}" download="강의_자막.srt" class="text-blue-600 hover:underline ml-3">
                        <i class="fas fa-closed-captioning"></i> SRT 다운로드
                    </a>` : ''}
                    ${hasVtt ? `<a href="${subtitlesVtt}" download="강의_자막.vtt" class="text-green-600 hover:underline ml-3">
                        <i class="fas fa-closed-captioning"></i> VTT 다운로드
                    </a>` : ''}
                </div>
            </div>
        `;

        // 기존 전체 비디오가 있다면 제거
        const existingVideo = document.querySelector('.full-video-container');
        if (existingVideo) {
            existingVideo.remove();
        }

        // 병합된 오디오 컨테이너 다음에 삽입
        const mergedAudioContainer = document.querySelector('.merged-audio-container');
        if (mergedAudioContainer) {
            mergedAudioContainer.after(fullVideoContainer);
        } else {
            // 없으면 슬라이드 컨테이너 이전에 추가
            this.resultsSection.insertBefore(fullVideoContainer, this.slidesContainer);
        }

        console.log('전체 비디오 표시됨');
       // this.updateButtonStates();
    }

    // 개별 슬라이드 비디오 생성 시 진척상황 확인
    async checkExistingVideoFiles(slideCount) {
        try {
            // API로 기존 비디오 파일 확인
            const response = await fetch(`/recmaker-api/check-video-files?sessionId=${this.sessionId}&slideCount=${slideCount}`);

            if (!response.ok) {
                throw new Error('비디오 파일 확인 실패');
            }

            const data = await response.json();

            if (data.status === 'success') {
                // 비디오가 있는 슬라이드 처리
                for (const slideNumber of data.existingVideos) {
                    this.updateSlideWithExistingVideo(slideNumber);
                }

                // 최종 비디오 파일이 있으면 표시
                if (data.hasFinalVideo) {
                    this.showFullVideo();
                }

                if (data.existingVideos.length > 0) {
                    this.addLogEntry(`기존 비디오 파일 ${data.existingVideos.length}개를 로드했습니다.`, 'success');
                }
            }
        } catch (error) {
            console.error('비디오 파일 확인 중 오류:', error);
            this.addLogEntry(`비디오 파일 확인 중 오류: ${error.message}`, 'error');
        }
       // this.updateButtonStates();
    }

    // 개별 슬라이드의 기존 비디오 표시
    updateSlideWithExistingVideo(slideNumber) {
        // 해당 슬라이드 요소 찾기
        const slideItems = document.querySelectorAll('.slide-item');

        if (!slideItems || slideItems.length < slideNumber) {
            console.warn(`슬라이드 ${slideNumber} 요소를 찾을 수 없습니다.`);
            return;
        }

        const slideElement = slideItems[slideNumber - 1];

        if (!slideElement) {
            return;
        }

        // 버튼과 비디오 컨테이너 찾기
        const button = slideElement.querySelector('.generate-video-button');
        const videoContainer = slideElement.querySelector('.video-container');

        if (!button || !videoContainer) {
            return;
        }

        // 비디오 경로 설정
        const videoSrc = this.sessionId
            ? `/videos/${this.sessionId}/slide_${slideNumber}.mp4`
            : `/videos/slide_${slideNumber}.mp4`;

        // 비디오 플레이어 생성
        const videoElement = document.createElement('div');
        videoElement.className = 'video-player';
        videoElement.innerHTML = `
            <video controls class="w-full">
                <source src="${videoSrc}" type="video/mp4">
                브라우저가 비디오 재생을 지원하지 않습니다.
            </video>
            <div class="flex justify-between mt-2">
                <span class="video-label text-sm">슬라이드 ${slideNumber} 비디오</span>
                <a href="${videoSrc}" download="slide_${slideNumber}.mp4" class="text-blue-600 hover:underline text-sm">
                    <i class="fas fa-download"></i> 다운로드
                </a>
            </div>
        `;

        // 기존 비디오 플레이어가 있다면 제거
        const existingPlayer = videoContainer.querySelector('.video-player');
        if (existingPlayer) {
            existingPlayer.remove();
        }

        // 비디오 컨테이너에 플레이어 추가
        videoContainer.appendChild(videoElement);
        videoContainer.style.display = 'block';

        // 버튼 텍스트를 '재생성'으로 변경
        button.innerHTML = '<i class="fas fa-sync-alt"></i>영상 재생성';
        button.classList.add('completed');

        console.log(`슬라이드 ${slideNumber}의 기존 비디오를 표시했습니다.`);
    }


    // 세션 링크 복사
    copySessionLink() {
        if (this.sessionId) {
            const url = `${window.location.origin}/${this.sessionId}`;
            navigator.clipboard.writeText(url)
                .then(() => {
                    alert('세션 링크가 클립보드에 복사되었습니다.');
                })
                .catch(err => {
                    console.error('클립보드 복사 실패:', err);
                    alert('클립보드 복사에 실패했습니다. 수동으로 URL을 복사해주세요.');
                });
        }
    }

    // 영구 URL 복사
    copyPermanentUrl() {
        if (this.sessionId && this.copySuccessMsg) {
            const url = `${window.location.origin}/${this.sessionId}`;
            navigator.clipboard.writeText(url)
                .then(() => {
                    this.copySuccessMsg.classList.remove('hidden');
                    setTimeout(() => {
                        this.copySuccessMsg.classList.add('hidden');
                    }, 3000);
                })
                .catch(err => {
                    console.error('클립보드 복사 실패:', err);
                    alert('클립보드 복사에 실패했습니다. 수동으로 URL을 복사해주세요.');
                });
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dropZone.classList.add('drop-zone--over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dropZone.classList.remove('drop-zone--over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        this.dropZone.classList.remove('drop-zone--over');
        
        const files = e.dataTransfer.files;
        if (files.length) {
            this.handleFile(files[0]);
        }
    }
    handleFile(file) {
        if (file) {
            const fileExt = file.name.split('.').pop().toLowerCase();
            
            // PPT 파일 처리
            if (['ppt', 'pptx'].includes(fileExt)) {
                console.log('PPT 파일 처리:', file.name);
                this.processFile(file);
            } 
            // 마크다운 파일 처리
            else if (fileExt === 'md') {
                console.log('마크다운 파일 처리:', file.name);
                this.processScriptFile(file);
            } else {
                alert('지원하지 않는 파일 형식입니다. PPT나 마크다운 파일만 업로드 가능합니다.');
            }
        }
    }
    
    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length) {
            this.handleFile(files[0]);
        }
    }

    updateProgress(step, stepName, percentage, currentItem = 0, totalItems = 0) {
        const progressStep = document.getElementById('progress-step');
        const progressPercentage = document.getElementById('progress-percentage');
        const progressBar = document.getElementById('progress-bar');
        const itemProgressBar = document.getElementById('item-progress-bar');
        const itemProgressCount = document.getElementById('item-progress-count');
        const itemProgressLabel = document.getElementById('item-progress-label');
        
        // 진행 정보 저장
        window.generationProgress = {
            currentStep: step,
            totalSteps: 4,
            currentItemCount: currentItem,
            totalItemCount: totalItems
        };
        
        // 메인 프로그레스 업데이트
        if (progressStep) progressStep.textContent = `${step}/4: ${stepName}`;
        if (progressPercentage) progressPercentage.textContent = `${percentage}%`;
        if (progressBar) progressBar.style.width = `${percentage}%`;
        
        // 단계별 색상 변경
        if (progressBar) {
            progressBar.className = 'h-3 rounded-full transition-all';
            
            switch(step) {
                case 1: // 음성 생성
                    progressBar.classList.add('step-audio');
                    break;
                case 2: // 비디오 생성
                    progressBar.classList.add('step-video');
                    break;
                case 3: // 영상 합치기
                    progressBar.classList.add('step-merge');
                    break;
                case 4: // ZIP 다운로드
                    progressBar.classList.add('step-zip');
                    break;
            }
        }
        
        // 아이템별 진행상태 업데이트
        if (totalItems > 0) {
            if (itemProgressLabel) {
                switch(step) {
                    case 1:
                        itemProgressLabel.textContent = '슬라이드 음성 생성:';
                        break;
                    case 2:
                        itemProgressLabel.textContent = '슬라이드 영상 생성:';
                        break;
                    case 3:
                        itemProgressLabel.textContent = '영상 합치기:';
                        break;
                    case 4:
                        itemProgressLabel.textContent = '파일 준비:';
                        break;
                }
            }
            
            if (itemProgressCount) itemProgressCount.textContent = `${currentItem}/${totalItems} 완료`;
            if (itemProgressBar) {
                const itemPercentage = totalItems > 0 ? (currentItem / totalItems) * 100 : 0;
                itemProgressBar.style.width = `${itemPercentage}%`;
                
                // 아이템 프로그레스 바 색상도 단계별로 변경
                itemProgressBar.className = 'h-2 rounded-full transition-all';
                switch(step) {
                    case 1:
                        itemProgressBar.classList.add('step-audio');
                        break;
                    case 2:
                        itemProgressBar.classList.add('step-video');
                        break;
                    case 3:
                        itemProgressBar.classList.add('step-merge');
                        break;
                    case 4:
                        itemProgressBar.classList.add('step-zip');
                        break;
                }
            }
        } else {
            // 아이템이 없는 경우 숨김 처리
            if (itemProgressCount) itemProgressCount.textContent = '';
            if (itemProgressBar) itemProgressBar.style.width = '0%';
        }
        
        // 상세 로그가 있으면 자동 스크롤
        const progressDetails = document.getElementById('progress-details');
        if (progressDetails) {
            progressDetails.scrollTop = progressDetails.scrollHeight;
        }
    }
    
    
    updateStepVisually(activeStep) {
        const stepBubbles = document.querySelectorAll('.step-bubble');
        const stepNumbers = document.querySelectorAll('.step-number');
        
        console.log(`단계 시각화 업데이트: ${activeStep}`); // 디버그 로그 추가
        
        stepBubbles.forEach((bubble, index) => {
            if (index < activeStep) {
                // 이전 단계는 완료 상태
                bubble.classList.add('completed');
                bubble.classList.remove('active');
            } else if (index === activeStep) {
                // 현재 단계는 활성 상태
                bubble.classList.add('active');
                bubble.classList.remove('completed');
            } else {
                // 이후 단계는 비활성 상태
                bubble.classList.remove('active', 'completed');
            }
        });
        
        // 육각형 상태도 유사하게 업데이트
        stepNumbers.forEach((number, index) => {
            if (index <= activeStep) {
                // 현재 단계와 이전 단계는 파란색 배경
                number.classList.remove('bg-gray-700');
                number.classList.add('bg-blue-500');
            } else {
                // 이후 단계는 회색 배경
                number.classList.remove('bg-blue-500');
                number.classList.add('bg-gray-700');
            }
        });
    }
    
    async processFile(file) {
        if (!file.name.match(/\.(ppt|pptx)$/i)) {
            alert('PPT 파일만 업로드 가능합니다.');
            return;
        }

        const analysisTabs = document.querySelector('.analysis-tabs');
        if (analysisTabs) {
            analysisTabs.classList.add('hidden');
        }
    
        this.showProcessing();

        const formData = new FormData();
        formData.append('file', file);
        formData.append('difficulty', this.difficultySelect.value);
        console.log(this.difficultySelect.value)

        if (this.analysisTypeSelect) {
            formData.append('analysisType', this.analysisTypeSelect.value);
        }
        // 기존 세션 ID가 있으면 포함
        if (this.sessionId) {
            formData.append('sessionId', this.sessionId);
        }

        try {
            // 파일 처리 요청 시작
            const response = await fetch('/recmaker-api/analyze-ppt', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('서버 오류가 발생했습니다.');
            }

            const data = await response.json();

            // 서버에서 반환한 세션 ID와 작업 ID 저장
            if (data.sessionId) {
                this.sessionId = data.sessionId;
                //console.log('서버 세션 ID 수신:', this.sessionId);

                // 작업 ID도 세션 ID로 설정 (서버에서 같게 처리함)
                this.processingJobId = this.sessionId;
                //console.log('작업 ID 설정:', this.processingJobId);

                // URL 업데이트 (히스토리에 새 항목 추가하지 않고 현재 URL 변경)
                window.history.replaceState({}, '', `/recmaker/${this.sessionId}`);

                // 세션 ID 표시 업데이트
                //this.updateSessionDisplay();

                // 로그에 정보 추가
                this.addLogEntry(`세션 ID 생성됨: ${this.sessionId}`, 'success');
                this.addLogEntry(`작업 ID 설정: ${this.processingJobId}`, 'info');
                this.addLogEntry(`결과는 ${window.location.origin}/${this.sessionId}에서 항상 접근 가능합니다.`, 'success');

                // 폴링 재시작 (서버 ID로 상태 확인)
                this.stopProgressPolling();
                this.startProgressPolling();
            }

            // 슬라이드 이미지 가져오기
            this.fetchSlideImages(data.slides.length);

            // 결과 표시
            this.displayResults(data);
        } catch (error) {
            console.error('Error:', error);
            alert('파일 처리 중 오류가 발생했습니다: ' + error.message);
            this.hideProcessing();
            this.stopProgressPolling();
        }
    }


    async fetchSlideImages(slideCount) {
        // 슬라이드 이미지를 서버에서 가져오는 함수
        // 세션 ID에 따라 경로 설정
        for (let i = 1; i <= slideCount; i++) {
            try {
                let imagePath;
                // 숫자 i를 두 자리 문자열로 변환 (예: 1 -> "01")
                const slideFileName = `slide-${i.toString().padStart(2, '0')}.png`;

                if (this.sessionId) {
                    // 세션별 경로
                    imagePath = `/recmaker-sessions/${this.sessionId}/extracted_content/${slideFileName}`;
                } else {
                    // 기본 경로 
                    imagePath = `/extracted_content/${slideFileName}`;
                }

                this.slideImages[i] = imagePath;
            } catch (error) {
                console.warn(`슬라이드 ${i} 이미지를 가져올 수 없습니다:`, error);
            }
        }
    }


    showProcessing() {
        this.uploadSection.classList.add('hidden');
        this.processingSection.classList.remove('hidden');
        this.resultsSection.classList.add('hidden');
        
        // 상태 초기화
        this.currentStep = 0;
        this.progressValue = 0;
        this.processingStartTime = Date.now();
        this.lastStatusMessage = null;
        
        // 임시 작업 ID 설정
        this.processingJobId = 'temp-' + Date.now().toString();
    
        // 진행 바 초기화
        if (this.progressBar) {
            this.progressBar.style.width = '5%'; // 시작 시 5%로 표시
        }
    
        // 상태 텍스트 초기화
        if (this.statusText) {
            this.statusText.textContent = '초기화 중...';
        }
    
        // 진행률 텍스트 초기화
        if (this.progressPercentage) {
            this.progressPercentage.textContent = '5% 완료';
        }
    
        // 단계 말풍선 초기화 - 첫 번째 말풍선 활성화
        const stepBubbles = document.querySelectorAll('.step-bubble');
        stepBubbles.forEach((bubble, index) => {
            if (index === 0) {
                // 첫 번째 단계는 활성 상태로 시작
                bubble.classList.add('active');
                bubble.classList.remove('completed');
            } else {
                // 나머지 단계는 비활성 상태
                bubble.classList.remove('active', 'completed');
            }
        });
    
        // 단계 번호(육각형) 초기화
        const stepNumbers = document.querySelectorAll('.step-number');
        stepNumbers.forEach((number, index) => {
            if (index === 0) {
                // 첫 번째 단계는 파란색으로 시작
                number.classList.remove('bg-gray-700');
                number.classList.add('bg-blue-500');
            } else {
                // 나머지 단계는 회색
                number.classList.remove('bg-blue-500');
                number.classList.add('bg-gray-700');
            }
        });
    
        // 폴링 시작
        this.startProgressPolling();
    }

    // index.js 파일의 startProgressPolling 함수 수정 부분

    startProgressPolling() {
        // 이전 폴링 중지
        this.stopProgressPolling();
    
        // 로그 컨테이너 숨김
        const logsContainer = document.querySelector('.logs-container');
        if (logsContainer) {
            logsContainer.classList.add('hidden');
        }
    
        // 로그 초기화
        this.processLogs = document.getElementById('process-logs');
        if (this.processLogs) {
            this.processLogs.textContent = '';
            this.addLogEntry('처리 시작...');
        }
    
        // 폴링 간격 설정
        const pollingInterval = 1000;
    
        this.pollingIntervalId = setInterval(async () => {
            try {
                console.log('폴링 중, 작업 ID:', this.processingJobId);
    
                // API 요청 URL 설정
                let url = `/recmaker-api/process-status?jobId=${this.processingJobId}`;
                if (this.sessionId) {
                    url += `&sessionId=${this.sessionId}`;
                    
                    // 임시 ID를 세션 ID로 업데이트
                    if (this.processingJobId.startsWith('temp-')) {
                        this.processingJobId = this.sessionId;
                        this.addLogEntry(`작업 ID 업데이트: ${this.sessionId}`, 'info');
                    }
                }
    
                // 서버 상태 요청
                const response = await fetch(url);
                if (!response.ok) {
                    console.error('상태 확인 실패:', response.statusText);
                    this.addLogEntry(`상태 확인 실패: ${response.statusText}`, 'error');
                    return;
                }
    
                const statusData = await response.json();
                console.log('서버 응답:', statusData);
    
                // 오류 처리
                if (statusData.status === 'error') {
                    this.stopProgressPolling();
                    this.hideProcessing();
                    this.addLogEntry(`오류 발생: ${statusData.message}`, 'error');
                    alert(`처리 중 오류가 발생했습니다: ${statusData.message}`);
                    return;
                }
    
                // 작업 상태 없음
                if (statusData.status === 'unknown') {
                    this.addLogEntry(`서버에서 작업 상태를 찾을 수 없습니다.`, 'warning');
                    return;
                }
    
                // 진행 상황 업데이트
                if (statusData.stage && statusData.percentage !== undefined) {
                    // 서버의 3단계를 UI의 2단계로 매핑
                    const stageMap = {
                        'extract': 0,
                        'analyze': 0,  // 추출과 분석은 모두 첫 번째 UI 단계 업데이트
                        'generate': 1  // 생성은 두 번째 UI 단계 업데이트
                    };
                    
                    const uiStep = stageMap[statusData.stage] || 0;
                    this.currentStep = uiStep;
                    
                    // 여기서 updateStepVisually 명시적으로 호출
                    this.updateStepVisually(uiStep);
                    
                    // 진행률 백분율과 바 업데이트
                    const percentage = parseInt(statusData.percentage, 10) || 0;
                    this.progressPercentage.textContent = `${percentage}% 완료`;
                    if (this.progressBar) {
                        this.progressBar.style.width = `${percentage}%`;
                    }
                }else{
                    // 백분율이 없을 때 기본값
                    this.progressPercentage.textContent = `0% 완료`;
                }
    
                // 작업 완료 처리
                if (statusData.status === 'completed') {
                    this.addLogEntry('처리 완료!', 'success');
                    this.stopProgressPolling();
                    return;
                }
            } catch (error) {
                console.error('진행 상황 업데이트 오류:', error);
                this.addLogEntry(`진행 상황 업데이트 오류: ${error.message}`, 'error');
            }
        }, pollingInterval);
    }
    
    

    stopProgressPolling() {
        if (this.pollingIntervalId) {
            clearInterval(this.pollingIntervalId);
            this.pollingIntervalId = null;
        }
    }

    hideProcessing() {
        this.processingSection.classList.add('hidden');
        this.stopProgressPolling();
    }

    createSlideElement(slide, index) {
        // 템플릿을 사용하여 슬라이드 요소 생성
        if (!this.slideItemTemplate) {
            return null;
        }

        const slideElement = this.slideItemTemplate.content.cloneNode(true).children[0];
        slideElement.classList.add('slide-zoom', 'fade-in');
        slideElement.style.animationDelay = `${index * 0.1}s`;

        // 슬라이드 번호 설정
        const slideNumber = slideElement.querySelector('.slide-number');
        if (slideNumber) {
            slideNumber.textContent = `슬라이드 ${index + 1}`;
        }

        // 썸네일 이미지 설정
        const thumbnailImg = slideElement.querySelector('.slide-thumbnail');
        if (thumbnailImg && this.slideImages[index + 1]) {
            thumbnailImg.src = this.slideImages[index + 1];
            thumbnailImg.alt = `슬라이드 ${index + 1} 미리보기`;
            thumbnailImg.title = "클릭하여 확대"; // 툴팁 추가
            
            // 이미지 클릭 시 확대 모달 표시
            thumbnailImg.addEventListener('click', () => {
                // 이미지 확대 모달 열기 (initImagePreview에서 추가한 함수 사용)
                if (typeof openImageModal === 'function') {
                    openImageModal(thumbnailImg.src);
                }
            });
        } else {
            // 기본 이미지 또는 플레이스홀더 설정
            thumbnailImg.src = '/recmaker-api/placeholder/320/240';
            thumbnailImg.alt = '미리보기 없음';
        }

        // 분석 내용 설정
        const analysis = slide.analysis.replace(/^슬라이드 \d+ /, '');
        const viewMode = slideElement.querySelector('.view-mode');
        const editMode = slideElement.querySelector('.edit-mode');

        if (viewMode) {
            viewMode.textContent = analysis;
        }

        if (editMode) {
            editMode.value = analysis;
        }

        // 음성 생성 버튼에 데이터 설정
        const audioButton = slideElement.querySelector('.generate-audio-button');
        if (audioButton) {
            audioButton.dataset.slide = index + 1;
            audioButton.addEventListener('click', async (e) => {
                await this.generateSlideAudio(e.target.closest('button').dataset.slide, slideElement);
            });
        }
        // 비디오 버튼
        const headerRight = slideElement.querySelector('.slide-header-right');
        if (headerRight) {
            // 비디오 버튼과 상태 표시기 생성
            const videoButtonHtml = `
                <button class="generate-video-button bg-green-600 text-white px-3 py-1 rounded flex items-center text-sm ml-2" data-slide="${index + 1}">
                    <i class="fas fa-video mr-2"></i> 비디오 생성
                </button>
                <div class="video-status hidden items-center">
                    <div class="spinner"></div>
                    <span class="ml-2">비디오 생성 중...</span>
                </div>
            `;
            headerRight.insertAdjacentHTML('beforeend', videoButtonHtml);

            // 비디오 컨테이너 추가
            const slideContentContainer = slideElement.querySelector('.slide-content-container');
            if (slideContentContainer) {
                const videoContainerHtml = `
                    <div class="video-container hidden p-4 bg-gray-50 border-b border-gray-200">
                        <!-- 비디오 플레이어가 여기에 추가됨 -->
                    </div>
                `;
                const regenerateButtonHtml = `
                <button class="regenerate-slide-button bg-purple-600 text-white px-3 py-1 rounded flex items-center text-sm mr-2" data-slide="${index + 1}">
                    <i class="fas fa-sync-alt mr-2"></i> 슬라이드 재생성
                </button>
               
            `;
                headerRight.insertAdjacentHTML('afterbegin', regenerateButtonHtml);
                const regenerateButton = slideElement.querySelector('.regenerate-slide-button');
                if (regenerateButton) {
                    regenerateButton.addEventListener('click', () => {
                        this.showRegenerateModal(index + 1);
                    });
                }
                // 오디오 컨테이너 뒤에 삽입
                const audioContainer = slideElement.querySelector('.audio-container');
                if (audioContainer) {
                    audioContainer.insertAdjacentHTML('afterend', videoContainerHtml);
                } else {
                    slideContentContainer.insertAdjacentHTML('afterbegin', videoContainerHtml);
                }
            }

            // 비디오 버튼 이벤트 리스너 추가
            const videoButton = slideElement.querySelector('.generate-video-button');
            if (videoButton) {
                videoButton.addEventListener('click', async (e) => {
                    await this.generateSlideVideo(e.target.closest('button').dataset.slide, slideElement);
                });
            }
        }

        return slideElement;
    }

    displayResults(data) {
        this.hideProcessing();
        this.resultsSection.classList.remove('hidden');
        this.slidesContainer.innerHTML = '';
    
        // 1. 기존 플로팅 버튼 제거
        const existingButtons = document.querySelector('.floating-buttons');
        if (existingButtons) {
            existingButtons.remove();
        }
    
        // 2. 플로팅 버튼 생성 및 body에 직접 추가
        const floatingButtons = document.createElement('div');
        floatingButtons.className = 'floating-buttons';
    
        const editButton = document.createElement('button');
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        editButton.title = '스크립트 편집';
        editButton.className = 'floating-button edit-button';
    
        const saveButton = document.createElement('button');
        saveButton.innerHTML = '<i class="fas fa-save"></i>';
        saveButton.title = '변경사항 저장';
        saveButton.className = 'floating-button save-button';
        saveButton.style.display = 'none';
    
        floatingButtons.appendChild(editButton);
        floatingButtons.appendChild(saveButton);
        document.body.appendChild(floatingButtons);
    
        // 3. 이벤트 리스너 추가
        editButton.addEventListener('click', () => this.toggleEditMode());
        saveButton.addEventListener('click', () => this.saveChanges());
    
        // 4. 병합된 오디오 컨테이너 초기화
        const existingMergedAudio = document.querySelector('.merged-audio-container');
        if (existingMergedAudio) {
            existingMergedAudio.remove();
        }
    
        // 5. 전체 비디오 컨테이너 초기화
        const existingFullVideo = document.querySelector('.full-video-container');
        if (existingFullVideo) {
            existingFullVideo.remove();
        }
    
        // 6. 결과 헤더에 버튼 배치 - 스크립트 저장과 콘텐츠 생성 및 다운로드 버튼만 표시
        const resultsHeader = document.querySelector('.results-header');
        if (resultsHeader) {
            // 기존 내용 지우기
            resultsHeader.innerHTML = '';
            
            // 헤더에 두 개의 버튼 추가 (스크립트 저장 + 콘텐츠 생성 및 다운로드)
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'flex gap-4';
            
            // 스크립트 저장 버튼
            const downloadScriptBtn = document.createElement('button');
            downloadScriptBtn.id = 'download-script-btn';
            downloadScriptBtn.className = 'bg-pink-200 hover:bg-pink-300 text-gray-800 px-4 py-2 rounded-md flex items-center transition-all';
            downloadScriptBtn.innerHTML = '<i class="fas fa-download mr-2"></i> 스크립트 저장';
            downloadScriptBtn.addEventListener('click', this.handleScriptDownload.bind(this));
            
            // 콘텐츠 생성 및 다운로드 버튼
            const unifiedBtn = document.createElement('button');
            unifiedBtn.id = 'unified-content-generation-btn';
            unifiedBtn.className = 'bg-pink-200 hover:bg-pink-300 text-gray-800 px-4 py-2 rounded-md flex items-center transition-all';
            unifiedBtn.innerHTML = '<i class="fas fa-magic mr-2"></i> 콘텐츠 생성 및 다운로드';
            unifiedBtn.addEventListener('click', this.startUnifiedContentGeneration.bind(this));
            
            buttonContainer.appendChild(downloadScriptBtn);
            buttonContainer.appendChild(unifiedBtn);
            resultsHeader.appendChild(buttonContainer);
            
            // 다른 버튼들은 숨겨진 상태로 추가 (API 호출을 위해 필요)
            // 이 버튼들은 보이지 않지만 내부 동작을 위해 필요함
            const hiddenButtons = `
                <div class="hidden">
                    <button class="merge-audio-button"></button>
                    <button class="generate-all-audio-button"></button>
                    <button class="generate-all-videos-button"></button>
                    <button class="generate-full-video-button"></button>
                    <button class="download-video-button"></button>
                </div>
            `;
            resultsHeader.insertAdjacentHTML('beforeend', hiddenButtons);
            
            // 필요한 버튼 이벤트 연결
            const mergeAudioBtn = resultsHeader.querySelector('.merge-audio-button');
            if (mergeAudioBtn) {
                mergeAudioBtn.addEventListener('click', this.handleAudioMerge.bind(this));
            }
    
            const generateAllAudioBtn = resultsHeader.querySelector('.generate-all-audio-button');
            if (generateAllAudioBtn) {
                generateAllAudioBtn.addEventListener('click', this.handleGenerateAllAudio.bind(this));
            }
    
            const generateAllVideosBtn = resultsHeader.querySelector('.generate-all-videos-button');
            if (generateAllVideosBtn) {
                generateAllVideosBtn.addEventListener('click', this.handleGenerateAllVideos.bind(this));
            }
    
            const generateFullVideoBtn = resultsHeader.querySelector('.generate-full-video-button');
            if (generateFullVideoBtn) {
                generateFullVideoBtn.addEventListener('click', this.handleFullVideoGeneration.bind(this));
            }
    
            const downloadVideoBtn = resultsHeader.querySelector('.download-video-button');
            if (downloadVideoBtn) {
                downloadVideoBtn.addEventListener('click', this.handleVideoZipDownload.bind(this));
            }
        }
    
        // 8. 슬라이드 내용 표시
        data.slides.forEach((slide, index) => {
            const slideElement = this.createSlideElement(slide, index);
            if (slideElement) {
                this.slidesContainer.appendChild(slideElement);
            }
        });
        
        // 9. 결과 섹션으로 스크롤
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
    
        // 10. 세션이 있으면 기존 비디오 확인
        if (this.sessionId) {
            this.checkExistingVideoFiles(data.slides.length);
        }
    
        // 11. styles.css에 추가할 스타일을 동적으로 적용
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            /* 공통 액션 버튼 스타일 */
            .action-button {
                display: flex;
                justify-content: center;
                align-items: center;
                color: white;
                font-weight: 500;
                padding: 0.75rem 1rem;
                border-radius: 0.5rem;
                transition: all 0.2s;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                border: none;
                cursor: pointer;
                min-width: 150px;
            }
            
            .action-button:hover {
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
                transform: translateY(-2px);
            }
            
            .action-button:active {
                transform: translateY(0);
            }
            
            .action-button i {
                font-size: 1.125rem;
                margin-right: 0.5rem;
            }
            
            @media (max-width: 768px) {
                .action-button {
                    padding: 0.5rem 0.75rem;
                    font-size: 0.875rem;
                }
            }
        `;
        document.head.appendChild(styleElement);
        
        // 12. 슬라이드 재생성 버튼만 표시하도록 설정
        const slideItems = document.querySelectorAll('.slide-item');
        slideItems.forEach(slideItem => {
            // 오디오 및 비디오 생성 버튼 숨기기
            const audioButton = slideItem.querySelector('.generate-audio-button');
            const videoButton = slideItem.querySelector('.generate-video-button');
            
            if (audioButton) audioButton.style.display = 'none';
            if (videoButton) videoButton.style.display = 'none';
            
            // 재생성 버튼만 표시
            const regenerateButton = slideItem.querySelector('.regenerate-slide-button');
            if (regenerateButton) {
                regenerateButton.classList.add('bg-pink-500', 'hover:bg-pink-600');
                regenerateButton.style.display = 'flex';
            }
        });
        
        // 13. 진행 모달 생성
        this.createProgressModal();
    }
    

    getTransitionPhrase(slideNumber, totalSlides) {
        if (slideNumber === 1) {
            return "이번 강의에서는";
        } else if (slideNumber === totalSlides) {
            return "마지막으로,";
        } else if (slideNumber === 2) {
            return "다음으로,";
        } else if (slideNumber === totalSlides - 1) {
            return "이어서";
        } else {
            const transitions = [
                "그리고",
                "이어지는 내용으로",
                "다음 주제로는",
                "여기서는",
                "이번에는",
                "계속해서"
            ];
            return transitions[(slideNumber - 1) % transitions.length];
        }
    }
    // PPTAnalyzer 클래스 내에 추가
    showRegenerateModal(slideNumber) {
        // 기존 모달 제거
        const existingModal = document.querySelector('.regenerate-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // 모달 템플릿 복제
        const modalTemplate = document.getElementById('regenerate-modal-template');
        const modal = modalTemplate.content.cloneNode(true).children[0];
        modal.classList.add('regenerate-modal');

        // 슬라이드 번호 저장
        modal.dataset.slideNumber = slideNumber;

        // 이벤트 리스너 추가
        const cancelBtn = modal.querySelector('.cancel-btn');
        const confirmBtn = modal.querySelector('.confirm-btn');

        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });

        confirmBtn.addEventListener('click', () => {
            // 선택된 방향 가져오기
            const direction = modal.querySelector('input[name="direction"]:checked').value;

            // 추가 지시사항 가져오기
            const additionalText = modal.querySelector('#regenerate-instructions').value;

            // 재생성 수행
            this.regenerateSlide(slideNumber, { direction, additionalText });

            // 모달 닫기
            modal.remove();
        });

        // 모달 표시
        document.body.appendChild(modal);
    }

    async regenerateSlide(slideNumber, options = {}) {
        try {
            // 해당 슬라이드 요소와 버튼 찾기
            const slideItems = document.querySelectorAll('.slide-item');
            const slideElement = slideItems[slideNumber - 1];
            const regenerateButton = slideElement.querySelector('.regenerate-slide-button');

            // 원래 버튼 내용 저장
            const originalButtonContent = regenerateButton.innerHTML;

            // 버튼 상태 변경 - 숨기는 대신 텍스트와 아이콘 변경
            regenerateButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> <span>재생성 중...</span>';
            regenerateButton.disabled = true;

            // API 요청 URL 생성
            let url = '/recmaker-api/regenerate-slide';
            if (this.sessionId) {
                url += `?sessionId=${this.sessionId}`;
            }

            // 현재 스크립트 데이터 가져오기
            const scriptResponse = await fetch(`/recmaker-api/get-script?sessionId=${this.sessionId}`);
            if (!scriptResponse.ok) {
                throw new Error('스크립트 데이터를 가져올 수 없습니다');
            }

            const scriptData = await scriptResponse.json();
            if (!scriptData.script || !scriptData.script.slideAnalysis) {
                throw new Error('유효하지 않은 스크립트 데이터');
            }

            // 재생성 요청 객체 준비
            const requestData = {
                fullScript: scriptData.script,
                slideNumber: parseInt(slideNumber),
                direction: options.direction || 'normal',
                additionalText: options.additionalText || ""
            };

            this.addLogEntry(`슬라이드 ${slideNumber} 재생성 요청 시작 (방향: ${options.direction})`, 'info');

            // API 호출
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error('슬라이드 재생성 실패');
            }

            const data = await response.json();

            if (data.status === 'success') {
                // 슬라이드 내용 업데이트
                const updatedAnalysis = data.updatedScript.slideAnalysis[slideNumber - 1].analysis;

                // 뷰모드와 편집모드 모두 업데이트
                const viewMode = slideElement.querySelector('.view-mode');
                const editMode = slideElement.querySelector('.edit-mode');

                if (viewMode) viewMode.textContent = updatedAnalysis;
                if (editMode) editMode.value = updatedAnalysis;

                // 오디오/비디오 상태 초기화
                this.resetSlideMediaState(slideNumber);

                this.addLogEntry(`슬라이드 ${slideNumber} 재생성 완료`, 'success');

                // 버튼에 완료 표시 후 원래 상태로 복원
                regenerateButton.innerHTML = '<i class="fas fa-check mr-2"></i> <span>완료!</span>';
                setTimeout(() => {
                    regenerateButton.innerHTML = originalButtonContent;
                    regenerateButton.disabled = false;
                }, 1500);
            } else {
                throw new Error(data.message || '알 수 없는 오류');
            }

        } catch (error) {
            // 오류 발생 시 버튼 상태 복원
            const slideElement = document.querySelectorAll('.slide-item')[slideNumber - 1];
            const regenerateButton = slideElement.querySelector('.regenerate-slide-button');
            regenerateButton.innerHTML = '<i class="fas fa-exclamation-circle mr-2"></i> <span>재시도</span>';
            regenerateButton.disabled = false;

            alert('슬라이드 재생성 중 오류가 발생했습니다: ' + error.message);
            this.addLogEntry(`슬라이드 재생성 오류: ${error.message}`, 'error');
        }
    }

    // 슬라이드 미디어 상태 초기화 메서드
    resetSlideMediaState(slideNumber) {
        const slideElement = document.querySelectorAll('.slide-item')[slideNumber - 1];

        // 오디오 상태 초기화
        const audioContainer = slideElement.querySelector('.audio-container');
        const audioPlayer = audioContainer?.querySelector('.audio-player');
        if (audioPlayer) {
            audioPlayer.remove();
            audioContainer.style.display = 'none';
        }

        const audioButton = slideElement.querySelector('.generate-audio-button');
        if (audioButton) {
            audioButton.innerHTML = '<i class="fas fa-volume-up"></i> 음성 생성';
            audioButton.classList.remove('completed');
        }

        // 비디오 상태 초기화
        const videoContainer = slideElement.querySelector('.video-container');
        const videoPlayer = videoContainer?.querySelector('.video-player');
        if (videoPlayer) {
            videoPlayer.remove();
            videoContainer.style.display = 'none';
        }

        const videoButton = slideElement.querySelector('.generate-video-button');
        if (videoButton) {
            videoButton.innerHTML = '<i class="fas fa-video"></i> 비디오 생성';
            videoButton.classList.remove('completed');
        }

        //this.updateButtonStates();
    }
    // 로그 항목 추가 함수
    addLogEntry(message, type = 'info') {
        if (!this.processLogs) return;

        const timestamp = new Date().toLocaleTimeString();
        let prefix = '';

        switch (type) {
            case 'error':
                prefix = '[오류] ';
                break;
            case 'success':
                prefix = '[성공] ';
                break;
            case 'detail':
                prefix = '[상세] ';
                break;
            default:
                prefix = '[정보] ';
        }

        const logEntry = `${timestamp} ${prefix}${message}\n`;
        this.processLogs.textContent += logEntry;

        // 스크롤을 항상 최신 로그로 유지
        this.processLogs.scrollTop = this.processLogs.scrollHeight;
    }

    toggleEditMode() {
        this.isEditing = !this.isEditing;
        const viewModes = document.querySelectorAll('.view-mode');
        const editModes = document.querySelectorAll('.edit-mode');
        const saveButton = document.querySelector('.save-button');
        // 플로팅 버튼 컨테이너에서 첫 번째 버튼을 선택 (항상 편집/취소 버튼임)
        const editButton = document.querySelector('.floating-buttons').children[0];

        // 뷰/편집 모드 전환
        viewModes.forEach(view => {
            view.style.display = this.isEditing ? 'none' : 'block';
        });

        editModes.forEach(edit => {
            edit.style.display = this.isEditing ? 'block' : 'none';

            // 편집 모드일 때 textarea 높이 자동 조절
            if (this.isEditing) {
                // 초기 높이 설정
                setTimeout(() => {
                    edit.style.height = 'auto';
                    edit.style.height = (edit.scrollHeight) + 'px';
                }, 0);

                // input 이벤트 리스너가 이미 있는지 확인
                if (!edit._hasInputListener) {
                    edit.addEventListener('input', function () {
                        this.style.height = 'auto';
                        this.style.height = (this.scrollHeight) + 'px';
                    });
                    edit._hasInputListener = true;
                }
            }
        });

        // 저장 버튼 표시/숨김
        saveButton.style.display = this.isEditing ? 'block' : 'none';

        // 편집 모드에 따라 아이콘과 툴팁 변경
        if (this.isEditing) {
            // 편집 모드일 때는 취소 아이콘으로 변경
            editButton.innerHTML = '<i class="fas fa-times"></i>';
            editButton.title = '편집 취소';
            // 모든 클래스를 제거하고 필요한 클래스만 추가
            editButton.className = 'floating-button cancel-button';
        } else {
            // 일반 모드일 때는 편집 아이콘으로 변경
            editButton.innerHTML = '<i class="fas fa-edit"></i>';
            editButton.title = '스크립트 편집';
            // 모든 클래스를 제거하고 필요한 클래스만 추가
            editButton.className = 'floating-button edit-button';
        }
    }

    async saveChanges() {
        const editModes = document.querySelectorAll('.edit-mode');
        const slides = Array.from(editModes).map((textarea, index) => ({
            slideNumber: index + 1,
            analysis: textarea.value.trim()
        }));

        try {
            const saveButton = document.querySelector('.save-button');
            if (saveButton) {
                const originalHTML = saveButton.innerHTML;
                saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                saveButton.disabled = true;

                let url = '/recmaker-api/update-script';

                // 세션 ID가 있으면 URL에 추가
                if (this.sessionId) {
                    url += `?sessionId=${this.sessionId}`;
                }

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        updatedScript: {
                            slideAnalysis: slides
                        }
                    })
                });
                console.log('폴링 중, 작업 ID:', this.processingJobId, '세션 ID:', this.sessionId);
                const data = await response.json();
                console.log('서버 폴링 응답 전체:', data);
                if (data.status === 'success') {
                    // 성공 메시지 표시
                    saveButton.innerHTML = '<i class="fas fa-check"></i>';
                    setTimeout(() => {
                        saveButton.innerHTML = originalHTML;
                        saveButton.disabled = false;
                        this.toggleEditMode();
                    }, 1500);

                    // 뷰 모드 업데이트
                    const viewModes = document.querySelectorAll('.view-mode');
                    viewModes.forEach((view, index) => {
                        view.textContent = slides[index].analysis;
                    });
                } else {
                    throw new Error(data.message);
                }
            }
        } catch (error) {
            alert('저장 중 오류가 발생했습니다: ' + error.message);
            const saveButton = document.querySelector('.save-button');
            if (saveButton) {
                saveButton.innerHTML = '<i class="fas fa-save"></i>';
                saveButton.disabled = false;
            }
        }
    }

    async generateSlideAudio(slideNumber, slideElement) {
        const button = slideElement.querySelector('.generate-audio-button');
        const status = slideElement.querySelector('.audio-status');
        const audioContainer = slideElement.querySelector('.audio-container');

        if (!button || !status || !audioContainer) {
            return;
        }

        try {
            button.style.display = 'none';
            status.style.display = 'flex';

            let url = `/recmaker-api/generate-slide-audio/${slideNumber}`;

            // 세션 ID가 있으면 URL에 추가
            if (this.sessionId) {
                url += `?sessionId=${this.sessionId}`;
            }

            const response = await fetch(url, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('음성 생성 실패');
            }

            const data = await response.json();

            // 오디오 경로 설정
            const audioSrc = this.sessionId
            ? `/recmaker/audio/${this.sessionId}/slide_${slideNumber}.mp3`
            : `/recmaker/audio/slide_${slideNumber}.mp3`;

            // 자막 경로 설정
            const subtitlesSrt = data.subtitles?.srt || null;
            const subtitlesVtt = data.subtitles?.vtt || null;

            // 오디오 플레이어 생성 (자막 지원 추가)
            const audioElement = document.createElement('div');
            audioElement.className = 'audio-player';
            audioElement.innerHTML = `
                <audio controls ${subtitlesVtt ? 'crossorigin="anonymous"' : ''}>
                    <source src="${audioSrc}" type="audio/mpeg">
                    ${subtitlesVtt ? `<track kind="subtitles" label="한국어" src="${subtitlesVtt}" srclang="ko" default>` : ''}
                    브라우저가 오디오 재생을 지원하지 않습니다.
                </audio>
                <div class="flex justify-between items-center mt-2">
                    <span class="audio-label">슬라이드 ${slideNumber} 음성</span>
                    <div class="audio-actions">
                        ${subtitlesSrt ? `<a href="${subtitlesSrt}" download="slide_${slideNumber}.srt" class="text-blue-600 hover:underline text-sm mr-3">
                            <i class="fas fa-closed-captioning"></i> SRT
                        </a>` : ''}
                        ${subtitlesVtt ? `<a href="${subtitlesVtt}" download="slide_${slideNumber}.vtt" class="text-green-600 hover:underline text-sm mr-3">
                            <i class="fas fa-closed-captioning"></i> VTT
                        </a>` : ''}
                    </div>
                </div>
            `;

            // 기존 오디오 플레이어가 있다면 제거
            const existingPlayer = audioContainer.querySelector('.audio-player');
            if (existingPlayer) {
                existingPlayer.remove();
            }

            audioContainer.appendChild(audioElement);
            audioContainer.style.display = 'block';

            // 버튼 스타일 변경
            button.innerHTML = '<i class="fas fa-sync-alt"></i> 음성 재생성';
            button.classList.add('completed');
        } catch (error) {
            button.innerHTML = '<i class="fas fa-exclamation-circle"></i> 재시도';
            alert('음성 생성 중 오류가 발생했습니다: ' + error.message);
        } finally {
            button.style.display = 'block';
            status.style.display = 'none';
        }
        //this.updateButtonStates();
    }

    // 병합된 오디오와 자막 표시 메서드 추가
    showMergedAudio(subtitles = null) {
        // 병합된 오디오 플레이어 생성
        const mergedAudioContainer = document.createElement('div');
        mergedAudioContainer.className = 'merged-audio-container fade-in';

        // 오디오 경로 설정
        const audioSrc = this.sessionId
            ? `/audio/${this.sessionId}/final_lecture_audio.mp3`
            : `/audio/final_lecture_audio.mp3`;

        // 자막 경로 설정
        const subtitlesSrt = subtitles?.srt || null;
        const subtitlesVtt = subtitles?.vtt || null;

        mergedAudioContainer.innerHTML = `
        <h3><i class="fas fa-headphones"></i> 전체 강의 음성</h3>
        <audio controls ${subtitlesVtt ? 'crossorigin="anonymous"' : ''}>
            <source src="${audioSrc}" type="audio/mpeg">
            ${subtitlesVtt ? `<track kind="subtitles" label="한국어" src="${subtitlesVtt}" srclang="ko" default>` : ''}
            브라우저가 오디오 재생을 지원하지 않습니다.
        </audio>
        <div class="mt-2 flex justify-between items-center">
            <a href="${audioSrc}" download="강의_음성.mp3" class="text-primary hover:underline">
                <i class="fas fa-download"></i> 오디오 다운로드
            </a>
            <div class="subtitles-download">
                ${subtitlesSrt ? `<a href="${subtitlesSrt}" download="강의_자막.srt" class="text-blue-600 hover:underline ml-3">
                    <i class="fas fa-closed-captioning"></i> SRT 다운로드
                </a>` : ''}
                ${subtitlesVtt ? `<a href="${subtitlesVtt}" download="강의_자막.vtt" class="text-green-600 hover:underline ml-3">
                    <i class="fas fa-closed-captioning"></i> VTT 다운로드
                </a>` : ''}
            </div>
        </div>
    `;

        // 기존 병합 오디오가 있다면 제거
        const existingMergedAudio = document.querySelector('.merged-audio-container');
        if (existingMergedAudio) {
            existingMergedAudio.remove();
        }

        // 슬라이드 컨테이너 이전에 추가
        this.resultsSection.insertBefore(mergedAudioContainer, this.slidesContainer);

        console.log('최종 오디오 및 자막 파일을 표시했습니다.');
    }

    // 비디오 생성 메서드 추가 (자막 포함)
    async generateSlideVideo(slideNumber, slideElement) {
        const button = slideElement.querySelector('.generate-video-button');
        const status = slideElement.querySelector('.video-status');
        const videoContainer = slideElement.querySelector('.video-container');

        if (!button || !status || !videoContainer) {
            return;
        }

        try {
            button.style.display = 'none';
            status.style.display = 'flex';
            status.querySelector('span').textContent = '비디오 생성 중...';

            let url = `/recmaker-api/generate-slide-video/${slideNumber}`;

            // 세션 ID가 있으면 URL에 추가
            if (this.sessionId) {
                url += `?sessionId=${this.sessionId}`;
            }

            const response = await fetch(url, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('비디오 생성 실패');
            }

            const data = await response.json();

            // 비디오 소스 경로 설정
            const videoSrc = this.sessionId
                ? `/videos/${this.sessionId}/slide_${slideNumber}.mp4`
                : `/videos/slide_${slideNumber}.mp4`;

            // 자막 경로 가져오기
            const subtitlesSrt = this.sessionId
                ? `/subtitles/${this.sessionId}/slide_${slideNumber}.srt`
                : `/subtitles/slide_${slideNumber}.srt`;

            const subtitlesVtt = this.sessionId
                ? `/subtitles/${this.sessionId}/slide_${slideNumber}.vtt`
                : `/subtitles/slide_${slideNumber}.vtt`;

            // 자막 파일 존재 여부 확인 (실제로는 API를 통해 확인해야 하지만, 여기서는 간단히 처리)
            let hasSrt = false;
            let hasVtt = false;

            try {
                const subtitleCheckResponse = await fetch(subtitlesVtt, { method: 'HEAD' });
                hasVtt = subtitleCheckResponse.ok;
            } catch (e) {
                hasVtt = false;
            }

            try {
                const subtitleCheckResponse = await fetch(subtitlesSrt, { method: 'HEAD' });
                hasSrt = subtitleCheckResponse.ok;
            } catch (e) {
                hasSrt = false;
            }

            // 비디오 플레이어 생성
            const videoElement = document.createElement('div');
            videoElement.className = 'video-player';
            videoElement.innerHTML = `
            <video controls class="w-full" ${hasVtt ? 'crossorigin="anonymous"' : ''}>
                <source src="${videoSrc}" type="video/mp4">
                ${hasVtt ? `<track kind="subtitles" label="한국어" src="${subtitlesVtt}" srclang="ko" default>` : ''}
                브라우저가 비디오 재생을 지원하지 않습니다.
            </video>
            <div class="flex justify-between mt-2">
                <span class="video-label text-sm">슬라이드 ${slideNumber} 비디오</span>
                <div class="video-actions">
                    ${hasSrt ? `<a href="${subtitlesSrt}" download="slide_${slideNumber}.srt" class="text-blue-600 hover:underline text-sm mr-3">
                        <i class="fas fa-closed-captioning"></i> SRT
                    </a>` : ''}
                    ${hasVtt ? `<a href="${subtitlesVtt}" download="slide_${slideNumber}.vtt" class="text-green-600 hover:underline text-sm mr-3">
                        <i class="fas fa-closed-captioning"></i> VTT
                    </a>` : ''}
                    <a href="${videoSrc}" download="slide_${slideNumber}.mp4" class="text-blue-600 hover:underline text-sm">
                        <i class="fas fa-download"></i> 다운로드
                    </a>
                </div>
            </div>
        `;

            // 기존 비디오 플레이어가 있다면 제거
            const existingPlayer = videoContainer.querySelector('.video-player');
            if (existingPlayer) {
                existingPlayer.remove();
            }

            videoContainer.appendChild(videoElement);
            videoContainer.style.display = 'block';

            // 버튼 스타일 변경
            button.innerHTML = '<i class="fas fa-sync-alt"></i> 영상 재생성';
            button.classList.add('completed');

            this.addLogEntry(`슬라이드 ${slideNumber} 비디오 생성 완료`, 'success');

        } catch (error) {
            button.innerHTML = '<i class="fas fa-exclamation-circle"></i> 재시도';
            alert('비디오 생성 중 오류가 발생했습니다: ' + error.message);
            this.addLogEntry(`비디오 생성 중 오류: ${error.message}`, 'error');
        } finally {
            button.style.display = 'block';
            status.style.display = 'none';
        }
        //this.updateButtonStates();
    }

    async handleAudioMerge() {
        try {
            const progressDetails = document.getElementById('progress-details');
            if (progressDetails) {
                progressDetails.innerHTML += '<p>음성 병합 기능은 비활성화되었습니다.</p>';
            }
            
            // 모든 슬라이드에 오디오가 있는지만 확인하고 성공으로 처리
            this.addLogEntry('오디오 병합 기능은 비활성화되었습니다.', 'info');
            
        } catch (error) {
            this.addLogEntry(`오디오 병합 기능은 비활성화되었습니다.`, 'info');
        }
        
        return Promise.resolve(); // 항상 성공으로 처리
    }

    handleScriptDownload() {
        let url = '/recmaker-api/get-script';

        // 세션 ID가 있으면 URL에 추가
        if (this.sessionId) {
            url += `?sessionId=${this.sessionId}`;
        }

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('스크립트를 가져올 수 없습니다.');
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'success' && data.script) {
                    // 스크립트 텍스트 생성
                    let scriptText = '# 강의 스크립트\n\n';

                    if (this.sessionId) {
                        scriptText += `세션 ID: ${this.sessionId}\n`;
                        scriptText += `영구 접근 URL: ${window.location.origin}/${this.sessionId}\n\n`;
                    }

                    data.script.slideAnalysis.forEach(slide => {
                        scriptText += `## 슬라이드 ${slide.slideNumber}\n\n${slide.analysis}\n\n`;
                    });

                    // 파일 다운로드
                    const blob = new Blob([scriptText], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = '강의_스크립트.md';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                } else {
                    throw new Error('스크립트 데이터가 유효하지 않습니다.');
                }
            })
            .catch(error => {
                alert('스크립트 다운로드 중 오류가 발생했습니다: ' + error.message);
            });
    }
}

// 인스턴스 생성
document.addEventListener('DOMContentLoaded', () => {
    new PPTAnalyzer();
});