import { db } from '../../../db/db.js'

export let select_org_list_by_user = db
  .prepare<{ user_id: number }, number>(
    /* sql */ `
select
  distinct org.id
from org
left join team on team.org_id = org.id
left join team_member on team_member.team_id = team.id
where org.creator_id = :user_id
   or team_member.user_id = :user_id
`,
  )
  .pluck()

export let is_org_member = db
  .prepare<{ org_id: number; user_id: number }, boolean>(
    /* sql */ `
select
  count(org.id)
from org
left join team on team.org_id = org.id
left join team_member on team_member.team_id = team.id
where org.id = :org_id
  and (team_member.user_id = :user_id or org.creator_id = :user_id)
`,
  )
  .pluck()
