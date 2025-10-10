async function handle({ event, resolve }) {
  const host = event.request.headers.get("host");
  if (host?.startsWith("www.")) {
    const nonWwwHost = host.slice(4);
    const url = new URL(event.request.url);
    const redirectUrl = `${url.protocol}//${nonWwwHost}${url.pathname}${url.search}${url.hash}`;
    return new Response(null, {
      status: 301,
      headers: {
        location: redirectUrl
      }
    });
  }
  const response = await resolve(event);
  return response;
}
export {
  handle
};
