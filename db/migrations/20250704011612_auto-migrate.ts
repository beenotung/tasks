import { Knex } from 'knex'

// prettier-ignore
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('project'))) {
    await knex.schema.createTable('project', table => {
      table.increments('id')
      table.integer('manager_id').unsigned().notNullable().references('user.id')
      table.text('name').notNullable()
      table.timestamps(false, true)
    })
  }

  if (!(await knex.schema.hasTable('team'))) {
    await knex.schema.createTable('team', table => {
      table.increments('id')
      table.integer('manager_id').unsigned().notNullable().references('user.id')
      table.text('name').notNullable()
      table.timestamps(false, true)
    })
  }

  if (!(await knex.schema.hasTable('team_member'))) {
    await knex.schema.createTable('team_member', table => {
      table.increments('id')
      table.integer('team_id').unsigned().notNullable().references('team.id')
      table.integer('user_id').unsigned().notNullable().references('user.id')
      table.text('nickname').notNullable()
      table.timestamps(false, true)
    })
  }

  if (!(await knex.schema.hasTable('task'))) {
    await knex.schema.createTable('task', table => {
      table.increments('id')
      table.text('title').notNullable()
      table.integer('project_id').unsigned().nullable().references('project.id')
      table.integer('creator_id').unsigned().notNullable().references('user.id')
      table.integer('create_time').notNullable()
      table.integer('start_time').nullable()
      table.integer('finish_time').nullable()
      table.integer('cancel_time').nullable()
      table.timestamps(false, true)
    })
  }

  if (!(await knex.schema.hasTable('task_member'))) {
    await knex.schema.createTable('task_member', table => {
      table.increments('id')
      table.integer('task_id').unsigned().notNullable().references('task.id')
      table.integer('user_id').unsigned().notNullable().references('user.id')
      table.timestamps(false, true)
    })
  }

  if (!(await knex.schema.hasTable('task_submission'))) {
    await knex.schema.createTable('task_submission', table => {
      table.increments('id')
      table.integer('task_id').unsigned().notNullable().references('task.id')
      table.integer('user_id').unsigned().notNullable().references('user.id')
      table.integer('submit_time').notNullable()
      table.integer('review_time').nullable()
      table.timestamps(false, true)
    })
  }

  if (!(await knex.schema.hasTable('meetup'))) {
    await knex.schema.createTable('meetup', table => {
      table.increments('id')
      table.integer('team_id').unsigned().notNullable().references('team.id')
      table.integer('user_id').unsigned().notNullable().references('user.id')
      table.integer('planned_time').notNullable()
      table.timestamps(false, true)
    })
  }
}

// prettier-ignore
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('meetup')
  await knex.schema.dropTableIfExists('task_submission')
  await knex.schema.dropTableIfExists('task_member')
  await knex.schema.dropTableIfExists('task')
  await knex.schema.dropTableIfExists('team_member')
  await knex.schema.dropTableIfExists('team')
  await knex.schema.dropTableIfExists('project')
}
