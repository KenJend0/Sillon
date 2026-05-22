import { User } from "lucide-react";

interface UserAvatarProps {
  userId: string;
  src?: string | null;
  size?: number;
  className?: string;
}

/**
 * Avatar utilisateur — affiche la vraie photo (src) si disponible, sinon SVG déterministe.
 * Size in pixels (default: 18)
 */
import Image from "next/image";

export function UserAvatar({ userId, src, size = 18, className = "" }: UserAvatarProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className={`flex-shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex-shrink-0 rounded-full bg-background-tertiary flex items-center justify-center ${className}`}
      style={{ width: size, height: size, maxWidth: "100%", maxHeight: "100%" }}
    >
      <User size={Math.round(size * 0.45)} className="text-text-tertiary" />
    </div>
  );
}


