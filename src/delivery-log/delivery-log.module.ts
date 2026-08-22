import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryLog } from './delivery-log.entity';
import { DeliveryLogService } from './delivery-log.service';
import { DeliveryLogController } from './delivery-log.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryLog])],
  providers: [DeliveryLogService],
  controllers: [DeliveryLogController],
  exports: [DeliveryLogService],
})
export class DeliveryLogModule {}
