import { withAuth } from '@/lib/apiAuth';

export const POST = withAuth(async (req, { userId }) => {
    try {
        const formData = await req.formData();
        const file = formData.get('image') || formData.get('audio');

        if (!file) {
            return Response.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // For Vercel serverless: convert to base64 data URL
        // OCR happens client-side via Tesseract.js, so we just need the URL for display
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString('base64');
        const mimeType = file.type || 'image/jpeg';
        const dataUrl = `data:${mimeType};base64,${base64}`;

        return Response.json({
            url: dataUrl,
            filename: file.name,
            message: 'File uploaded successfully'
        });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});
