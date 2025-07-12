import { db } from '../../../db/db.js'

export let select_team_by_org = db
  .prepare<{ org_id: number; user_id: number }, number>(
    /* sql */ `
select
  team.id
from team
left join team_member on team_member.team_id = team.id
where team.org_id = :org_id
  and (team_member.user_id = :user_id or team.manager_id = :user_id)
`,
  )
  .pluck()

export let is_team_member = db
  .prepare<{ team_id: number; user_id: number }, boolean>(
    /* sql */ `
select
  count(team.id)
from team
left join team_member on team_member.team_id = team.id
where team.id = :team_id
  and (team_member.user_id = :user_id or team.manager_id = :user_id)
`,
  )
  .pluck()

export let select_member_by_org = db.prepare(/* sql */ `
-- team member
select
  team_member.user_id
from team_member
inner join team on team.id = team_member.team_id
where team.org_id = :org_id

union
-- team manager
select
  team.manager_id
from team
where team.org_id = :org_id

union
-- org creator
select
  org.creator_id
from org
where org.id = :org_id
`)
