'use client';

export default function Error({ error }: { error: Error }) {
    return (
        <main className="mx-auto max-w-3xl p-6">
            <p className="text-red-600 font-medium">Failed to load album.</p>
            <pre className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-xs overflow-auto">
        {error.message}
      </pre>
            <a href="/frontend/public" className="inline-block mt-4 text-blue-600 underline">Back to home</a>
        </main>
    );
}
