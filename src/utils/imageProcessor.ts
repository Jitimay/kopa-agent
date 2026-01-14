import sharp from 'sharp';

/**
 * Validates if a base64 string is a valid image format
 */
export function validateImageFormat(base64Image: string): boolean {
    if (!base64Image) {
        return false;
    }

    // Check for data URL format
    const dataUrlRegex = /^data:image\/(jpeg|jpg|png|webp);base64,/;
    return dataUrlRegex.test(base64Image);
}

/**
 * Preprocesses an image for OCR by converting to grayscale and enhancing contrast
 */
export async function preprocessImage(base64Image: string): Promise<Buffer> {
    try {
        // Extract base64 data (remove data URL prefix)
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // Preprocess: grayscale, normalize, sharpen
        const processedBuffer = await sharp(imageBuffer)
            .grayscale()
            .normalize()
            .sharpen()
            .toBuffer();

        return processedBuffer;
    } catch (error) {
        throw new Error(`Image preprocessing failed: ${(error as Error).message}`);
    }
}

/**
 * Extracts metadata from an image
 */
export async function extractImageMetadata(base64Image: string): Promise<{
    format?: string;
    width?: number;
    height?: number;
    size?: number;
}> {
    try {
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        const metadata = await sharp(imageBuffer).metadata();

        return {
            format: metadata.format,
            width: metadata.width,
            height: metadata.height,
            size: imageBuffer.length
        };
    } catch (error) {
        throw new Error(`Metadata extraction failed: ${(error as Error).message}`);
    }
}
