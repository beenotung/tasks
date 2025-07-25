import { title } from '../../config.js'
import { Context, getContextLanguage } from '../context.js'
import { Component, Node } from '../jsx/types.js'

export type LocaleVariants<T = Node> = {
  en: T
  zh_hk: T
  zh_cn: T
}

export function isPreferZh(context_or_lang: Context | string | undefined) {
  let lang =
    typeof context_or_lang === 'object'
      ? getContextLanguage(context_or_lang)
      : context_or_lang
  return lang?.match(/zh|HK|CN/i) && !lang?.match(/en/i)
}

export function isPreferZhHK(context_or_lang: Context | string | undefined) {
  let lang =
    typeof context_or_lang === 'object'
      ? getContextLanguage(context_or_lang)
      : context_or_lang
  return lang?.match(/zh|HK/i) && !lang?.match(/en|CN/i)
}

export function isPreferZhCN(context_or_lang: Context | string | undefined) {
  let lang =
    typeof context_or_lang === 'object'
      ? getContextLanguage(context_or_lang)
      : context_or_lang
  return lang?.match(/zh|CN/i) && !lang?.match(/en|HK/i)
}

export function Locale<T>(attrs: LocaleVariants<T>, context: Context): T {
  let lang = getContextLanguage(context)
  if (isPreferZhHK(lang)) return attrs.zh_hk
  if (isPreferZhCN(lang)) return attrs.zh_cn
  // e.g. zh-TW
  if (isPreferZh(lang)) return attrs.zh_hk
  return attrs.en
}

export function makeTranslate<T = string>(context: Context) {
  function translate(words: LocaleVariants<T>): T {
    return Locale(words, context)
  }
  return translate
}

export function Title(
  attrs: {
    t: Component<LocaleVariants<string>>
  },
  context: Context,
) {
  let component = attrs.t
  let variants = component[1] as LocaleVariants<string>
  let t = Locale(variants, context)
  return title(t)
}

export function evalAttrsLocale<T extends object>(
  attrs: T,
  key: keyof T,
  context: Context,
) {
  if (!(key in attrs)) return
  let value = attrs[key]
  if (!Array.isArray(value)) return
  let component = value[0]
  if (component === Locale || component === Title) {
    let variants = value[1] as LocaleVariants<string>
    attrs[key] = component(variants, context) as any
  }
}

export function evalLocale<T>(
  node: [componentFn: Function, attrs: LocaleVariants<T>] | T,
  context: Context,
): T {
  if (!Array.isArray(node)) return node
  let component = node[0]
  let attrs = node[1]
  if (component !== Locale && component !== Title) return node as T
  let variants = attrs
  return component(variants, context)
}

export function makeText(context: Context) {
  function text(message: LocaleVariants<string>) {
    return Locale(message, context)
  }
  return text
}

// helper function for making error response to ajax request
export function makeReject(context: Context) {
  function reject(message: LocaleVariants<string>) {
    return {
      error: Locale(message, context),
    }
  }
  return reject
}

// helper function for throwing error with i18n support
export function makeThrows(context: Context, options?: { asError?: boolean }) {
  function throws(messageLocale: LocaleVariants<string>): never {
    let message = Locale(messageLocale, context)
    if (options?.asError) {
      throw new Error(message)
    } else {
      throw message
    }
  }
  return throws
}
