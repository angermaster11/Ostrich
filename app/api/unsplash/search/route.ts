import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json(
      {
        results: [],
        error:
          "Unsplash is not configured. Set UNSPLASH_ACCESS_KEY in frontend/.env.local.",
      },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        query
      )}&per_page=12`,
      {
        cache: "no-store",
        headers: {
          Authorization: `Client-ID ${accessKey}`,
          "Accept-Version": "v1",
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) {
      let message = "Unsplash request failed";
      try {
        const body = await res.json();
        if (typeof body?.errors?.[0] === "string") message = body.errors[0];
      } catch {
        // ignore
      }
      return NextResponse.json(
        { results: [], error: message },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Unsplash search error:", error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
