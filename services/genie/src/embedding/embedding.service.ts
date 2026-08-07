import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { supabaseAdmin } from '../supabase-admin.client';
import { EMBEDDING_PROVIDER, type EmbeddingProvider } from './embedding-provider.interface';

// Phase 65 — the embedding half of the pipeline. Called by the mobile
// client (fire-and-forget) right after CreatePostSheet/comment-insert
// succeed. Delete-side cleanup needs no code here at all — see the
// migration's `on delete cascade` comment.
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(@Inject(EMBEDDING_PROVIDER) private readonly embedder: EmbeddingProvider) {}

  async embedPost(postId: string): Promise<void> {
    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .select('id, neighbourhood_id, caption')
      .eq('id', postId)
      .single();
    if (error || !post) throw new NotFoundException(`post ${postId} not found`);

    const embedding = await this.embedder.embed(post.caption);
    const { error: upsertError } = await supabaseAdmin.from('post_embeddings').upsert({
      post_id: post.id,
      neighbourhood_id: post.neighbourhood_id,
      embedding,
      content_snippet: post.caption,
    });
    if (upsertError) {
      this.logger.error(`Failed to store embedding for post ${postId}: ${upsertError.message}`);
      throw upsertError;
    }
  }

  async embedComment(commentId: string): Promise<void> {
    const { data: comment, error } = await supabaseAdmin
      .from('comments')
      .select('id, text, post:posts!comments_post_id_fkey(neighbourhood_id)')
      .eq('id', commentId)
      .single();
    if (error || !comment) throw new NotFoundException(`comment ${commentId} not found`);

    const post = Array.isArray(comment.post) ? comment.post[0] : comment.post;
    if (!post) throw new NotFoundException(`comment ${commentId} has no parent post`);

    const embedding = await this.embedder.embed(comment.text);
    const { error: upsertError } = await supabaseAdmin.from('comment_embeddings').upsert({
      comment_id: comment.id,
      neighbourhood_id: post.neighbourhood_id,
      embedding,
      content_snippet: comment.text,
    });
    if (upsertError) {
      this.logger.error(`Failed to store embedding for comment ${commentId}: ${upsertError.message}`);
      throw upsertError;
    }
  }
}
