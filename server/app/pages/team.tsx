import { o } from '../jsx/jsx.js'
import { ResolvedPageRoute, Routes } from '../routes.js'
import { apiEndpointTitle, title } from '../../config.js'
import Style from '../components/style.js'
import {
  Context,
  DynamicContext,
  getContextFormBody,
  throwIfInAPI,
  WsContext,
} from '../context.js'
import { mapArray } from '../components/fragment.js'
import { object, string } from 'cast.ts'
import { Link, Redirect } from '../components/router.js'
import { renderError, showError } from '../components/error.js'
import {
  makeTranslate,
  Locale,
  makeThrows,
  Title,
} from '../components/locale.js'
import { Org, proxy, Team } from '../../../db/proxy.js'
import { Script } from '../components/script.js'
import { toSlug } from '../format/slug.js'
import { BackToLink } from '../components/back-to-link.js'
import { getAuthUser, getAuthUserId } from '../auth/user.js'
import { is_org_member } from '../auth/org.js'
import { is_team_member, select_team_by_org } from '../auth/team.js'
import { toRouteUrl } from '../../url.js'
import { Node } from '../jsx/types.js'
import { getDisplayName } from './profile.js'
import { EarlyTerminate } from '../../exception.js'
import { removeNewlines } from '../format/string.js'
import { errorRoute } from '../api-route.js'
import { filter } from 'better-sqlite3-proxy'

let style = Style(/* css */ `
#Team {

}
`)

function OrgPage(
  attrs: { org: Org; user_id: number; title: Node },
  context: DynamicContext,
) {
  let { org, user_id, title } = attrs
  let team_id_list = select_team_by_org.all({
    org_id: org.id!,
    user_id,
  })
  let rename_url = toRouteUrl(routes, '/org/:org_slug/rename', {
    params: {
      org_slug: org.id + '-' + toSlug(org.name),
    },
  })
  return (
    <>
      {style}
      <div id="OrgPage">
        <h1 id="org_name">{org.name}</h1>
        <button
          id="rename_button"
          onclick={removeNewlines(`
              rename_form.hidden = false;
              rename_button.hidden = true;
              new_org_name.selectionStart = new_org_name.value.length;
              new_org_name.selectionEnd = new_org_name.value.length;
              new_org_name.focus();
            `)}
        >
          <Locale
            en="Change Org Name"
            zh_hk="更改組織名稱"
            zh_cn="更改组织名称"
          />
        </button>
        <form
          id="rename_form"
          method="POST"
          action={rename_url}
          onsubmit="emitForm(event)"
          hidden
        >
          <div style="margin-block-end: 0.5rem">
            <input
              value={org.name}
              id="new_org_name"
              name="name"
              minlength="1"
              maxlength="50"
            />
          </div>
          <button type="submit">
            <Locale en="Save" zh_hk="保存" zh_cn="保存" />
          </button>
        </form>

        {team_id_list.length === 0 && (
          <p>
            <Locale
              en="This org does not have any team."
              zh_hk="這個組織沒有團隊。"
              zh_cn="这个组织没有团队。"
            />
          </p>
        )}
        <h2>
          <Locale en="Team List" zh_hk="團隊列表" zh_cn="团队列表" />
        </h2>
        <ul>
          {mapArray(team_id_list, team_id => {
            let team = proxy.team[team_id]
            let by =
              team.manager_id == user_id ? (
                <Locale en="manager" zh_hk="管理員" zh_cn="管理员" />
              ) : (
                <Locale en="by" zh_hk="由" zh_cn="由" /> +
                ' ' +
                getDisplayName(team.manager!)
              )
            return (
              <li>
                <Link href={teamUrl(team)}>{team.name}</Link> ({by})
              </li>
            )
          })}
        </ul>
        <Link href={addTeamUrl(org)}>
          <button>
            <Locale en="Create Team" zh_hk="創建團隊" zh_cn="创建团队" />
          </button>
        </Link>
      </div>
    </>
  )
}

