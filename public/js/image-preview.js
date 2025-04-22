// 이미지 확대 모달 관련 코드

// 이미지 확대 모달 생성
function createImagePreviewModal() {
    // 이미 존재하는 모달이 있으면 제거
    let existingModal = document.getElementById('image-preview-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 새 모달 생성
    const modal = document.createElement('div');
    modal.id = 'image-preview-modal';
    modal.className = 'image-preview-modal';
    modal.innerHTML = `
        <div class="image-preview-content">
            <button class="image-preview-close">&times;</button>
            <img class="image-preview-img" src="" alt="확대된 이미지">
        </div>
    `;
    
    // 모달 닫기 이벤트
    modal.addEventListener('click', function(e) {
        if (e.target === modal || e.target.classList.contains('image-preview-close')) {
            closeImageModal();
        }
    });
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            closeImageModal();
        }
    });
    
    // body에 모달 추가
    document.body.appendChild(modal);
    
    return modal;
}

// 이미지 모달 열기
function openImageModal(imageSrc) {
    // 모달이 없으면 생성
    let modal = document.getElementById('image-preview-modal');
    if (!modal) {
        modal = createImagePreviewModal();
    }
    
    // 이미지 소스 설정
    const modalImg = modal.querySelector('.image-preview-img');
    modalImg.src = imageSrc;
    
    // 모달 표시
    setTimeout(() => {
        modal.classList.add('show');
        document.body.classList.add('modal-open');
    }, 10);
}

// 이미지 모달 닫기
function closeImageModal() {
    const modal = document.getElementById('image-preview-modal');
    if (modal) {
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
    }
}

// 슬라이드 썸네일 클릭 시 이미지 확대
function setupImagePreviewHandlers() {
    // 모든 슬라이드 썸네일에 클릭 이벤트 추가
    const thumbnails = document.querySelectorAll('.slide-thumbnail');
    thumbnails.forEach(thumbnail => {
        // 클릭 이벤트가 이미 있는지 확인
        if (!thumbnail.hasAttribute('data-preview-enabled')) {
            thumbnail.setAttribute('data-preview-enabled', 'true');
            thumbnail.addEventListener('click', function() {
                openImageModal(this.src);
            });
        }
    });
}

// DOM이 변경될 때 이미지 핸들러 다시 설정
const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length) {
            setupImagePreviewHandlers();
        }
    });
});

// 초기화 함수
function initImagePreview() {
    createImagePreviewModal();
    setupImagePreviewHandlers();
    
    // 문서 변경 관찰 시작
    observer.observe(document.body, { childList: true, subtree: true });
}

// 문서 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', initImagePreview);