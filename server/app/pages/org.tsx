import { o } from '../jsx/jsx.js'
import { Routes } from '../routes.js'
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
import { proxy } from '../../../db/proxy.js'
import { Script } from '../components/script.js'
import { toSlug } from '../format/slug.js'
import { BackToLink } from '../components/back-to-link.js'
import { getAuthUser } from '../auth/user.js'
import { getDisplayName } from './profile.js'
import { select_org_list_by_user } from '../auth/org.js'
import { orgUrl } from './team.js'

let pageTitle = <Locale en="Org List" zh_hk="組織列表" zh_cn="组织列表" />
let addPageTitle = <Locale en="Add Org" zh_hk="添加組織" zh_cn="添加组织" />

let style = Style(/* css */ `
#Org {

}
`)

let page = (
  <>
    {style}
    <div id="Org">
      <h1>{pageTitle}</h1>
      <Main />
    </div>
  </>
)

function Main(attrs: {}, context: Context) {
  let user = getAuthUser(context)
  if (!user)
    return (
      <div>
        <Locale
          en={
            <>
              You can access the org list after <Link href="/login">login</Link>
              .
            </>
          }
          zh_hk={
            <>
              您可以在<Link href="/login">登入</Link>後存取組織列表。
            </>
          }
          zh_cn={
            <>
              您可以在<Link href="/login">登入</Link>后存取组织列表。
            </>
          }
        />
      </div>
    )
  let user_id = user.id!
  let org_id_list = select_org_list_by_user.all({ user_id })
  return (
    <>
      {org_id_list.length === 0 && (
        <p>
          <Locale
            en="You are not a member of any org."
            zh_hk="您不是任何組織的成員。"
            zh_cn="您不是任何组织的成员。"
          />
        </p>
      )}
      <ul>
        {mapArray(org_id_list, org_id => {
          let org = proxy.org[org_id]
          let creator =
            org.creator_id == user_id ? (
              <Locale en="you" zh_hk="你" zh_cn="你" />
            ) : (
              ' ' + getDisplayName(org.creator!) + ' '
            )
          return (
            <li>
              <Link href={orgUrl(org)}>{org.name}</Link> (
              <Locale
                en={<>Created by {creator}</>}
                zh_hk={<>由{creator}創建</>}
                zh_cn={<>由{creator}创建</>}
              />
              )
            </li>
          )
        })}
      </ul>
      <Link href="/org/add">
        <button>{addPageTitle}</button>
      </Link>
    </>
  )
}

let addPageStyle = Style(/* css */ `
#AddOrg .field {
  margin-block-end: 1rem;
}
#AddOrg .field label input {
  display: block;
  margin-block-start: 0.25rem;
}
#AddOrg .field label .hint {
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
let addPage = (
  <>
    {addPageStyle}
    <div id="AddOrg">
      <h1>{addPageTitle}</h1>
      <form
        id="addForm"
        method="POST"
        action="/org/add/submit"
        onsubmit="emitForm(event)"
      >
        <div class="field">
          <label>
            <Locale en="Org Name" zh_hk="組織名稱" zh_cn="组织名称" />
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
        <input type="submit" value="Submit" />
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

function AddPage(attrs: {}, context: DynamicContext) {
  let user = getAuthUser(context)
  if (!user) return <Redirect href="/login" />
  return addPage
}

let submitParser = object({
  name: string({ minLength: 1, maxLength: 50 }),
})

function Submit(attrs: {}, context: DynamicContext) {
  try {
    let throws = makeThrows(context)
    let user = getAuthUser(context)!
    if (!user)
      throws({
        en: 'You must be logged in to submit ' + Locale(pageTitle, context),
        zh_hk: '您必須登入才能提交 ' + Locale(pageTitle, context),
        zh_cn: '您必須登入才能提交 ' + Locale(pageTitle, context),
      })
    let body = getContextFormBody(context)
    let input = submitParser.parse(body)
    let id = proxy.org.push({
      name: input.name,
      creator_id: user.id!,
    })
    return <Redirect href={`/org/result?id=${id}`} />
  } catch (error) {
    throwIfInAPI(error, '#add-message', context)
    return (
      <Redirect
        href={'/org/result?' + new URLSearchParams({ error: String(error) })}
      />
    )
  }
}

function SubmitResult(attrs: {}, context: DynamicContext) {
  let params = new URLSearchParams(context.routerMatch?.search)
  let error = params.get('error')
  let id = params.get('id')
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
          <BackToLink href="/org" title={pageTitle} />
        </>
      )}
    </div>
  )
}

let routes = {
  '/org': {
    menuText: pageTitle,
    title: <Title t={pageTitle} />,
    description: 'TODO',
    node: page,
  },
  '/org/add': {
    title: <Title t={addPageTitle} />,
    description: 'TODO',
    node: <AddPage />,
    streaming: false,
  },
  '/org/add/submit': {
    title: apiEndpointTitle,
    description: 'TODO',
    node: <Submit />,
    streaming: false,
  },
  '/org/result': {
    title: apiEndpointTitle,
    description: 'TODO',
    node: <SubmitResult />,
    streaming: false,
  },
} satisfies Routes

export default { routes }
