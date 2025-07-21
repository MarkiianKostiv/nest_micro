import { AbstractRepository } from '@app/common/database/abstract.repository';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UserDocument } from './models/user.schema';
import { FilterQuery, Model } from 'mongoose';

@Injectable()
export class UsersRepository extends AbstractRepository<UserDocument> {
  protected readonly logger = new Logger(UsersRepository.name);
  constructor(
    @InjectModel(UserDocument.name)
    userModel: Model<UserDocument>,
  ) {
    super(userModel);
  }

  async findOneWithPassword(filter: FilterQuery<UserDocument>) {
    return this.model.findOne(filter).select('+password').exec();
  }
}
