import { Controller, Get, Param, Query } from '@nestjs/common';
import { DeliveryLogService } from './delivery-log.service';
import { DeliveryStatus } from './delivery-log.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('delivery-log')
@ApiBearerAuth()
export class DeliveryLogController {
  constructor(private readonly service: DeliveryLogService) {}

  @Get()
  @Roles('admin')
  findByFilter(
    @Query('listId') listId?: string,
    @Query('status') status?: DeliveryStatus,
    @Query('recipient') recipient?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.findByFilter({
      listId: listId ? Number(listId) : undefined,
      status,
      recipientEmail: recipient,
      dateFrom,
      dateTo,
    });
  }

  @Get('stats')
  @Roles('admin')
  getStats() {
    return this.service.getStats();
  }
}
