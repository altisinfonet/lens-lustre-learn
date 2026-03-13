import { supabase } from "@/integrations/supabase/client";

/**
 * Creates a wall post when a user updates their profile picture or cover photo.
 * Similar to Facebook's auto-posting behavior.
 */
export async function createProfileUpdatePost(
  userId: string,
  type: "avatar" | "cover",
  imageUrl: string
) {
  const content =
    type === "avatar"
      ? "updated their profile picture."
      : "updated their cover photo.";

  const { error } = await supabase.from("posts").insert({
    user_id: userId,
    content,
    image_url: imageUrl,
    image_urls: [imageUrl],
    privacy: "public",
  });

  if (error) {
    console.error("Failed to create profile update post:", error.message);
  }
}
