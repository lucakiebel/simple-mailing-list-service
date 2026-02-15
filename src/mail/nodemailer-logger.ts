import { Logger } from '@nestjs/common';

export class NodemailerNestLogger {
  constructor(private readonly logger: Logger) {}

  info(...args: any[]) {
    this.logger.log(JSON.stringify(args));
  }

  debug(...args: any[]) {
    this.logger.debug(JSON.stringify(args));
  }

  warn(...args: any[]) {
    this.logger.warn(JSON.stringify(args));
  }

  error(...args: any[]) {
    this.logger.error(JSON.stringify(args));
  }
}
