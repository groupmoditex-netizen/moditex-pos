export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { data, error } = await supabase.from('catalogo_config').select('*');
    if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });
    return NextResponse.json({ ok:true, configs: data||[] });
  } catch(err) { return NextResponse.json({ ok:false, error:err.message }, { status:500 }); }
}
