// app/api/user/image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// In-memory storage for image URLs (replace with database in production)
const imageStorage = new Map<string, string>();

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const image = formData.get('image') as File;
        const userId = formData.get('userId') as string;

        if (!image || !userId) {
            return NextResponse.json(
                { error: 'Image and userId are required' },
                { status: 400 }
            );
        }

        // Validate file type
        if (!image.type.startsWith('image/')) {
            return NextResponse.json(
                { error: 'File must be an image' },
                { status: 400 }
            );
        }

        // Validate file size (5MB max)
        if (image.size > 5 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'Image must be less than 5MB' },
                { status: 400 }
            );
        }

        const bytes = await image.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create uploads directory if it doesn't exist
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'users');
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Generate unique filename
        const extension = image.name.split('.').pop();
        const filename = `${userId}_${Date.now()}.${extension}`;
        const filepath = path.join(uploadDir, filename);

        // Save file
        await writeFile(filepath, buffer);

        const imageUrl = `/uploads/users/${filename}`;

        // Store image URL in memory (replace with database)
        imageStorage.set(userId, imageUrl);

        return NextResponse.json(
            {
                message: 'Image uploaded successfully',
                url: imageUrl,
                filename,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error uploading image:', error);
        return NextResponse.json(
            { error: 'Failed to upload image' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const userId = url.searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: 'userId parameter is required' },
                { status: 400 }
            );
        }

        const imageUrl = imageStorage.get(userId);

        if (!imageUrl) {
            return NextResponse.json(
                { error: 'Image not found for user' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                url: imageUrl,
                userId,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error fetching image:', error);
        return NextResponse.json(
            { error: 'Failed to fetch image' },
            { status: 500 }
        );
    }
}