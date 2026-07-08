import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      return NextResponse.json(
        {
          error: 'Supabase Service Role Key is missing. Please add SUPABASE_SERVICE_ROLE_KEY to your admin/.env.local file.',
        },
        { status: 500 }
      );
    }

    // Initialize clients
    // 1. Anon client for verifying the requester's JWT token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization token.' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: { user: requester }, error: tokenError } = await anonClient.auth.getUser(token);

    if (tokenError || !requester) {
      return NextResponse.json({ error: 'Invalid authentication session.' }, { status: 401 });
    }

    // 2. Fetch the requester's profile to check role
    const { data: requesterProfile, error: profileError } = await anonClient
      .from('profiles')
      .select('role')
      .eq('id', requester.id)
      .single();

    if (profileError || !requesterProfile || (requesterProfile.role !== 'admin' && requesterProfile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Access denied. You do not have permission to add users.' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { email, password, fullName, role, userType } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Full name, email, and password are required.' }, { status: 400 });
    }

    // Enforce role creation limits
    // Standard admins can only create 'user' and 'agent'
    if (requesterProfile.role === 'admin' && (role === 'admin' || role === 'super_admin')) {
      return NextResponse.json(
        { error: 'Standard administrators are not allowed to create admin or super admin accounts.' },
        { status: 403 }
      );
    }

    // Enforce valid roles
    const VALID_ROLES = ['user', 'agent', 'admin', 'super_admin'];
    if (role && !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid user role specified.' }, { status: 400 });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 3. Create the user in auth.users (bypassing confirmation emails)
    const { data: newAuthUser, error: createAuthError } = await serviceClient.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (createAuthError) {
      return NextResponse.json({ error: createAuthError.message }, { status: 400 });
    }

    const newUserId = newAuthUser.user.id;

    // 4. Create/Upsert the user in public.profiles
    const { data: newProfile, error: insertProfileError } = await serviceClient
      .from('profiles')
      .upsert({
        id: newUserId,
        full_name: fullName,
        role: role || 'user',
        user_type: userType || 'individual',
        eco_coins_balance: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertProfileError) {
      // Clean up the auth user if profile insertion failed
      await serviceClient.auth.admin.deleteUser(newUserId);
      return NextResponse.json({ error: `Failed to create profile: ${insertProfileError.message}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: newProfile }, { status: 201 });
  } catch (err) {
    console.error('API User Creation error:', err);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      return NextResponse.json(
        {
          error: 'Supabase Service Role Key is missing. Please add SUPABASE_SERVICE_ROLE_KEY to your admin/.env.local file.',
        },
        { status: 500 }
      );
    }

    // Initialize clients
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization token.' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: { user: requester }, error: tokenError } = await anonClient.auth.getUser(token);

    if (tokenError || !requester) {
      return NextResponse.json({ error: 'Invalid authentication session.' }, { status: 401 });
    }

    // Fetch the requester's profile to check role
    const { data: requesterProfile, error: profileError } = await anonClient
      .from('profiles')
      .select('role')
      .eq('id', requester.id)
      .single();

    if (profileError || !requesterProfile || (requesterProfile.role !== 'admin' && requesterProfile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Access denied. You do not have permission to delete users.' }, { status: 403 });
    }

    // Get user ID to delete from query string
    const { searchParams } = new URL(request.url);
    const userIdToDelete = searchParams.get('id');

    if (!userIdToDelete) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    if (userIdToDelete === requester.id) {
      return NextResponse.json({ error: 'To prevent lockout, you cannot delete your own account.' }, { status: 400 });
    }

    // Fetch target user role
    const { data: targetProfile, error: targetError } = await anonClient
      .from('profiles')
      .select('role')
      .eq('id', userIdToDelete)
      .single();

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: 'Target user profile not found.' }, { status: 404 });
    }

    // Enforce role delete limits
    if (requesterProfile.role === 'admin' && (targetProfile.role === 'admin' || targetProfile.role === 'super_admin')) {
      return NextResponse.json(
        { error: 'Standard administrators are not allowed to delete admin or super admin accounts.' },
        { status: 403 }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Delete the auth user (automatically cascades to profiles table)
    const { error: deleteAuthError } = await serviceClient.auth.admin.deleteUser(userIdToDelete);

    if (deleteAuthError) {
      return NextResponse.json({ error: deleteAuthError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('API User Deletion error:', err);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