let resolveOrgPage = resolveOrg({
  title: <Locale en="Team List" zh_hk="團隊列表" zh_cn="团队列表" />,
  description: (
    <Locale
      en="List of teams in the org"
      zh_hk="組織的團隊列表"
      zh_cn="组织的团队列表"
    />
  ),
  action: (
    <Locale
      en="access the team list"
      zh_hk="存取團隊列表"
      zh_cn="存取团队列表"
    />
  ),
  api: ({ org, user_id }) => {
    let org_name = org.name

    let title = (
      <Locale
        en={`${org_name} - Team List`}
        zh_hk={`${org_name} - 團隊列表`}
        zh_cn={`${org_name} - 团队列表`}
      />
    )
    return {
      title: <Title t={title} />,
      description: (
        <Locale
          en={`List of teams in ${org_name}`}
          zh_hk={`${org_name} 的團隊列表`}
          zh_cn={`${org_name} 的团队列表`}
        />
      ),
      node: <OrgPage org={org} user_id={user_id} title={title} />,
    }
  },
})

let renameOrgParser = object({
  name: string({ minLength: 1, maxLength: 50 }),
})

let resolveRenameOrg = resolveOrg({
  title: apiEndpointTitle,
  description: 'change org name by creator',
  action: (
    <Locale
      en="change the org name"
      zh_hk="更改組織名稱"
      zh_cn="更改组织名称"
    />
  ),
  api: ({ org, user_id }, context: Context) => {
    let title = apiEndpointTitle
    let description = 'change org name by creator'
    let ws = context.type == 'ws' ? context.ws : null
    let translate = makeTranslate(context)
    if (org.creator_id != user_id) {
      let error = translate({
        en: 'You are not the creator of this org',
        zh_hk: '您不是這個組織的創建者',
        zh_cn: '您不是这个组织的创建者',
      })
      if (ws) {
        ws.send(showError(error))
        throw EarlyTerminate
      } else {
        return errorRoute(error, context, title, description)
      }
    }
    let body = getContextFormBody(context)
    let input = renameOrgParser.parse(body)
    org.name = input.name
    if (ws) {
      ws.send([
        'eval',
        /* javascript */ `
rename_form.hidden = true
rename_button.hidden = false
org_name.textContent = ${JSON.stringify(input.name)}
`,
      ])
      throw EarlyTerminate
    } else {
      return {
        title,
        description,
        node: <Redirect href={orgUrl(org)} />,
      }
    }
  },
})

function TeamPage(attrs: { team: Team; title: Node }, context: DynamicContext) {
  let { team, title } = attrs
  let org = team.org!
  let rename_url = toRouteUrl(routes, '/org/:org_slug/team/:team_slug/rename', {
    params: {
      org_slug: org.id + '-' + toSlug(org.name),
      team_slug: team.id + '-' + toSlug(team.name),
    },
  })
  let members = filter(proxy.team_member, { team_id: team.id! })
  return (
    <>
      <div id="TeamPage">
        <h1>
          <span>{org.name}</span> - <span id="team_name">{team.name}</span>
        </h1>
        <button
          id="rename_button"
          onclick={removeNewlines(`
              rename_form.hidden = false;
              rename_button.hidden = true;
              new_team_name.selectionStart = new_team_name.value.length;
              new_team_name.selectionEnd = new_team_name.value.length;
              new_team_name.focus();
            `)}
        >
          <Locale
            en="Change Team Name"
            zh_hk="更改團隊名稱"
            zh_cn="更改团队名称"
          />
        </button>
        <form
          id="rename_form"
          method="POST"
          action={rename_url}
          onsubmit="emitForm(event)"
          hidden
        >
          <div style="margin-block-end: 0.5rem">
            <input
              value={team.name}
              id="new_team_name"
              name="name"
              minlength="1"
              maxlength="50"
            />
          </div>
          <button type="submit">
            <Locale en="Save" zh_hk="保存" zh_cn="保存" />
          </button>
        </form>
        <h2>
          <Locale en="Team Members" zh_hk="團隊成員" zh_cn="团队成员" />
        </h2>
        {members.length === 0 && (
          <p>
            <Locale
              en="No team members"
              zh_hk="沒有團隊成員"
              zh_cn="没有团队成员"
            />
          </p>
        )}
        <ul>
          {mapArray(members, member => {
            let user = member.user!
            return <li>{getDisplayName(user)}</li>
          })}
        </ul>
        <button>
          <Locale en="Add Member" zh_hk="添加成員" zh_cn="添加成员" />
        </button>
        <form
          id="add_member_form"
          method="POST"
          action={addMemberSubmitUrl(team)}
        >
          <input type="text" name="user_id" />
          <button type="submit">
            <Locale en="Add" zh_hk="添加" zh_cn="添加" />
          </button>
        </form>
      </div>
    </>
  )
}

