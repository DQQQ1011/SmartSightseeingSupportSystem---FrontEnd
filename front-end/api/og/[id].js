// Vercel Edge Function for dynamic Open Graph meta tags
// This serves proper OG tags when social media crawlers access destination links

export const config = {
    runtime: 'edge',
};

export default async function handler(request) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];

    // Get the origin from request URL (works in production)
    const origin = url.origin;
    const pageUrl = `${origin}/destination/${id}`;

    // Get optional params: user image and timestamp
    const userImageUrl = url.searchParams.get('img');
    const timestamp = url.searchParams.get('t');

    // Check if this is a social media crawler
    const userAgent = request.headers.get('user-agent') || '';
    const isCrawler = /facebookexternalhit|Facebot|Twitterbot|WhatsApp|TelegramBot|Slackbot|LinkedInBot|Pinterest|Zalo/i.test(userAgent);

    // If not a crawler, redirect to actual page immediately
    if (!isCrawler) {
        return Response.redirect(pageUrl, 302);
    }

    try {
        // Backend API URL - use env var or default to user's HF space
        const BEFORE_API_URL = process.env.BEFORE_API_URL || 'https://novaaa1011-before.hf.space';

        // Fetch destination data from API
        const response = await fetch(`${BEFORE_API_URL}/destinations/${id}`);

        if (!response.ok) {
            // If API fails, redirect to page anyway
            return Response.redirect(pageUrl, 302);
        }

        const destination = await response.json();

        const title = destination.name || 'Địa điểm du lịch';

        // Use provided timestamp or current time
        const displayTime = timestamp
            ? new Date(parseInt(timestamp)).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
            : new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

        const description = `Tôi đã khám phá ${destination.name} với Smart Sightseeing lúc ${displayTime} tại ${destination.location_province || 'Việt Nam'}! 🌟`;

        // Use user's uploaded image if provided, otherwise use database image
        const image = userImageUrl || destination.image_urls?.[0] || `${origin}/og-default.jpg`;

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
        // On error, just redirect to the page
        return Response.redirect(pageUrl, 302);
    }
}

