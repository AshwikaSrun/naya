import { NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

interface TryOnRequestBody {
  userImage?: string;
  garmentImage?: string;
  garmentTitle?: string;
}

interface FalImage {
  url: string;
  content_type?: string;
  width?: number;
  height?: number;
}

interface FalTryOnResult {
  image: FalImage;
  mask?: FalImage;
}

export async function POST(request: Request) {
  try {
    const falKey = process.env.FAL_KEY?.trim();
    if (!falKey) {
      return NextResponse.json(
        { error: 'FAL_KEY not configured. Add it to your environment variables.' },
        { status: 500 }
      );
    }

    fal.config({ credentials: falKey });

    const body = (await request.json()) as TryOnRequestBody;
    const userImage = body.userImage?.trim();
    const garmentImage = body.garmentImage?.trim();
    const garmentTitle = body.garmentTitle?.trim() || 'garment';

    if (!userImage || !garmentImage) {
      return NextResponse.json(
        { error: 'userImage and garmentImage are required.' },
        { status: 400 }
      );
    }

    // Try IDM-VTON first (higher quality), fall back to image-apps-v2
    const model = process.env.FAL_TRYON_MODEL?.trim() || 'fal-ai/idm-vton';

    let result: { data: FalTryOnResult };

    if (model === 'fal-ai/idm-vton') {
      result = await fal.subscribe(model, {
        input: {
          human_image_url: userImage,
          garment_image_url: garmentImage,
          description: garmentTitle,
          num_inference_steps: 30,
        },
      }) as { data: FalTryOnResult };
    } else {
      result = await fal.subscribe(model, {
        input: {
          person_image_url: userImage,
          clothing_image_url: garmentImage,
        },
      }) as { data: FalTryOnResult };
    }

    const outputUrl = result?.data?.image?.url;
    if (!outputUrl) {
      return NextResponse.json(
        { error: 'Model returned no result image.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      resultImage: outputUrl,
      width: result.data.image.width,
      height: result.data.image.height,
      model,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error);
    console.error('Try-on error:', message);

    if (message.includes('UNAUTHORIZED') || message.includes('401')) {
      return NextResponse.json(
        { error: 'Invalid FAL_KEY. Check your fal.ai API key.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'AI try-on failed. Try again in a moment.', detail: message },
      { status: 500 }
    );
  }
}
