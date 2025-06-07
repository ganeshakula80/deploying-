import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/db'; // Adjust path as necessary
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    // Basic email validation (consider a more robust library for production)
    if (!/\S+@\S+\.\S+/.test(email)) {
        return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
    }

    // Basic password strength (consider a more robust check for production)
    if (password.length < 6) {
        return NextResponse.json({ message: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is NOT set.');
      return NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users'); // Assuming your collection is named 'users'

    // Check if user already exists (case-insensitive email check)
    const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 }); // 409 Conflict
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create new user document
    const newUser = {
      email: email.toLowerCase(), // Store email in lowercase for consistency
      password: hashedPassword,
      createdAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    if (!result.insertedId) {
        throw new Error('Failed to insert new user into database');
    }

    console.log(`New user registered: ${email.toLowerCase()}, ID: ${result.insertedId}`);

    return NextResponse.json(
      {
        message: 'User registered successfully',
        userId: result.insertedId.toString(),
      },
      { status: 201 } // 201 Created
    );

  } catch (error) {
    console.error('Registration API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Internal server error during registration', error: errorMessage }, { status: 500 });
  }
}
