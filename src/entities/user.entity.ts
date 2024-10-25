import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({tableName: "users"})
export class User {
   @PrimaryKey()
   id!: number;

   @Property()
   nickname?: string;

   @Property({type: 'VARCHAR(16)'})
   phrase_hex!: string;
}
