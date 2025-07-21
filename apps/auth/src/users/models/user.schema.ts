import { AbstractDocument } from '@app/common/database/abstract.schema';
import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';

@Schema({ versionKey: false })
export class UserDocument extends AbstractDocument {
  @Prop()
  email: string;
  @Prop({ select: false })
  password: string;
}

export const UserSchema = SchemaFactory.createForClass(UserDocument);

UserSchema.set('toJSON', {
  transform: (_, ret: Partial<UserDocument>) => {
    delete ret.password;
    return ret;
  },
});
