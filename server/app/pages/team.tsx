import { o } from '../jsx/jsx.js'
import { ResolvedPageRoute, Routes } from '../routes.js'
import { apiEndpointTitle } from '../../config.js'
import Style from '../components/style.js'
import {
  Context,
  DynamicContext,
  getContextFormBody,
  throwIfInAPI,
} from '../context.js'
import { mapArray } from '../components/fragment.js'
import { object, string } from 'cast.ts'
import { Link, Redirect } from '../components/router.js'
import { renderError } from '../components/error.js'
import { Locale, makeThrows, Title } from '../components/locale.js'
import { Org, proxy, Team } from '../../../db/proxy.js'
import { env } from '../../env.js'
import { Script } from '../components/script.js'
import { toSlug } from '../format/slug.js'
import { BackToLink } from '../components/back-to-link.js'
import { getAuthUser, getAuthUserId } from '../auth/user.js'
import { is_org_member } from '../auth/org.js'
import { select_team_by_org } from '../auth/team.js'
import { toRouteUrl } from '../../url.js'
import { Node } from '../jsx/types.js'
import { getDisplayName } from './profile.js'

let style = Style(/* css */ `
#Team {

}
`)

function resolveTeamListPage(context: DynamicContext) {
  let throws = makeThrows(context)

  let user_id = getAuthUserId(context)!
  if (!user_id) {
    return {
      title: <Locale en="Team List" zh_hk="團隊列表" zh_cn="团队列表" />,
      description: (
        <Locale
          en="List of teams in the org"
          zh_hk="組織的團隊列表"
          zh_cn="组织的团队列表"
        />
      ),
      node: (
        <p>
          <Locale
            en={
              <>
                You can access the team list after{' '}
                <Link href="/login">login</Link>.
              </>
            }
            zh_hk={
              <>
                您可以在<Link href="/login">登入</Link>後存取團隊列表。
              </>
            }
            zh_cn={
              <>
                您可以在<Link href="/login">登入</Link>后存取团队列表。
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
    throws({
      en: 'You are not a member of this org',
      zh_hk: '您不是這個組織的成員',
      zh_cn: '您不是这个组织的成员',
    })
  }

  let org = proxy.org[org_id]
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
    node: <TeamListPage org={org} user_id={user_id} title={title} />,
  }
}

function TeamListPage(
  attrs: { org: Org; user_id: number; title: Node },
  context: DynamicContext,
) {
  let { org, user_id, title } = attrs
  let team_id_list = select_team_by_org.all({
    org_id: org.id!,
    user_id,
  })
  return (
    <>
      {style}
      <div id="Team">
        <h1>{title}</h1>
        {team_id_list.length === 0 && (
          <p>
            <Locale
              en="This org does not have any team."
              zh_hk="這個組織沒有團隊。"
              zh_cn="这个组织没有团队。"
            />
          </p>
        )}
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

function resolveTeamPage(context: DynamicContext) {
  let throws = makeThrows(context)
  return <></>
}

let addPageStyle = Style(/* css */ `
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
let addPageScript = Script(/* js */ `
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
      title: <Locale en="Create Team" zh_hk="創建團隊" zh_cn="创建团队" />,
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
    node: <AddPage org={org} title={title} />,
  }
}

function AddPage(attrs: { org: Org; title: Node }, context: DynamicContext) {
  let { org, title } = attrs
  let user = getAuthUser(context)
  if (!user) return <Redirect href="/login" />
  return (
    <>
      {addPageStyle}
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
              <Locale en="Title" zh_hk="標題" zh_cn="標題" />
              *:
              <input name="title" required minlength="3" maxlength="50" />
              <p class="hint">
                <Locale
                  en="(3 to 50 characters)"
                  zh_hk="(3 至 50 個字元)"
                  zh_cn="(3 至 50 个字元)"
                />
              </p>
            </label>
          </div>
          <div class="field">
            <label>
              <Locale en="Short URL Code" zh_hk="短網址碼" zh_cn="短网址码" />
              *:
              <input
                name="slug"
                required
                placeholder="e.g. alice-in-wonderland"
                pattern="(\w|-|\.){1,32}"
                oninput="updateSlugPreview()"
              />
              <p class="hint">
                (
                <Locale
                  en="1 to 32 characters of: "
                  zh_hk="1 至 32 個字元："
                  zh_cn="1 至 32 个字元："
                />
                <code>a-z A-Z 0-9 - _ .</code>)
                <br />
                <Locale
                  en="A unique part of the URL, e.g. "
                  zh_hk="網址的一部分，例如："
                  zh_cn="网址的一部分，例如："
                />
                <code>
                  {env.ORIGIN}/<i id="previewSlug">alice-in-wonderland</i>
                </code>
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
      {addPageScript}
    </>
  )
}

let submitParser = object({
  name: string({ minLength: 3, maxLength: 50 }),
})

function Submit(attrs: {}, context: DynamicContext) {
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
    let input = submitParser.parse(body)
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

function SubmitResult(attrs: {}, context: DynamicContext) {
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

let routes = {
  '/org/:org_slug/team': {
    resolve: resolveTeamListPage,
  },
  '/org/:org_slug/team/add': {
    streaming: false,
    resolve: resolveAddTeamPage,
  },
  '/org/:org_slug/team/add/submit': {
    title: apiEndpointTitle,
    description: 'TODO',
    node: <Submit />,
    streaming: false,
  },
  '/org/:org_slug/team/add/result': {
    title: apiEndpointTitle,
    description: 'TODO',
    node: <SubmitResult />,
    streaming: false,
  },
  '/org/:org_slug/team/:team_slug': {
    resolve: resolveTeamPage,
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

export default { routes }
