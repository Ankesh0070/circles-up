import { Body, Controller, Post } from '@nestjs/common';
import { QueryService } from './query.service';

@Controller('genie')
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  @Post('query')
  query(@Body() body: { userId: string; neighbourhoodId: string; query: string }) {
    return this.queryService.query(body.userId, body.neighbourhoodId, body.query);
  }
}
