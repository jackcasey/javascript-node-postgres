import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { User } from './user.entity';

@Entity({tableName: "days"})
export class Day {
   @PrimaryKey()
   id!: number;

   @ManyToOne({inversedBy: 'days'})
   user!: User;

   @Property()
   key!: string;

   @Property()
   share_text!: string;
}
