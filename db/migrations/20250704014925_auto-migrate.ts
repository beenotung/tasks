import { Knex } from 'knex'

// prettier-ignore
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('org'))) {
    await knex.schema.createTable('org', table => {
      table.increments('id')
      table.text('name').notNullable()
      table.integer('creator_id').unsigned().notNullable().references('user.id')
      table.timestamps(false, true)
    })
  }
  await knex.raw('alter table `team` add column `org_id` integer not null references `org`(`id`)')
}

// prettier-ignore
export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(`team`, table => table.dropColumn(`org_id`))
  await knex.schema.dropTableIfExists('org')
}
