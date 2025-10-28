export function generateUniqueId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getFileExtension(filePath: string): string {
    return filePath.split('.').pop()?.toLowerCase() || '';
}

export function isVideoFile(filePath: string): boolean {
    const validExtensions = ['mp4', 'mov', 'webm', 'avi', 'mkv'];
    return validExtensions.includes(getFileExtension(filePath));
}

export function calculateAspectRatio(width: number, height: number): number {
    return width / height;
}

export function fitToContainer(
    videoWidth: number,
    videoHeight: number,
    containerWidth: number,
    containerHeight: number
): { width: number; height: number } {
    const videoAspect = videoWidth / videoHeight;
    const containerAspect = containerWidth / containerHeight;

    if (videoAspect > containerAspect) {
        // Video is wider, fit to width
        return {
            width: containerWidth,
            height: containerWidth / videoAspect,
        };
    } else {
        // Video is taller, fit to height
        return {
            width: containerHeight * videoAspect,
            height: containerHeight,
        };
    }
}

