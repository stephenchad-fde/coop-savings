import { Module } from '@nestjs/common';
import { CoopsService } from './coops.service';
import { CoopsController } from './coops.controller';

@Module({
  providers: [CoopsService],
  controllers: [CoopsController],
  exports: [CoopsService],
})
export class CoopsModule {}