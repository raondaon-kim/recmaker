const fs = require('fs').promises;
const AdmZip = require('adm-zip');
const config = require('./config');

class ContentExtractor {
    constructor() {
        this.pptConverter = null;
        this.pdfConverter = null;
    }

    setPPTConverter(converter) {
        this.pptConverter = converter;
    }

    setPDFConverter(converter) {
        this.pdfConverter = converter;
    }

    async extractPptContent(pptFilePath) {
        try {
            // 1. PPT를 PDF로 변환
            const pdfPath = config.getFullPath('extracted', 'getPdfName');
            await this.pptConverter.convertToPDF(pptFilePath, pdfPath);
            config.addTempFile(pdfPath);

            // 2. PDF를 이미지로 변환
            const imageFiles = await this.pdfConverter.convertToImages(pdfPath);

            // 3. PPT 내용(텍스트) 추출
            const { slides } = await this.extractContent(pptFilePath);

            // 4. 이미지 파일 이름 변경 및 매핑
            await this.renameAndMapImages(imageFiles, slides);

            // 5. 최종 결과 저장
            await this.saveSlidesData(slides);

            return { 
                slides, 
                outputDir: config.getDirPath('extracted')
            };
        } catch (error) {
            console.error('PPT 파일 처리 중 오류 발생:', error);
            throw error;
        }
    }

    async extractContent(pptFilePath) {
        try {
            const zip = new AdmZip(pptFilePath);
            const zipEntries = zip.getEntries();
            const slides = [];

            // 슬라이드 XML 파일 찾기
            const slideEntries = zipEntries.filter(entry =>
                entry.entryName.startsWith('ppt/slides/slide')
            );

            // 각 슬라이드 처리
            for (let i = 0; i < slideEntries.length; i++) {
                const slideEntry = slideEntries[i];
                const slideNum = i + 1;
                const slideData = {
                    slideNumber: slideNum,
                    text: [],
                    images: []
                };

                // 텍스트 추출
                const slideXml = zip.readAsText(slideEntry);
                const textMatches = slideXml.match(/<a:t>([^<]*)<\/a:t>/g);
                if (textMatches) {
                    slideData.text = textMatches
                        .map(match => match.replace(/<a:t>|<\/a:t>/g, '').trim())
                        .filter(text => text !== '');
                }

                slides.push(slideData);
            }

            return { slides };
        } catch (error) {
            console.error('콘텐츠 추출 중 오류 발생:', error);
            throw error;
        }
    }

    async renameAndMapImages(imageFiles, slides) {
        for (let i = 0; i < imageFiles.length; i++) {
            const slideNum = i + 1;
            const newImagePath = config.getFullPath('extracted', 'getSlideName', slideNum);
            
            try {
                await fs.rename(imageFiles[i], newImagePath);
                
                if (slides[i]) {
                    slides[i].images.push({
                        path: newImagePath.replace(/\\/g, '/')
                    });
                }
            } catch (error) {
                console.error(`이미지 파일 이름 변경 실패 (${imageFiles[i]} -> ${newImagePath}):`, error);
            }
        }
    }

    async saveSlidesData(slides) {
        // 각 슬라이드 JSON 파일 생성
        for (const slide of slides) {
            const jsonPath = config.getFullPath('extracted', 'getSlideJsonName', slide.slideNumber);
            await fs.writeFile(jsonPath, JSON.stringify(slide, null, 2), 'utf-8');
        }

        // 전체 프레젠테이션 요약 JSON 생성
        const summaryPath = config.getFullPath('extracted', 'getPresentationSummary');
        await fs.writeFile(summaryPath, JSON.stringify({ slides }, null, 2), 'utf-8');
    }
}

module.exports = ContentExtractor;