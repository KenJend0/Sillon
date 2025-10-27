export default function LoginButton() {
    return (
        <a
            href="/api/auth/google"
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg"
        >
            Se connecter avec Google
        </a>
    );
}