let resolveTeamPage = resolveTeam({
  title: <Locale en="Team" zh_hk="團隊" zh_cn="团队" />,
  description: (
    <Locale
      en="List of team members and tasks"
      zh_hk="團隊成員和任務列表"
      zh_cn="团队成员和任务列表"
    />
  ),
  action: (
    <Locale
      en="access the team details"
      zh_hk="存取團隊詳情"
      zh_cn="存取团队详情"
    />
  ),
  api: ({ team, user_id }) => {
    let org = team.org!
    let org_name = org.name
    let t = `${org_name} - ${team.name}`
    return {
      title: title(t),
      description: (
        <Locale
          en={`List of team members and tasks in ${org_name}`}
          zh_hk={`${org_name} 的團隊成員和任務列表`}
          zh_cn={`${org_name} 的团队成员和任务列表`}
        />
      ),
      node: <TeamPage team={team} title={t} />,
    }
  },
})

let renameTeamParser = object({
  name: string({ minLength: 1, maxLength: 50 }),
})

let resolveRenameTeam = resolveTeam({
  title: apiEndpointTitle,
  description: 'change team name by manager',
  action: (
    <Locale
      en="change the team name"
      zh_hk="更改團隊名稱"
      zh_cn="更改团队名称"
    />
  ),
  api: ({ team, user_id }, context: Context) => {
    let title = apiEndpointTitle
    let description = 'change team name by manager'
    let ws = context.type == 'ws' ? context.ws : null
    let translate = makeTranslate(context)
    if (team.manager_id != user_id) {
      let error = translate({
        en: 'You are not the manager of this team',
        zh_hk: '您不是這個團隊的管理員',
        zh_cn: '您不是这个团队的管理员',
      })
      if (ws) {
        ws.send(showError(error))
        throw EarlyTerminate
      } else {
        return errorRoute(error, context, title, description)
      }
    }
    let body = getContextFormBody(context)
    let input = renameTeamParser.parse(body)
    team.name = input.name
    if (ws) {
      ws.send([
        'eval',
        /* javascript */ `
rename_form.hidden = true
rename_button.hidden = false
team_name.textContent = ${JSON.stringify(input.name)}
`,
      ])
      throw EarlyTerminate
    } else {
      return {
        title,
        description,
        node: <Redirect href={teamUrl(team)} />,
      }
    }
  },
})

let addTeamStyle = Style(/* css */ `
#AddTeam .field {
  margin-block-end: 1rem;
}
#AddTeam .field label input {
  display: block;
  margin-block-start: 0.25rem;
}
#AddTeam .field label .hint {
  display: block;
  margin-block-start: 0.25rem;
}
`)
let addTeamScript = Script(/* js */ `
${toSlug}
function updateSlugPreview() {
  let value = addForm.slug.value || addForm.slug.placeholder
  previewSlug.textContent = toSlug(value)
}
updateSlugPreview()
`)

function resolveAddTeamPage(context: DynamicContext): ResolvedPageRoute {
  let throws = makeThrows(context)

  let user_id = getAuthUserId(context)!
  if (!user_id) {
    return {
      title: (
        <Title
          t={<Locale en="Create Team" zh_hk="創建團隊" zh_cn="创建团队" />}
        />
      ),
      description: (
        <Locale
          en="You must be logged in to create a team."
          zh_hk="您必須登入才能創建團隊。"
          zh_cn="您必须登录才能创建团队。"
        />
      ),
      node: (
        <p>
          <Locale
            en={
              <>
                You can create a team after <Link href="/login">login</Link>.
              </>
            }
            zh_hk={
              <>
                您可以在<Link href="/login">登入</Link>後創建團隊。
              </>
            }
            zh_cn={
              <>
                您可以在<Link href="/login">登入</Link>后创建团队。
              </>
            }
          />
        </p>
      ),
    }
  }

  let org_id = parseInt(context.routerMatch?.params.org_slug)
  let org = proxy.org[org_id]
  let isOwner = org?.creator_id == user_id
  let org_name = org.name
  if (!isOwner) {
    throws({
      en: `Please contact the creator of ${org_name} to create a team.`,
      zh_hk: `請聯絡${org_name}的創建者以創建團隊。`,
      zh_cn: `请联系${org_name}的创建者以创建团队。`,
    })
  }

  let title = (
    <Locale
      en={`Create Team in ${org_name}`}
      zh_hk={`在${org_name}創建團隊`}
      zh_cn={`在${org_name}创建团队`}
    />
  )

  return {
    title: <Title t={title} />,
    description: title,
    node: <AddTeamPage org={org} title={title} />,
  }
}

