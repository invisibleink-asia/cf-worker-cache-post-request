/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
  async fetch(request, env, ctx) {
    async function sha256(message) {
      // encode as UTF-8
      const msgBuffer = await new TextEncoder().encode(message);

      // hash the message
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);

      // convert bytes to hex string
      return [...new Uint8Array(hashBuffer)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }

    try {
      if (request.method.toUpperCase() === "POST") {
        const body = await request.clone().text();

        // Hash the request body to use it as a part of the cache key
        const hash = await sha256(body);
        const cacheUrl = new URL(request.url);

        // Store the URL in cache by prepending the body's hash
        cacheUrl.pathname = "/posts" + cacheUrl.pathname + hash;

        // Convert to a GET to be able to cache
        const cacheKey = new Request(cacheUrl.toString(), {
          headers: request.headers,
          method: "GET",
        });

        const cache = caches.default;
        // Find the cache key in the cache
        let response = await cache.match(cacheKey);

        // Otherwise, fetch response to POST request from origin
        if (!response) {
          response = await fetch(request);
          ctx.waitUntil(cache.put(cacheKey, response.clone()));
        }

        return response;
      }

      return fetch(request);
    } catch (e) {
      return new Response("Error thrown " + e.message);
    }
  },
};
