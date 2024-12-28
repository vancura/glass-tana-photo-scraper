import { Actor } from 'apify';
import { CheerioCrawler, Dataset } from 'crawlee';
import fetch from 'node-fetch';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { join } from 'path';
import { createHash } from 'crypto';
import * as fs from 'fs';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// At the top of your file, after imports
console.log('Environment check:');
console.log('TANA_API_TOKEN present:', !!process.env.TANA_API_TOKEN);
console.log('TANA_API_TOKEN length:', process.env.TANA_API_TOKEN?.length);

// At the top of your file
if (!process.env.TANA_API_TOKEN) {
    throw new Error('TANA_API_TOKEN environment variable is required');
}

// Add Tana API configuration
const TANA_API_ENDPOINT = 'https://europe-west1-tagr-prod.cloudfunctions.net/addToNodeV2';
const TANA_API_TOKEN = process.env.TANA_API_TOKEN; // Set this in your environment variables

interface PhotoData {
    title: string;
    pageUrl: string;
    camera: string;
    lens: string;
    focalLength: string;
    aperture: string;
    iso: string;
    exposureTime: string;
    dateOriginal: string;
    largestImageUrl: string;
}

const sendToTana = async (photoData: PhotoData) => {
    console.log('Starting sendToTana...'); // Debug log

    if (!TANA_API_TOKEN) {
        console.error('No TANA_API_TOKEN found!');
        throw new Error('TANA_API_TOKEN not set');
    }

    // Format date to YYYY-MM-DD
    const formattedDate = photoData.dateOriginal.split('T')[0];

    // Prepare the payload for Tana
    const payload = {
        nodes: [{
            name: photoData.title || 'Untitled Photo',
            // description: `Photo taken with ${photoData.camera}`,
            // Assuming you've created a "Photo" supertag in Tana with this ID
            supertags: [{ id: 'HuQZmkmcbG0N' }],  // This is your photo supertag ID
            children: [
                {
                    type: 'field',
                    attributeId: 'meKi9Vj-7uYg',  // Date
                    children: [{
                        dataType: 'date',
                        name: formattedDate
                    }]
                },
                {
                    type: 'field',
                    attributeId: 'I-uWFa5OC_K4',  // Glass URL
                    children: [{
                        name: photoData.pageUrl
                    }]
                },
                {
                    type: 'field',
                    attributeId: '8LkoIOG1Eb41',  // Camera
                    children: [{
                        name: photoData.camera
                    }]
                },
                {
                    type: 'field',
                    attributeId: 'X0tEv5uc69Vg',  // Lens
                    children: [{
                        name: photoData.lens
                    }]
                },
                {
                    type: 'field',
                    attributeId: 'rOfB4porU15D',  // Focal length
                    children: [{
                        name: photoData.focalLength
                    }]
                },
                {
                    type: 'field',
                    attributeId: 'Ng1Qraf91po7',  // Exposure
                    children: [{
                        name: photoData.exposureTime
                    }]
                },
                {
                    type: 'field',
                    attributeId: 'zz-gInS0mJGa',  // ISO
                    children: [{
                        name: photoData.iso
                    }]
                },
                {
                    type: 'field',
                    attributeId: 'jlFrKZ9ojywh',  // Aperture
                    children: [{
                        name: photoData.aperture
                    }]
                },
                {
                    type: 'field',
                    attributeId: 'ZolkvIYtvh6d',  // vancura.photos status
                    children: [{
                        dataType: 'reference',
                        id: 'GFOzkwLpLT7K'  // ⚪ Undefined
                    }]
                }
            ]
        }]
    };

    try {
        console.log('Sending request to Tana...'); // Debug log
        const response = await fetch(TANA_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TANA_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error('Tana API error:', response.statusText);
            throw new Error(`Tana API error: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Tana API response:', result);
        return result;
    } catch (error) {
        console.error('Failed to send to Tana:', error);
        throw error;
    }
};

interface Input {
    startUrls: string[];
}

interface GlassPhoto {
    title: string;
    camera: string;
    lens: string;
    focalLength: string;
    aperture: string;
    iso: string;
    exposureTime: string;
    dateOriginal: string;
    pageUrl: string;
    largestImageUrl: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await Actor.init();

const { startUrls = [] } = await Actor.getInput<Input>() ?? {};

const proxyConfiguration = await Actor.createProxyConfiguration();

const crawler = new CheerioCrawler({
    proxyConfiguration,
    maxRequestRetries: 0, // Optional: prevent retries
    requestHandler: async ({ request, $, log }) => {
        log.info('Processing Glass photo page', { url: request.loadedUrl });

        // Get the Next.js data script
        const nextDataRaw = $('#__NEXT_DATA__').html();
        if (!nextDataRaw) {
            throw new Error('No __NEXT_DATA__ script found!');
        }

        // Parse the JSON data
        let nextData;
        try {
            nextData = JSON.parse(nextDataRaw);
        } catch (err) {
            throw new Error(`Failed to parse __NEXT_DATA__ JSON: ${err}`);
        }

        // Extract post data
        const post = nextData?.props?.pageProps?.fallbackData?.post;
        if (!post) {
            throw new Error('No post data found in __NEXT_DATA__');
        }

        // Extract all relevant fields
        const photoData: PhotoData = {
            title: post.description || '',
            pageUrl: post.share_url || request.loadedUrl,
            camera: post.exif?.camera || '',
            lens: post.exif?.lens || '',
            focalLength: post.exif?.focal_length || '',
            aperture: post.exif?.aperture || '',
            iso: post.exif?.iso || '',
            exposureTime: post.exif?.exposure_time || '',
            dateOriginal: post.exif?.date_time_original || '',
            largestImageUrl: post.image3072x3072 || post.image2048x2048 || post.image1024x1024 || '',
        };

        log.info('Extracted photo data', { title: photoData.title });

        // Send to Tana
        try {
            log.info('About to send to Tana...', { url: photoData.pageUrl });
            const tanaResponse = await sendToTana(photoData);
            log.info('Successfully sent to Tana', { response: tanaResponse });
        } catch (error) {
            log.error('Failed to send to Tana:', { error: error.message, stack: error.stack });
            throw error; // Re-throw to mark the request as failed
        }

        // Create photos directory if it doesn't exist
        const photosDir = join(__dirname, '..', 'storage', 'photos');
        await fs.promises.mkdir(photosDir, { recursive: true });

        if (photoData.largestImageUrl) {
            try {
                const photoId = request.url.split('/').pop() ||
                              createHash('md5').update(request.url).digest('hex');
                const filename = join(photosDir, `photo_${photoId}.jpg`);

                // Download and save the image
                const imageResponse = await fetch(photoData.largestImageUrl);
                await pipeline(
                    imageResponse.body,
                    createWriteStream(filename)
                );

                photoData.localImagePath = filename;
                log.info(`Saved photo to ${filename}`);
            } catch (error) {
                log.error(`Failed to download image: ${error}`);
            }
        }

        // Still save to dataset as backup
        await Dataset.pushData(photoData);
    },
});

await crawler.run(startUrls);

await Actor.exit();
