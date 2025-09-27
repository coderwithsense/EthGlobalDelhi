// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// import { paymentMiddleware } from 'x402-next';

// // Create the X402 payment middleware instance
// const x402Middleware = paymentMiddleware(
//     "0x07E4E4991AcB95f555bBC4b17EB92D6587a415E3", // Your receiving wallet
//     {
//         '/api/premium': {
//             price: '$0.001',
//             network: "polygon-amoy", // or "polygon" for mainnet
//             config: {
//                 description: 'Access to premium API endpoint'
//             }
//         },
//         '/api/data': {
//             price: '$0.01',
//             network: "polygon-amoy",
//             config: {
//                 description: 'Get protected data'
//             }
//         }
//     },
//     { url: "https://x402.polygon.technology" } // Custom facilitator for Polygon
// );

export function middleware(request: NextRequest) {
    // Define protected routes for authentication
    const protectedRoutes = ['/dashboard', '/profile', '/settings'];
    const authRoutes = ['/login', '/register'];

    // Define X402 payment-protected API routes
    const paymentProtectedRoutes = ['/api/premium', '/api/data'];

    const { pathname } = request.nextUrl;

    // Check route types
    const isProtectedRoute = protectedRoutes.some(route =>
        pathname.startsWith(route)
    );

    const isAuthRoute = authRoutes.some(route =>
        pathname.startsWith(route)
    );

    const isPaymentProtectedRoute = paymentProtectedRoutes.some(route =>
        pathname.startsWith(route)
    );

    // // Handle X402 payment-protected routes FIRST
    // if (isPaymentProtectedRoute) {
    //     return x402Middleware(request);
    // }

    // Get authentication status
    const isAuthenticated = request.headers.get('authenticated') === 'true';

    // Handle authentication logic for web routes
    if (isProtectedRoute && !isAuthenticated) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (isAuthRoute && isAuthenticated) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Redirect root to login
    if (pathname === '/') {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - uploads (uploaded files)
         */
        '/((?!_next/static|_next/image|favicon.ico|uploads).*)',
    ],
};
