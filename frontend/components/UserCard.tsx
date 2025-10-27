import Link from "next/link";

type User = {
    id: string; username: string; display_name: string; picture_url?: string;
    is_following?: boolean; is_me?: boolean;
};

export default function UserCard({
                                     user, onFollowToggle, currentUserId,
                                 }: { user: User; onFollowToggle?: (id: string, next?: boolean) => void; currentUserId?: string | null; }) {
    const hideButton = user.is_me || (!!currentUserId && user.id === currentUserId);
    return (
        <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-3">
                <img src={user.picture_url || "/default-avatar.png"} alt={user.display_name} className="w-10 h-10 rounded-full" />
                <div>
                    <Link href={`/u/${user.username || user.id}`} className="font-medium hover:underline">
                        {user.display_name}
                    </Link>
                    <div className="text-sm text-gray-500">@{user.username}</div>
                </div>
            </div>
            {!hideButton && onFollowToggle && (
                <button
                    onClick={() => onFollowToggle(user.id, !user.is_following)}
                    className={`px-3 py-1 text-sm rounded ${
                        user.is_following ? "bg-gray-300 text-black hover:bg-gray-400" : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                >
                    {user.is_following ? "Unfollow" : "Follow"}
                </button>
            )}
        </div>
    );
}
