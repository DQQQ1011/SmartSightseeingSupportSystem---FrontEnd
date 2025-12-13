// Vercel Edge Function for dynamic Open Graph meta tags
// This serves proper OG tags when social media crawlers access destination links

export const config = {
    runtime: 'edge',
};

const BEFORE_API_URL = process.env.VITE_BEFORE_API_URL || 'https://smart-tourism-before.onrender.com';
const SITE_URL = process.env.VITE_SITE_URL || 'https://smart-tourism.vercel.app';

export default async function handler(request) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];

    // Get optional params: user image and timestamp
    const userImageUrl = url.searchParams.get('img');
    const timestamp = url.searchParams.get('t');

    // Check if this is a social media crawler
    const userAgent = request.headers.get('user-agent') || '';
    const isCrawler = /facebookexternalhit|Facebot|Twitterbot|WhatsApp|TelegramBot|Slackbot|LinkedInBot|Pinterest|Zalo/i.test(userAgent);

    // If not a crawler, redirect to actual page
    if (!isCrawler) {
        return Response.redirect(`${SITE_URL}/destination/${id}`, 302);
    }

    try {
        // Fetch destination data from API
        const response = await fetch(`${BEFORE_API_URL}/destinations/${id}`);

        if (!response.ok) {
            return new Response('Not Found', { status: 404 });
        }

        const destination = await response.json();

        const title = destination.name || 'Địa điểm du lịch';

        // Use provided timestamp or current time
        const displayTime = timestamp
            ? new Date(parseInt(timestamp)).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
            : new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

        const description = `Tôi đã khám phá ${destination.name} với Smart Sightseeing lúc ${displayTime} tại ${destination.location_province || 'Việt Nam'}! 🌟`;

        // Use user's uploaded image if provided, otherwise use database image
        const image = userImageUrl || destination.image_urls?.[0] || `${SITE_URL}/og-default.jpg`;
        const pageUrl = `${SITE_URL}/destination/${id}`;

        // Return HTML with Open Graph meta tags
        const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Smart Sightseeing</title>
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="Smart Sightseeing">
  <meta property="og:locale" content="vi_VN">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${image}">
  
  <!-- Zalo -->
  <meta property="zalo:article:title" content="${title}">
  <meta property="zalo:article:description" content="${description}">
  <meta property="zalo:article:image" content="${image}">
  
  <!-- Redirect for non-JS browsers -->
  <meta http-equiv="refresh" content="0;url=${pageUrl}">
</head>
<body>
  <p>Đang chuyển hướng đến <a href="${pageUrl}">${title}</a>...</p>
</body>
</html>`;

        return new Response(html, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=3600',
            },
        });

    } catch (error) {
        console.error('OG handler error:', error);
        return new Response('Server Error', { status: 500 });
    }
}
