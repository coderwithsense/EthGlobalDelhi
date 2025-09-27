// app/api/user/route.ts
import { NextRequest, NextResponse } from 'next/server';

// In-memory storage (replace with database in production)
const users = new Map<string, any>();

export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('user-id');

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        const user = users.get(userId);

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}