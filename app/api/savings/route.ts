import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

const PREMIUM_UID = '8GM1OOIkAWWBKEiKbtlRWgSZQgE3';

// Helper to authenticate request using verified Firebase ID token
async function getAuthenticatedUID(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid === PREMIUM_UID ? PREMIUM_UID : null;
  } catch {
    // Fallback if legacy cookie is present
    return token === PREMIUM_UID ? PREMIUM_UID : null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUID(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const snapshot = await adminDb
      .collection('savings')
      .where('userId', '==', userId)
      .get();

    const items: { id: string; userId: string; month: string; amount: number; notes: string }[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        userId: data.userId || '',
        month: data.month || '',
        amount: Number(data.amount || 0),
        notes: data.notes || '',
      });
    });

    // Sort in-memory by month descending to avoid requiring a Firestore composite index
    items.sort((a, b) => b.month.localeCompare(a.month));

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching savings in API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUID(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { month, amount, notes } = await request.json();

    if (!month || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Invalid savings details' }, { status: 400 });
    }

    const docRef = await adminDb.collection('savings').add({
      userId,
      month,
      amount: Number(amount),
      notes: (notes || '').trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error('Error adding savings in API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUID(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing savings ID' }, { status: 400 });
    }

    const docRef = adminDb.collection('savings').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (docSnap.data()?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await docRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting savings in API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
