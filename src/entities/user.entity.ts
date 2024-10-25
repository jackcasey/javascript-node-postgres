import { Entity, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';
import { Collection } from '@mikro-orm/core';
import { Day } from './day.entity';

@Entity({tableName: "users"})
export class User {
   @PrimaryKey()
   id!: number;

   @OneToMany({mappedBy: 'user'})
   days = new Collection<Day>(this);

   @Property()
   nickname?: string;

   @Property({type: 'VARCHAR(16)'})
   phrase_hex!: string;
}
