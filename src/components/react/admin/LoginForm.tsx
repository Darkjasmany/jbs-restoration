import { useState, type SyntheticEvent } from 'react';
import { Button } from '../ui/Button';

const MESSAGES: Record<string, string> = {
  invalid: 'Incorrect email or password.',
  forbidden: 'This account does not have access to the admin area.',
};

const inputCls = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

export function LoginForm({ initialError }: { initialError?: string }) {
  const [error, setError] = useState<string | null>(initialError ? (MESSAGES[initialError] ?? null) : null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
      });
      if (res.ok) {
        location.href = '/admin';
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(MESSAGES[body.error ?? ''] ?? 'Could not sign in. Try again.');
    } catch {
      setError('Network error. Check your connection and try again.');
    }
    setLoading(false);
  }

  return (
    <form method="post" action="/api/auth/login" onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h1 className="text-xl font-bold">Sign in</h1>
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <label className="block text-sm font-medium">
        Email
        <input name="email" type="email" required autoComplete="username" className={inputCls} />
      </label>
      <label className="block text-sm font-medium">
        Password
        <input name="password" type="password" required autoComplete="current-password" className={inputCls} />
      </label>
      <Button type="submit" loading={loading} className="w-full">
        Sign in
      </Button>
    </form>
  );
}
