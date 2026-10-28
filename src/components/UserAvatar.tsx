import { useImageUrl, type Member } from "@/lib/data";
import { cn } from "@/lib/utils";

export function UserAvatar({ member, size = 24, className }: { member?: Pick<Member, "nome" | "avatar_url"> | null | undefined; size?: number; className?: string }) {
  const url = useImageUrl(member?.avatar_url);
  const initials = (member?.nome ?? "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      title={member?.nome}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-semibold text-secondary-foreground ring-2 ring-card", className)}
    >
      {url ? <img src={url} alt={member?.nome} className="h-full w-full object-cover" /> : initials}
    </span>
  );
}

export function AvatarStack({ members, size = 22 }: { members: Member[]; size?: number }) {
  return (
    <div className="flex -space-x-1.5">
      {members.slice(0, 4).map((m) => (
        <UserAvatar key={m.id} member={m} size={size} />
      ))}
      {members.length > 4 && (
        <span style={{ width: size, height: size }} className="inline-flex items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground ring-2 ring-card">
          +{members.length - 4}
        </span>
      )}
    </div>
  );
}
