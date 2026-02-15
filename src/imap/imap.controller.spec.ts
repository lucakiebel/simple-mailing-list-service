import { Test, TestingModule } from '@nestjs/testing';
import { ImapController } from './imap.controller';

describe('ImapController', () => {
  let controller: ImapController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImapController],
    }).compile();

    controller = module.get<ImapController>(ImapController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
