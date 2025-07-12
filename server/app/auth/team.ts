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
