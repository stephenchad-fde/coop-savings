import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CoopsService } from './coops.service';

@Controller('coops')
export class CoopsController {
  constructor(private coops: CoopsService) {}

  @Post()
  create(@Body() body: { name: string }) {
    return this.coops.createCoop(body.name);
  }

  @Get()
  list() {
    return this.coops.listCoops();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.coops.getCoop(id);
  }

  @Post(':id/members')
  addMember(
    @Param('id') id: string,
    @Body() body: { full_name: string; phone: string },
  ) {
    return this.coops.addMember(id, body.full_name, body.phone);
  }

  @Get(':id/members')
  listMembers(@Param('id') id: string) {
    return this.coops.listMembers(id);
  }
}