import { createClient } from "@/lib/supabase/server";
import { getCurrentManager } from "@/lib/managers";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { TrashTalkForm } from "@/components/TrashTalkForm";
import { DeletePostButton } from "@/components/DeletePostButton";

interface PostRow {
  id: string;
  body: string | null;
  image_path: string | null;
  created_at: string;
  manager_id: string;
  manager: { display_name: string } | null;
}

function imageUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trash-talk/${path}`;
}

export default async function TrashTalkPage() {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);

  const { data } = await supabase
    .from("trash_talk_posts")
    .select("id, body, image_path, created_at, manager_id, manager:managers(display_name)")
    .order("created_at", { ascending: false });
  const posts = (data ?? []) as unknown as PostRow[];

  return (
    <div>
      <PageHeader
        title="Trash Talk"
        subtitle="The wall of shame — post the worst trade offers you've been sent, for all to mock."
      />

      {manager ? (
        <TrashTalkForm />
      ) : (
        <div className="rounded-md border border-line bg-surface p-5 text-sm text-muted">
          Your login isn&apos;t linked to a manager yet — ask your commissioner
          to add your email.
        </div>
      )}

      <div className="mt-8 space-y-4">
        {posts.length === 0 && (
          <p className="text-sm text-muted">
            Nothing here yet. Be the first to expose a bad offer.
          </p>
        )}

        {posts.map((post) => (
          <div
            key={post.id}
            className="rounded-md border border-line bg-surface p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Nameplate alias={post.manager?.display_name ?? "—"} size="sm" />
                <span className="tabular text-xs text-muted">
                  {new Date(post.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {manager?.id === post.manager_id && (
                <DeletePostButton postId={post.id} />
              )}
            </div>

            {post.body && (
              <p className="mt-3 whitespace-pre-wrap text-sm text-ink">
                {post.body}
              </p>
            )}
            {post.image_path && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl(post.image_path)}
                alt=""
                className="mt-3 max-h-[32rem] w-auto max-w-full rounded-md border border-line object-contain"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
