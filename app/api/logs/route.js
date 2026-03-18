export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('logs').select('*')
      .order('timestamp', { ascending: false })
      .limit(300);
    if (error) return NextResponse.json([], { status: 200 });
    return NextResponse.json(data || []);
  } catch(err) {
    return NextResponse.json([], { status: 200 });
  }
}
