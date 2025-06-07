import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/db'; // Adjusted path
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    // Ensure DATABASE_URL is available (already checked in db.ts, but good for clarity here too)
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is NOT set. Ensure .env.local is configured and the server was restarted.');
      return NextResponse.json({ message: 'Server configuration error: DATABASE_URL missing' }, { status: 500 });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users'); // Assuming your collection is named 'users'

    console.log(`Login attempt for email: ${email}`);

    const user = await usersCollection.findOne({ email: email.toLowerCase() }); // Store and query emails in lowercase for consistency

    if (!user) {
      console.log(`User not found: ${email.toLowerCase()}`);
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // Ensure user.password is a string and not null/undefined
    if (typeof user.password !== 'string') {
        console.error(`Password for user ${email.toLowerCase()} is not a string or is missing.`);
        return NextResponse.json({ message: 'Authentication error' }, { status: 500 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log(`Invalid password for user: ${email.toLowerCase()}`);
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // TODO: Implement session management (e.g., using next-auth or a JWT strategy)
    // For now, just return a success message and user ID (excluding sensitive info like password)
    console.log(`Login successful for user: ${email.toLowerCase()}`);
    return NextResponse.json(
      {
        message: 'Login successful',
        userId: user._id.toString(), // Convert ObjectId to string
        email: user.email 
        // Add any other non-sensitive user data you want to return
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Login API error:', error);
    // Check if the error is a known type or has a message property
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Internal server error during login', error: errorMessage }, { status: 500 });
  }
}
