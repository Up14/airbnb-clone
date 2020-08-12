import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import AdmZip from 'adm-zip';
import { StorageService } from '@codebrew/nestjs-storage';
import { EntityService } from '../entity/entity.service';
import { QUEUE_NAME } from './constants';
import { BuildRequest } from './dto/BuildRequest';
import { Build } from './dto/Build';
import { PrismaService } from 'src/services/prisma.service';
import { CreateBuildArgs } from './dto/CreateBuildArgs';
import { FindManyBuildArgs } from './dto/FindManyBuildArgs';
import { getBuildFilePath, getAll } from './storage';
import { EnumBuildStatus } from './dto/EnumBuildStatus';

/**
 * @todo rename to BuildService
 */
@Injectable()
export class BuildService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly entityService: EntityService,
    @InjectQueue(QUEUE_NAME) private queue: Queue<BuildRequest>
  ) {}

  async findMany(args: FindManyBuildArgs): Promise<Build[]> {
    return this.prisma.build.findMany(args);
  }

  async download(buildId: string): Promise<Buffer> {
    const filePath = getBuildFilePath(buildId);
    const disk = this.storageService.getDisk();
    const response = await disk.getBuffer(filePath);
    return response.content;
  }

  async create(args: CreateBuildArgs): Promise<Build> {
    const build = await this.prisma.build.create({
      ...args,
      data: { ...args.data, status: EnumBuildStatus.Queued }
    });
    await this.queue.add({ id: build.id });
    return build;
  }
}
