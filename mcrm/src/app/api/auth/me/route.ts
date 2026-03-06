import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "認証されていません。" },
        { status: 401 }
      );
    }

    // Look up admin_users record
    const { data: adminUser, error: adminError } = await supabase
      .from("admin_users")
      .select("*")
      .eq("auth_user_id", user.id)
      .single();

    if (adminError || !adminUser) {
      return NextResponse.json(
        { error: "管理者アカウントが見つかりません。" },
        { status: 403 }
      );
    }

    if (!adminUser.is_active) {
      return NextResponse.json(
        { error: "このアカウントは無効化されています。" },
        { status: 403 }
      );
    }

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
