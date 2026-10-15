export default {
  async fetch(request, env, ctx) {
    // 1. Handle CORS Preflight (OPTIONS request) - ताकि ब्राउज़र ब्लॉक न करे
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Max-Age": "86400",
        }
      });
    }

    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
      return new Response("Error: URL parameter is missing. Example: ?url=https://example.com/video.m3u8", { status: 400 });
    }

    // 2. Hardcoded Secure Headers (आपके बताए हुए)
    const modifiedHeaders = new Headers();
    modifiedHeaders.set("sec-ch-ua", '"Chromium";v="154", "Android WebView";v="154", "Not A(Brand";v="99"');
    modifiedHeaders.set("sec-ch-ua-mobile", "?1");
    modifiedHeaders.set("Accept", "*/*");
    modifiedHeaders.set("sec-ch-ua-platform", '"Android"');
    modifiedHeaders.set("User-Agent", "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36");
    
    // Origin और Referer को खाली (blank) रखना है
    modifiedHeaders.set("Origin", "");
    modifiedHeaders.set("Referer", "");

    try {
      // 3. Akamai/Target Server को रिक्वेस्ट भेजें
      const targetResponse = await fetch(targetUrl, {
        method: request.method,
        headers: modifiedHeaders,
        redirect: "follow"
      });

      // 4. Response Headers को मॉडिफाई करें ताकि ब्राउज़र वीडियो प्ले कर सके
      const responseHeaders = new Headers(targetResponse.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");
      responseHeaders.set("Access-Control-Allow-Headers", "*");

      return new Response(targetResponse.body, {
        status: targetResponse.status,
        statusText: targetResponse.statusText,
        headers: responseHeaders
      });
    } catch (e) {
      return new Response("Worker Fetch Error: " + e.message, { status: 500 });
    }
  }
};
