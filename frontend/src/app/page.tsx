export default function Home() {
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">CodeIt</h1>
      <a className="underline" href="/auth/login">Login</a>
      <a className="underline block" href="/auth/signup">Signup</a>
      <a className="underline block" href="/playground">Playground</a>
    </main>
  );
}