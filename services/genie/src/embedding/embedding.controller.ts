import { Body, Controller, Post } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';

@Controller('genie')
export class EmbeddingController {
  constructor(private readonly embedding: EmbeddingService) {}

  @Post('embed-post')
  embedPost(@Body('postId') postId: string) {
    return this.embedding.embedPost(postId).then(() => ({ ok: true }));
  }

  @Post('embed-comment')
  embedComment(@Body('commentId') commentId: string) {
    return this.embedding.embedComment(commentId).then(() => ({ ok: true }));
  }
}