function AddTeamPage(
  attrs: { org: Org; title: Node },
  context: DynamicContext,
) {
  let { org, title } = attrs
  let user = getAuthUser(context)
  if (!user) return <Redirect href="/login" />
  return (
    <>
      {addTeamStyle}
      <div id="AddTeam">
        <h1>{title}</h1>
        <form
          id="addForm"
          method="POST"
          action={addTeamSubmitUrl(org)}
          onsubmit="emitForm(event)"
        >
          <div class="field">
            <label>
              <Locale en="Team Name" zh_hk="團隊名稱" zh_cn="团队名称" />
              *:
              <input name="name" required minlength="1" maxlength="50" />
              <p class="hint">
                <Locale
                  en="(1 to 50 characters)"
                  zh_hk="(1 至 50 個字元)"
                  zh_cn="(1 至 50 个字元)"
                />
              </p>
            </label>
          </div>
          <input
            type="submit"
            value={<Locale en="Submit" zh_hk="提交" zh_cn="提交" />}
          />
          <p>
            <Locale en="Remark:" zh_hk="備註：" zh_cn="备注：" />
            <br />
            <Locale
              en="* mandatory fields"
              zh_hk="* 必填欄位"
              zh_cn="* 必填字段"
            />
          </p>
          <p id="add-message"></p>
        </form>
      </div>
      {addTeamScript}
    </>
  )
}

let addTeamSubmitParser = object({
  name: string({ minLength: 1, maxLength: 50 }),
})

function AddTeamSubmit(attrs: {}, context: DynamicContext) {
  let org_slug = context.routerMatch?.params.org_slug
  try {
    let throws = makeThrows(context)
    let user = getAuthUser(context)!
    if (!user)
      throws({
        en: 'You must be logged in to create a team',
        zh_hk: '您必須登入才能創建團隊',
        zh_cn: '您必須登入才能创建团队',
      })
    let org_id = parseInt(context.routerMatch?.params.org_slug)
    let org = proxy.org[org_id]
    let body = getContextFormBody(context)
    let input = addTeamSubmitParser.parse(body)
    let id = proxy.team.push({
      org_id: org.id!,
      manager_id: user.id!,
      name: input.name,
    })
    return (
      <Redirect
        href={toRouteUrl(routes, '/org/:org_slug/team/add/result', {
          params: { org_slug },
          query: { id },
        })}
      />
    )
  } catch (error) {
    throwIfInAPI(error, '#add-message', context)
    return (
      <Redirect
        href={toRouteUrl(routes, '/org/:org_slug/team/add/result', {
          params: { org_slug },
          query: { error: String(error) },
        })}
      />
    )
  }
}

function AddTeamSubmitResult(attrs: {}, context: DynamicContext) {
  let params = new URLSearchParams(context.routerMatch?.search)
  let error = params.get('error')
  let id = +params.get('id')!
  let team = proxy.team[id]
  let org = team.org!
  return (
    <div>
      {error ? (
        renderError(error, context)
      ) : (
        <>
          <p>
            <Locale
              en={`Your submission is received (#${id}).`}
              zh_hk={`你的提交已收到 (#${id})。`}
              zh_cn={`你的提交已收到 (#${id})。`}
            />
          </p>
          <BackToLink
            href={orgUrl(org)}
            title={<Locale en="Team List" zh_hk="團隊列表" zh_cn="团队列表" />}
          />
        </>
      )}
    </div>
  )
}

function AddTeamMemberSubmit(attrs: {}, context: DynamicContext) {}

function resolveOrg(options: {
  title: string
  description: string
  /** for error message */
  action: Node
  api: (
    attrs: { org: Org; user_id: number },
    context: DynamicContext,
  ) => ResolvedPageRoute
}) {
  return function resolve(context: DynamicContext): ResolvedPageRoute {
    let { title, description, action } = options
    let user_id = getAuthUserId(context)!
    if (!user_id) {
      return {
        title,
        description,
        node: (
          <p>
            <Locale
              en={
                <>
                  You can {action} after <Link href="/login">login</Link>.
                </>
              }
              zh_hk={
                <>
                  您可以在<Link href="/login">登入</Link>後{action}。
                </>
              }
              zh_cn={
                <>
                  您可以在<Link href="/login">登入</Link>后{action}。
                </>
              }
            />
          </p>
        ),
      }
    }
    let org_id = parseInt(context.routerMatch?.params.org_slug)
    let isMember = is_org_member.get({
      org_id,
      user_id,
    })
    if (!isMember) {
      return {
        title,
        description,
        node: (
          <p>
            <Locale
              en="You are not a member of this org"
              zh_hk="您不是這個組織的成員"
              zh_cn="您不是这个组织的成员"
            />
          </p>
        ),
      }
    }
    let org = proxy.org[org_id]
    return options.api({ org, user_id }, context)
  }
}

