import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">MCRM</h1>
      <p className="mt-2 text-muted-foreground">
        AI搭載型 独自LINEマーケティングシステム
      </p>
      <Link
        href="/login"
        className="mt-8 rounded-md bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
      >
        管理画面へログイン
      </Link>
    </div>
  );
}
