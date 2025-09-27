// app/api/user/register/route.ts
import { NextRequest, NextResponse } from 'next/server';

// In-memory storage (replace with database in production)
const users = new Map<string, any>();

interface RegisterRequest {
    userId: string;
    name: string;
    dateOfBirth: number; // timestamp
    gender: number; // 0 for male, 1 for female
    city: string;
    country: string;
    imageUrl?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: RegisterRequest = await request.json();

        // Validate required fields
        const { userId, name, dateOfBirth, gender, city, country } = body;

        if (!userId || !name || !dateOfBirth || gender === undefined || !city || !country) {
            return NextResponse.json(
                { error: 'All fields except image are required' },
                { status: 400 }
            );
        }

        // Check if user already exists
        if (users.has(userId)) {
            return NextResponse.json(
                { error: 'User already exists' },
                { status: 409 }
            );
        }

        // Validate gender (0 or 1)
        if (gender !== 0 && gender !== 1) {
            return NextResponse.json(
                { error: 'Gender must be 0 (male) or 1 (female)' },
                { status: 400 }
            );
        }

        // Create user object
        const userData = {
            userId,
            name,
            dateOfBirth,
            gender,
            city,
            country,
            imageUrl: body.imageUrl || null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        // Store user
        users.set(userId, userData);

        console.log('User registered successfully:', userId);

        return NextResponse.json(
            {
                message: 'User registered successfully',
                user: userData,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error registering user:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET() {
    // Optional: Return all users for debugging
    return NextResponse.json(
        { users: Array.from(users.entries()) },
        { status: 200 }
    );
}