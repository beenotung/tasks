import { proxySchema } from 'better-sqlite3-proxy'
import { db } from './db'

export type Method = {
  id?: null | number
  method: string
}

export type Url = {
  id?: null | number
  url: string
}

export type UaType = {
  id?: null | number
  name: string
  count: number
}

export type RequestSession = {
  id?: null | number
  language: null | string
  timezone: null | string
  timezone_offset: null | number
}

export type UaBot = {
  id?: null | number
  name: string
  count: number
}

export type UserAgent = {
  id?: null | number
  user_agent: string
  count: number
  ua_type_id: null | number
  ua_type?: UaType
  ua_bot_id: null | number
  ua_bot?: UaBot
}

export type UaStat = {
  id?: null | number
  last_request_log_id: number
}

export type User = {
  id?: null | number
  username: null | string
  password_hash: null | string // char(60)
  email: null | string
  tel: null | string
  avatar: null | string
  is_admin: null | boolean
  nickname: null | string
}

export type RequestLog = {
  id?: null | number
  method_id: number
  method?: Method
  url_id: number
  url?: Url
  user_agent_id: null | number
  user_agent?: UserAgent
  request_session_id: null | number
  request_session?: RequestSession
  user_id: null | number
  user?: User
  timestamp: number
}

export type VerificationAttempt = {
  id?: null | number
  passcode: string // char(6)
  email: null | string
  tel: null | string
}

export type VerificationCode = {
  id?: null | number
  uuid: null | string
  passcode: string // char(6)
  email: null | string
  tel: null | string
  request_time: number
  revoke_time: null | number
  match_id: null | number
  match?: VerificationAttempt
  user_id: null | number
  user?: User
}

export type ContentReport = {
  id?: null | number
  reporter_id: null | number
  reporter?: User
  type: string
  remark: null | string
  submit_time: number
  reviewer_id: null | number
  reviewer?: User
  review_time: null | number
  accept_time: null | number
  reject_time: null | number
}

export type Project = {
  id?: null | number
  manager_id: number
  manager?: User
  name: string
}

export type Team = {
  id?: null | number
  manager_id: number
  manager?: User
  name: string
}

export type TeamMember = {
  id?: null | number
  team_id: number
  team?: Team
  user_id: number
  user?: User
  nickname: string
}

export type Task = {
  id?: null | number
  title: string
  project_id: null | number
  project?: Project
  creator_id: number
  creator?: User
  create_time: number
  start_time: null | number
  finish_time: null | number
  cancel_time: null | number
}

export type TaskMember = {
  id?: null | number
  task_id: number
  task?: Task
  user_id: number
  user?: User
}

export type TaskSubmission = {
  id?: null | number
  task_id: number
  task?: Task
  user_id: number
  user?: User
  submit_time: number
  review_time: null | number
}

export type Meetup = {
  id?: null | number
  team_id: number
  team?: Team
  user_id: number
  user?: User
  planned_time: number
}

export type DBProxy = {
  method: Method[]
  url: Url[]
  ua_type: UaType[]
  request_session: RequestSession[]
  ua_bot: UaBot[]
  user_agent: UserAgent[]
  ua_stat: UaStat[]
  user: User[]
  request_log: RequestLog[]
  verification_attempt: VerificationAttempt[]
  verification_code: VerificationCode[]
  content_report: ContentReport[]
  project: Project[]
  team: Team[]
  team_member: TeamMember[]
  task: Task[]
  task_member: TaskMember[]
  task_submission: TaskSubmission[]
  meetup: Meetup[]
}

export let proxy = proxySchema<DBProxy>({
  db,
  tableFields: {
    method: [],
    url: [],
    ua_type: [],
    request_session: [],
    ua_bot: [],
    user_agent: [
      /* foreign references */
      ['ua_type', { field: 'ua_type_id', table: 'ua_type' }],
      ['ua_bot', { field: 'ua_bot_id', table: 'ua_bot' }],
    ],
    ua_stat: [],
    user: [],
    request_log: [
      /* foreign references */
      ['method', { field: 'method_id', table: 'method' }],
      ['url', { field: 'url_id', table: 'url' }],
      ['user_agent', { field: 'user_agent_id', table: 'user_agent' }],
      ['request_session', { field: 'request_session_id', table: 'request_session' }],
      ['user', { field: 'user_id', table: 'user' }],
    ],
    verification_attempt: [],
    verification_code: [
      /* foreign references */
      ['match', { field: 'match_id', table: 'verification_attempt' }],
      ['user', { field: 'user_id', table: 'user' }],
    ],
    content_report: [
      /* foreign references */
      ['reporter', { field: 'reporter_id', table: 'user' }],
      ['reviewer', { field: 'reviewer_id', table: 'user' }],
    ],
    project: [
      /* foreign references */
      ['manager', { field: 'manager_id', table: 'user' }],
    ],
    team: [
      /* foreign references */
      ['manager', { field: 'manager_id', table: 'user' }],
    ],
    team_member: [
      /* foreign references */
      ['team', { field: 'team_id', table: 'team' }],
      ['user', { field: 'user_id', table: 'user' }],
    ],
    task: [
      /* foreign references */
      ['project', { field: 'project_id', table: 'project' }],
      ['creator', { field: 'creator_id', table: 'user' }],
    ],
    task_member: [
      /* foreign references */
      ['task', { field: 'task_id', table: 'task' }],
      ['user', { field: 'user_id', table: 'user' }],
    ],
    task_submission: [
      /* foreign references */
      ['task', { field: 'task_id', table: 'task' }],
      ['user', { field: 'user_id', table: 'user' }],
    ],
    meetup: [
      /* foreign references */
      ['team', { field: 'team_id', table: 'team' }],
      ['user', { field: 'user_id', table: 'user' }],
    ],
  },
})
