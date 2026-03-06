import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "メールアドレスとパスワードを入力してください。" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Sign in with Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "メールアドレスまたはパスワードが正しくありません。" },
        { status: 401 }
      );
    }

    // Look up admin_users record
    const { data: adminUser, error: adminError } = await supabase
      .from("admin_users")
      .select("*")
      .eq("auth_user_id", authData.user.id)
      .single();

    if (adminError || !adminUser) {
      // User exists in auth but not in admin_users - sign them out
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "管理者アカウントが見つかりません。" },
        { status: 403 }
      );
    }

    if (!adminUser.is_active) {
      // User is inactive - sign them out
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "このアカウントは無効化されています。管理者にお問い合わせください。" },
        { status: 403 }
      );
    }

    // Update last_login_at
    await supabase
      .from("admin_users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", adminUser.id);

    return NextResponse.json({
      user: adminUser,
    });
  } catch {
    return NextResponse.json(
      { error: "サーバーエラーが発生しました。" },
      { status: 500 }
    );
  }
}
