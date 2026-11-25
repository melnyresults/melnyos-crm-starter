import {
  type Business,
  type Channel,
  type ReviewState,
  type ScriptPair,
  type Variant,
} from './melnyos-review/model'
export function listPairs(state: ReviewState, channel: Channel) {
  return state.scriptPairs.filter((pair) => pair.channel === channel)
}
export function activePair(state: ReviewState, channel: Channel) {
  const pairs = listPairs(state, channel)
  return pairs.at(-1) ?? null
}
export function assignedRevision(business: Business, channel: Channel) {
  return channel === 'call' ? business.callRevision : business.emailRevision
}
export function renderArm(pair: ScriptPair, variant: Variant, name: string) {
  const arm = pair.arms[variant]
  const render = (s: string) => s.split('{{business}}').join(name)
  return { subject: render(arm.subject), body: render(arm.body) }
}
export function callScript(state: ReviewState, business: Business) {
  const version = assignedRevision(business, 'call')
  const pair = listPairs(state, 'call').find(
    (item) => item.revision === version,
  )
  if (!pair || !business.callVariant) return ''
  return renderArm(pair, business.callVariant, business.name).body
}
