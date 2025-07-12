import { db } from '../../../db/db.js'

let select_org_id_by_user_sql = /* sql */ `
-- org creator
select id from org where creator_id = :user_id
union
-- team manager
select org_id from team where manager_id = :user_id
union
-- team member
select org_id
from team_member
inner join team on team.id = team_member.team_id
where user_id = :user_id
`

export let select_org_list_by_user = db
  .prepare<{ user_id: number }, number>(
    /* sql */ `
select id
from org
where id in (${select_org_id_by_user_sql})
`,
  )
  .pluck()

export let is_org_member = db
  .prepare<{ org_id: number; user_id: number }, boolean>(
    /* sql */ `
select 1
from org
where id = :org_id
  and id in (${select_org_id_by_user_sql})
`,
  )
  .pluck()

let select_member_id_by_org_sql = /* sql */ `
 -- org creator
select org.creator_id as id
from org
where org.id = :org_id

union
-- team manager
select team.manager_id as id
from team
where team.org_id = :org_id

union
-- team member
select team_member.user_id as id
from team_member
inner join team on team.id = team_member.team_id
where team.org_id = :org_id
`

let select_member_id_by_team_sql = /* sql */ `
-- team manager
select team.manager_id as id
from team
where team.id = :team_id

union
-- team member
select user_id as id
from team_member
where team_id = :team_id
`

export let select_new_member_list_by_team = db
  .prepare<{ org_id: number; team_id: number }, number>(
    /* sql */ `
with org_member_list as (${select_member_id_by_org_sql})
   , team_member_list as (${select_member_id_by_team_sql})
select id from org_member_list
where id not in (select id from team_member_list)
`,
  )
  .pluck()
