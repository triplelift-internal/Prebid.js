export const isGzipCompressionSupported: () => Promise<boolean> = (function () {
  const result = (async () => {
    try {
      if (typeof window.CompressionStream === 'undefined' || typeof window.DecompressionStream === 'undefined' || typeof Response.prototype.bytes === 'undefined') {
        return false;
      }
      const probe = 'prebid-gzip-probe';
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(probe);
      const stream = new Blob([encodedData])
        .stream()
        .pipeThrough(new window.CompressionStream('gzip'))
        .pipeThrough(new window.DecompressionStream('gzip'));
      return await new Response(stream).text() === probe;
    } catch (error) {
      return false;
    }
  })();
  return () => result;
})();

// Make sure to use isGzipCompressionSupported before calling this function
export async function compressDataWithGZip(data) {
  if (typeof data !== 'string') { // TextEncoder (below) expects a string
    data = JSON.stringify(data);
  }

  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);
  const compressedStream = new Blob([encodedData])
    .stream()
    .pipeThrough(new window.CompressionStream('gzip'));

  return await new Response(compressedStream).bytes();
}
