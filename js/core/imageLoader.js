// Concurrency-limited image loader with retry + backoff.
//
// Why this exists: every tile fires its own image request the instant it's
// built, so a page with N photos bursts N parallel requests at the host. The
// public R2 dev endpoint (pub-*.r2.dev) is rate-limited by Cloudflare, so a
// burst gets most requests throttled — which is why only a handful of photos
// used to appear, and why the count differed between fast desktop bursts and
// staggered mobile connections.
//
// This serialises loads through a small pool and retries throttled/failed
// requests with exponential backoff + jitter, so the whole set comes in
// reliably regardless of how aggressive the burst is. It lives in core/ because
// it depends on nothing in the project (see ARCHITECTURE.md §5).

const MAX_CONCURRENT = 4;     // simultaneous in-flight requests
const MAX_RETRIES    = 4;     // attempts after the first failure
const BASE_DELAY_MS  = 600;   // backoff base; grows 600 → 1200 → 2400 → 4800

let active = 0;
const queue = [];

// Loads an image with crossOrigin='anonymous' (so the texture stays untainted
// for WebGL). Resolves with the loaded HTMLImageElement, or rejects after
// MAX_RETRIES exhausted failures.
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    queue.push({ src, resolve, reject, attempt: 0 });
    pump();
  });
}

// Start as many queued jobs as the concurrency budget allows.
function pump() {
  while (active < MAX_CONCURRENT && queue.length > 0) {
    active++;
    attempt(queue.shift());
  }
}

function attempt(job) {
  const img = new Image();
  img.crossOrigin = 'anonymous';

  img.onload = () => {
    active--;
    job.resolve(img);
    pump();
  };

  img.onerror = () => {
    active--;
    if (job.attempt < MAX_RETRIES) {
      job.attempt++;
      // Exponential backoff with jitter, then re-queue so the retry still
      // respects the concurrency budget instead of stampeding the host again.
      const delay = BASE_DELAY_MS * 2 ** (job.attempt - 1) + Math.random() * 300;
      setTimeout(() => { queue.push(job); pump(); }, delay);
    } else {
      job.reject(new Error(`thumb failed to load: ${job.src}`));
    }
    pump();
  };

  img.src = job.src;
}