function resolveTeam(options: {
  title: string
  description: string
  action: Node
  api: (
    attrs: { team: Team; user_id: number },
    context: DynamicContext,
  ) => ResolvedPageRoute
}) {
  return function resolve(context: DynamicContext): ResolvedPageRoute {
    let { title, description, action } = options
    let user_id = getAuthUserId(context)!
    if (!user_id) {
      return {
        title,
        description,
        node: (
          <p>
            <Locale
              en={
                <>
                  You can {action} after <Link href="/login">login</Link>.
                </>
              }
              zh_hk={
                <>
                  您可以在<Link href="/login">登入</Link>後{action}。
                </>
              }
              zh_cn={
                <>
                  您可以在<Link href="/login">登入</Link>后{action}。
                </>
              }
            />
          </p>
        ),
      }
    }
    let team_id = parseInt(context.routerMatch?.params.team_slug)
    let isMember = is_team_member.get({
      team_id,
      user_id,
    })
    if (!isMember) {
      return {
        title,
        description,
        node: (
          <p>
            <Locale
              en="You are not a member of this team"
              zh_hk="您不是這個團隊的成員"
              zh_cn="您不是这个团队的成员"
            />
          </p>
        ),
      }
    }
    let team = proxy.team[team_id]
    return options.api({ team, user_id }, context)
  }
}

let routes = {
  '/org/:org_slug/team': {
    resolve: resolveOrgPage,
  },
  '/org/:org_slug/rename': {
    resolve: resolveRenameOrg,
  },
  '/org/:org_slug/team/add': {
    streaming: false,
    resolve: resolveAddTeamPage,
  },
  '/org/:org_slug/team/add/submit': {
    title: apiEndpointTitle,
    description: 'create a new team under the specified org',
    node: <AddTeamSubmit />,
    streaming: false,
  },
  '/org/:org_slug/team/add/result': {
    title: apiEndpointTitle,
    description: 'result of creating a new team',
    node: <AddTeamSubmitResult />,
    streaming: false,
  },
  '/org/:org_slug/team/:team_slug': {
    resolve: resolveTeamPage,
  },
  '/org/:org_slug/team/:team_slug/rename': {
    resolve: resolveRenameTeam,
  },
  '/org/:org_slug/team/:team_slug/members/add/submit': {
    title: apiEndpointTitle,
    description: 'add a member to a team',
    node: <AddTeamMemberSubmit />,
    streaming: false,
  },
} satisfies Routes

export function orgUrl(org: Org) {
  return toRouteUrl(routes, '/org/:org_slug/team', {
    params: {
      org_slug: org.id + '-' + toSlug(org.name),
    },
  })
}

export function addTeamUrl(org: Org) {
  return toRouteUrl(routes, '/org/:org_slug/team/add', {
    params: {
      org_slug: org.id + '-' + toSlug(org.name),
    },
  })
}

export function addTeamSubmitUrl(org: Org) {
  return toRouteUrl(routes, '/org/:org_slug/team/add/submit', {
    params: {
      org_slug: org.id + '-' + toSlug(org.name),
    },
  })
}

export function teamUrl(team: Team) {
  let org = team.org!
  return toRouteUrl(routes, '/org/:org_slug/team/:team_slug', {
    params: {
      org_slug: org.id + '-' + toSlug(org.name),
      team_slug: team.id + '-' + toSlug(team.name),
    },
  })
}

export function addMemberSubmitUrl(team: Team) {
  return toRouteUrl(
    routes,
    '/org/:org_slug/team/:team_slug/members/add/submit',
    {
      params: {
        org_slug: team.org!.id + '-' + toSlug(team.org!.name),
        team_slug: team.id + '-' + toSlug(team.name),
      },
    },
  )
}

export default { routes }
