export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS, RANGE",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (!targetUrl) {
      return new Response("Missing URL parameter", { status: 400, headers: corsHeaders });
    }

    // Python bot wale exact referers jo har tarah ke security block ko bypass karte hain[span_1](start_span)[span_1](end_span)
    const referers = [
      "https://classx.co.in/",
      "https://rozgarapinew.teachx.in/",
      "https://web.classplusapp.com/",
      "https://www.youtube.com/"
    ];

    const userAgent = "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";

    // Client se aane wala Range header (video seeking aur chunks ke liye zaroori hai)
    const clientRange = request.headers.get("Range");

    let response = null;
    let lastError = null;

    for (let ref of referers) {
      try {
        const fetchHeaders = {
          "User-Agent": userAgent,
          "Referer": ref,
          "Origin": ref.slice(0, -1),
          "Accept": "*/*"
        };

        if (clientRange) {
          fetchHeaders["Range"] = clientRange;
        }

        response = await fetch(targetUrl, { 
          headers: fetchHeaders, 
          redirect: "follow" 
        });

        if (response.ok || response.status === 206) {
          break;
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!response || (!response.ok && response.status !== 206)) {
      return new Response(`Proxy fetch failed: ${lastError ? lastError.message : (response ? response.status : 'Unknown error')}`, {
        status: 502,
        headers: corsHeaders
      });
    }

    const newResponse = new Response(response.body, response);
    Object.keys(corsHeaders).forEach(key => {
      newResponse.headers.set(key, corsHeaders[key]);
    });

    return newResponse;
  }
};
