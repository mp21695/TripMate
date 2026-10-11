const DEFAULT_COVER_IMAGE =
  'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1600&q=80';

export async function fetchUnsplashCover(destination: string): Promise<string> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey || accessKey.trim() === '') {
    return DEFAULT_COVER_IMAGE;
  }

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
      destination
    )}&orientation=landscape&per_page=1`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return data.results[0].urls.regular;
      }
    }
  } catch (err) {
    console.error('Unsplash API fetch failed, using default cover:', err);
  }

  return DEFAULT_COVER_IMAGE;
}
